"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const database_1 = require("../models/database");
const frameworkService_1 = require("../services/frameworkService");
const router = express_1.default.Router();
const frameworkService = new frameworkService_1.FrameworkService();
router.get("/", async (req, res) => {
  try {
    const db = (0, database_1.getDatabase)();
    const workflows = await db.all(`
      SELECT * FROM workflows 
      ORDER BY updated_at DESC
    `);
    const parsedWorkflows = workflows.map((workflow) => ({
      ...workflow,
      nodes: JSON.parse(workflow.nodes),
      edges: JSON.parse(workflow.edges),
      deployed: Boolean(workflow.deployed),
    }));
    res.json(parsedWorkflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const db = (0, database_1.getDatabase)();
    const workflow = await db.get(
      "SELECT * FROM workflows WHERE id = ?",
      req.params.id,
    );
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    const parsedWorkflow = {
      ...workflow,
      nodes: JSON.parse(workflow.nodes),
      edges: JSON.parse(workflow.edges),
      deployed: Boolean(workflow.deployed),
    };
    res.json(parsedWorkflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});
router.post("/", async (req, res) => {
  try {
    const { name, description, nodes = [], edges = [] } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Workflow name is required" });
    }
    const id = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const db = (0, database_1.getDatabase)();
    await db.run(
      `
      INSERT INTO workflows (id, name, description, nodes, edges, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        name,
        description,
        JSON.stringify(nodes),
        JSON.stringify(edges),
        now,
        now,
      ],
    );
    const workflow = {
      id,
      name,
      description: description || "",
      nodes,
      edges,
      created_at: now,
      updated_at: now,
      deployed: false,
    };
    res.status(201).json(workflow);
  } catch (error) {
    console.error("Error creating workflow:", error);
    res.status(500).json({ error: "Failed to create workflow" });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const { name, description, nodes, edges } = req.body;
    const now = new Date().toISOString();
    const db = (0, database_1.getDatabase)();
    const existingWorkflow = await db.get(
      "SELECT * FROM workflows WHERE id = ?",
      req.params.id,
    );
    if (!existingWorkflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    await db.run(
      `
      UPDATE workflows 
      SET name = ?, description = ?, nodes = ?, edges = ?, updated_at = ?
      WHERE id = ?
    `,
      [
        name || existingWorkflow.name,
        description !== undefined ? description : existingWorkflow.description,
        nodes ? JSON.stringify(nodes) : existingWorkflow.nodes,
        edges ? JSON.stringify(edges) : existingWorkflow.edges,
        now,
        req.params.id,
      ],
    );
    const updatedWorkflow = await db.get(
      "SELECT * FROM workflows WHERE id = ?",
      req.params.id,
    );
    const parsedWorkflow = {
      ...updatedWorkflow,
      nodes: JSON.parse(updatedWorkflow.nodes),
      edges: JSON.parse(updatedWorkflow.edges),
      deployed: Boolean(updatedWorkflow.deployed),
    };
    res.json(parsedWorkflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    res.status(500).json({ error: "Failed to update workflow" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const db = (0, database_1.getDatabase)();
    const result = await db.run(
      "DELETE FROM workflows WHERE id = ?",
      req.params.id,
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    await db.run(
      "DELETE FROM execution_logs WHERE workflow_id = ?",
      req.params.id,
    );
    await db.run(
      "DELETE FROM deployments WHERE workflow_id = ?",
      req.params.id,
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting workflow:", error);
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});
router.post("/:id/execute", async (req, res) => {
  try {
    const { input } = req.body;
    const workflowId = req.params.id;
    const db = (0, database_1.getDatabase)();
    const workflow = await db.get(
      "SELECT * FROM workflows WHERE id = ?",
      workflowId,
    );
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    const parsedWorkflow = {
      ...workflow,
      nodes: JSON.parse(workflow.nodes),
      edges: JSON.parse(workflow.edges),
    };
    const prompt = input || `Execute workflow: ${parsedWorkflow.name}`;
    try {
      const result = await frameworkService.executeWorkflow(prompt, workflowId);
      await db.run(
        `
        INSERT INTO execution_logs (id, workflow_id, node_id, level, message, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          (0, uuid_1.v4)(),
          workflowId,
          "execution",
          "info",
          "Workflow executed successfully",
          JSON.stringify(result),
        ],
      );
      res.json({
        success: true,
        result,
        workflow: parsedWorkflow,
      });
    } catch (frameworkError) {
      await db.run(
        `
        INSERT INTO execution_logs (id, workflow_id, node_id, level, message, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          (0, uuid_1.v4)(),
          workflowId,
          "execution",
          "error",
          "Workflow execution failed",
          JSON.stringify({ error: frameworkError?.message || "Unknown error" }),
        ],
      );
      res.status(500).json({
        success: false,
        error: "Framework execution failed",
        details: frameworkError?.message || "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error executing workflow:", error);
    res.status(500).json({ error: "Failed to execute workflow" });
  }
});
exports.default = router;
