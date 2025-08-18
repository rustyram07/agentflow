"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = require("./models/database");
const workflows_1 = __importDefault(require("./routes/workflows"));
const agents_1 = __importDefault(require("./routes/agents"));
const deployments_1 = __importDefault(require("./routes/deployments"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use(
  (0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api/workflows", workflows_1.default);
app.use("/api/agents", agents_1.default);
app.use("/api/deployments", deployments_1.default);
app.use("/api/monitoring", monitoring_1.default);
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use(errorHandler_1.errorHandler);
async function startServer() {
  try {
    await (0, database_1.initializeDatabase)();
    app.listen(PORT, () => {
      console.log(`AgentFlow Studio Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}
startServer();
