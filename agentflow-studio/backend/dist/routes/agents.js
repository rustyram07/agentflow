"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const frameworkService_1 = require("../services/frameworkService");
const router = express_1.default.Router();
const frameworkService = new frameworkService_1.FrameworkService();
router.get("/", async (req, res) => {
  try {
    const agents = await frameworkService.getAgents();
    res.json(agents);
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});
router.get("/tools", async (req, res) => {
  try {
    const tools = await frameworkService.getTools();
    res.json(tools);
  } catch (error) {
    console.error("Error fetching tools:", error);
    res.status(500).json({ error: "Failed to fetch tools" });
  }
});
router.get("/health", async (req, res) => {
  try {
    const status = await frameworkService.getHealthStatus();
    res.json(status);
  } catch (error) {
    console.error("Error checking framework health:", error);
    res.status(500).json({ error: "Failed to check framework health" });
  }
});
exports.default = router;
