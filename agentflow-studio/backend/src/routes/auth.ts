import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import {
  AuthService,
  refreshTokenMiddleware,
  createRateLimiter,
} from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();

// Rate limiters
const loginRateLimit = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
const registerRateLimit = createRateLimiter(60 * 60 * 1000, 3); // 3 registrations per hour

// Validation rules
const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const registerValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain uppercase, lowercase, number and special character",
    ),
  body("role")
    .isIn(["admin", "developer", "viewer"])
    .withMessage("Invalid role"),
  body("tenantId")
    .optional()
    .isString()
    .withMessage("Tenant ID must be a string"),
];

// Helper function to handle validation errors
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return res.status(400).json({
      error: "Validation failed",
      details: errorMessages,
    });
  }
  next();
};

// POST /api/auth/login
router.post(
  "/login",
  loginRateLimit,
  loginValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await AuthService.findUserByEmail(email);
      if (!user) {
        throw new AppError("Invalid credentials", 401);
      }

      // Verify password
      const isPasswordValid = await AuthService.comparePassword(
        password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new AppError("Invalid credentials", 401);
      }

      // Update last login
      await AuthService.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = AuthService.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });

      const refreshToken = AuthService.generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });

      // Return success response
      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            lastLogin: user.lastLogin,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/auth/register
router.post(
  "/register",
  registerRateLimit,
  registerValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, role, tenantId } = req.body;

      // Check if user already exists
      const existingUser = await AuthService.findUserByEmail(email);
      if (existingUser) {
        throw new AppError("User already exists with this email", 409);
      }

      // Create new user
      const newUser = await AuthService.createUser({
        email,
        password,
        role: role || "developer",
        tenantId,
      });

      // Generate tokens
      const accessToken = AuthService.generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
      });

      const refreshToken = AuthService.generateRefreshToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
      });

      // Return success response
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            tenantId: newUser.tenantId,
            createdAt: newUser.createdAt,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/auth/refresh
router.post("/refresh", refreshTokenMiddleware);

// POST /api/auth/logout
router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.body;

      if (userId) {
        // In production, add token to blacklist
        console.log(`Logging out user ${userId}`);
      }

      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/auth/me - Get current user profile
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Access token required", 401);
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);

    const user = await AuthService.findUserById(decoded.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/change-password
router.post(
  "/change-password",
  loginValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, currentPassword, newPassword } = req.body;

      const user = await AuthService.findUserByEmail(email);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      const isCurrentPasswordValid = await AuthService.comparePassword(
        currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        throw new AppError("Current password is incorrect", 401);
      }

      // Hash new password
      const hashedNewPassword = await AuthService.hashPassword(newPassword);

      // Update password (in production, update in database)
      user.password = hashedNewPassword;

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/auth/validate-token
router.get(
  "/validate-token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("Access token required", 401);
      }

      const token = authHeader.substring(7);
      const decoded = AuthService.verifyToken(token);

      const user = await AuthService.findUserById(decoded.id);
      if (!user) {
        throw new AppError("Invalid token", 401);
      }

      res.json({
        success: true,
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        valid: false,
        error: "Invalid or expired token",
      });
    }
  },
);

export default router;
