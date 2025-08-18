import express from "express";
import { getDatabase } from "../models/database";

const router = express.Router();

router.get("/logs/:workflowId", async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { limit = 100, level } = req.query;

    const db = getDatabase();

    let query = `
      SELECT * FROM execution_logs 
      WHERE workflow_id = ?
    `;
    const params = [workflowId];

    if (level && typeof level === "string") {
      query += " AND level = ?";
      params.push(level);
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(Number(limit).toString());

    const logs = await db.all(query, params);

    const parsedLogs = logs.map((log) => ({
      ...log,
      data: log.data ? JSON.parse(log.data) : null,
    }));

    res.json(parsedLogs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const db = getDatabase();

    const [totalWorkflows, activeDeployments, recentExecutions, errorCount] =
      await Promise.all([
        db.get("SELECT COUNT(*) as count FROM workflows"),
        db.get(
          'SELECT COUNT(*) as count FROM deployments WHERE status = "running"',
        ),
        db.get(
          'SELECT COUNT(*) as count FROM execution_logs WHERE timestamp > datetime("now", "-24 hours")',
        ),
        db.get(
          'SELECT COUNT(*) as count FROM execution_logs WHERE level = "error" AND timestamp > datetime("now", "-24 hours")',
        ),
      ]);

    res.json({
      total_workflows: totalWorkflows.count,
      active_deployments: activeDeployments.count,
      recent_executions: recentExecutions.count,
      errors_24h: errorCount.count,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/health", async (req, res) => {
  try {
    const db = getDatabase();

    const recentErrors = await db.all(`
      SELECT * FROM execution_logs 
      WHERE level = 'error' AND timestamp > datetime('now', '-1 hour')
      ORDER BY timestamp DESC 
      LIMIT 10
    `);

    const systemHealth = {
      status: recentErrors.length > 5 ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      recent_errors: recentErrors.length,
      database_status: "connected",
    };

    res.json(systemHealth);
  } catch (error) {
    console.error("Error checking system health:", error);
    res.status(500).json({
      status: "unhealthy",
      error: "Failed to check system health",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
