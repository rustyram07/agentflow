import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AppError } from "./errorHandler";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        tenantId?: string;
      };
    }
  }
}

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

interface User {
  id: string;
  email: string;
  password: string;
  role: "admin" | "developer" | "viewer";
  tenantId?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

// Mock user database - replace with actual database
const users: User[] = [
  {
    id: "1",
    email: "admin@agentflow.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfBXhdsUBo9K1vO", // password123
    role: "admin",
    createdAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: "2",
    email: "developer@agentflow.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfBXhdsUBo9K1vO", // password123
    role: "developer",
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

export class AuthService {
  static generateToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(
    payload: Omit<TokenPayload, "iat" | "exp">,
  ): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  }

  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new AppError("Invalid or expired token", 401);
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    // In production, this would query the database
    return users.find((user) => user.email === email && user.isActive) || null;
  }

  static async findUserById(id: string): Promise<User | null> {
    // In production, this would query the database
    return users.find((user) => user.id === id && user.isActive) || null;
  }

  static async createUser(userData: {
    email: string;
    password: string;
    role: "admin" | "developer" | "viewer";
    tenantId?: string;
  }): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);

    const newUser: User = {
      id: Date.now().toString(),
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      tenantId: userData.tenantId,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    users.push(newUser);
    return newUser;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
    }
  }
}

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Access token required", 401);
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);

    // Verify user still exists and is active
    const user = await AuthService.findUserById(decoded.id);
    if (!user) {
      throw new AppError("User no longer exists", 401);
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Authorization middleware factory
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Insufficient permissions", 403));
    }

    next();
  };
};

// Tenant isolation middleware
export const tenantIsolation = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  // Admin users can access all tenants
  if (req.user.role === "admin") {
    return next();
  }

  // For non-admin users, ensure they can only access their tenant data
  if (req.user.tenantId) {
    req.query.tenantId = req.user.tenantId;
    req.body.tenantId = req.user.tenantId;
  }

  next();
};

// Rate limiting helper
export const createRateLimiter = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip + (req.user?.id || "");
    const now = Date.now();
    const userRequests = requests.get(key);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userRequests.count >= max) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
      });
    }

    userRequests.count++;
    next();
  };
};

// Session management helpers
export const invalidateTokens = (userId: string) => {
  // In production, maintain a blacklist of invalidated tokens in Redis
  console.log(`Invalidating tokens for user ${userId}`);
};

export const refreshTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError("Refresh token required", 400);
    }

    const decoded = AuthService.verifyToken(refreshToken);
    const user = await AuthService.findUserById(decoded.id);

    if (!user) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Generate new tokens
    const newAccessToken = AuthService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    const newRefreshToken = AuthService.generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
};
