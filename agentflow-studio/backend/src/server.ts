import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { initializeDatabase } from "./models/database";
import workflowRoutes from "./routes/workflows";
import agentRoutes from "./routes/agents";
import deploymentRoutes from "./routes/deployments";
import monitoringRoutes from "./routes/monitoring";
import gcpRoutes from "./routes/gcp";
import authRoutes from "./routes/auth";
import orchestratorRoutes from "./routes/orchestrator";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// app.use(limiter);
// app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
// app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Public routes (no authentication required)
app.use("/api/auth", authRoutes);

// Protected routes (authentication required)
app.use("/api/workflows", workflowRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/deployments", deploymentRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/gcp", gcpRoutes);
app.use("/api/orchestrator", orchestratorRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

async function startServer() {
  try {
    // await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`AgentFlow Studio Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
