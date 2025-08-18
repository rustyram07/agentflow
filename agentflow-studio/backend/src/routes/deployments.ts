import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../models/database";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = getDatabase();
    const deployments = await db.all(`
      SELECT d.*, w.name as workflow_name 
      FROM deployments d 
      LEFT JOIN workflows w ON d.workflow_id = w.id 
      ORDER BY d.created_at DESC
    `);

    const parsedDeployments = deployments.map((deployment) => ({
      ...deployment,
      logs: deployment.logs ? JSON.parse(deployment.logs) : [],
    }));

    res.json(parsedDeployments);
  } catch (error) {
    console.error("Error fetching deployments:", error);
    res.status(500).json({ error: "Failed to fetch deployments" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { workflow_id } = req.body;

    if (!workflow_id) {
      return res.status(400).json({ error: "Workflow ID is required" });
    }

    const db = getDatabase();

    const workflow = await db.get(
      "SELECT * FROM workflows WHERE id = ?",
      workflow_id,
    );
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const deploymentId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `
      INSERT INTO deployments (id, workflow_id, status, created_at, logs)
      VALUES (?, ?, ?, ?, ?)
    `,
      [deploymentId, workflow_id, "pending", now, JSON.stringify([])],
    );

    setTimeout(async () => {
      try {
        const mockUrl = `https://agentflow-${deploymentId.substring(0, 8)}.run.app`;
        const logs = [
          "Starting deployment...",
          "Building container image...",
          "Pushing to registry...",
          "Deploying to Cloud Run...",
          "Service is live!",
        ];

        await db.run(
          `
          UPDATE deployments 
          SET status = ?, url = ?, logs = ?
          WHERE id = ?
        `,
          ["completed", mockUrl, JSON.stringify(logs), deploymentId],
        );

        await db.run(
          `
          UPDATE workflows 
          SET deployed = 1, deployment_url = ?
          WHERE id = ?
        `,
          [mockUrl, workflow_id],
        );
      } catch (error) {
        console.error("Mock deployment error:", error);
        await db.run(
          `
          UPDATE deployments 
          SET status = ?, logs = ?
          WHERE id = ?
        `,
          ["failed", JSON.stringify(["Deployment failed"]), deploymentId],
        );
      }
    }, 5000);

    res.status(201).json({
      id: deploymentId,
      workflow_id,
      status: "pending",
      created_at: now,
      logs: [],
    });
  } catch (error) {
    console.error("Error creating deployment:", error);
    res.status(500).json({ error: "Failed to create deployment" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = getDatabase();
    const deployment = await db.get(
      `
      SELECT d.*, w.name as workflow_name 
      FROM deployments d 
      LEFT JOIN workflows w ON d.workflow_id = w.id 
      WHERE d.id = ?
    `,
      req.params.id,
    );

    if (!deployment) {
      return res.status(404).json({ error: "Deployment not found" });
    }

    const parsedDeployment = {
      ...deployment,
      logs: deployment.logs ? JSON.parse(deployment.logs) : [],
    };

    res.json(parsedDeployment);
  } catch (error) {
    console.error("Error fetching deployment:", error);
    res.status(500).json({ error: "Failed to fetch deployment" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db.run(
      "DELETE FROM deployments WHERE id = ?",
      req.params.id,
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Deployment not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting deployment:", error);
    res.status(500).json({ error: "Failed to delete deployment" });
  }
});

export default router;
