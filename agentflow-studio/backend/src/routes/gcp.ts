import express, { Request, Response } from "express";
import { GCPService } from "../services/gcpService";
import { getDatabase } from "../models/database";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Validate GCP credentials
router.post("/validate-credentials", async (req: Request, res: Response) => {
  try {
    const { projectId, region, serviceAccountKey } = req.body;

    const gcpService = new GCPService({
      projectId,
      region,
      keyFileContent: serviceAccountKey,
    });

    const isValid = await gcpService.validateCredentials();

    if (isValid) {
      const project = await gcpService.getProject(projectId);
      res.json({
        success: true,
        data: {
          valid: true,
          project,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          message: "Invalid GCP credentials",
          code: "INVALID_CREDENTIALS",
        },
      });
    }
  } catch (error) {
    console.error("GCP credentials validation error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to validate credentials",
        code: "VALIDATION_ERROR",
      },
    });
  }
});

// List GCP projects
router.get("/projects", async (req: Request, res: Response) => {
  try {
    // For now, return mock data. In real implementation, use credentials from request
    const gcpService = new GCPService({
      projectId: "default",
      region: "us-central1",
    });

    const projects = await gcpService.listProjects();

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("Failed to list projects:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to list projects",
        code: "LIST_PROJECTS_ERROR",
      },
    });
  }
});

// Check GCP services status
router.post("/check-services", async (req: Request, res: Response) => {
  try {
    const { projectId, region, serviceAccountKey } = req.body;

    const gcpService = new GCPService({
      projectId,
      region,
      keyFileContent: serviceAccountKey,
    });

    const services = await gcpService.listEnabledServices();
    const billingEnabled = await gcpService.checkBillingEnabled();

    res.json({
      success: true,
      data: {
        services,
        billingEnabled,
      },
    });
  } catch (error) {
    console.error("Failed to check services:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to check services",
        code: "CHECK_SERVICES_ERROR",
      },
    });
  }
});

// Enable GCP service
router.post("/enable-service", async (req: Request, res: Response) => {
  try {
    const { projectId, region, serviceAccountKey, serviceName } = req.body;

    const gcpService = new GCPService({
      projectId,
      region,
      keyFileContent: serviceAccountKey,
    });

    const enabled = await gcpService.enableService(serviceName);

    if (enabled) {
      res.json({
        success: true,
        data: {
          serviceName,
          enabled: true,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          message: `Failed to enable service: ${serviceName}`,
          code: "ENABLE_SERVICE_ERROR",
        },
      });
    }
  } catch (error) {
    console.error("Failed to enable service:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to enable service",
        code: "ENABLE_SERVICE_ERROR",
      },
    });
  }
});

// Deploy workflow to GCP
router.post("/deploy", async (req: Request, res: Response) => {
  try {
    const {
      workflowId,
      projectId,
      region,
      serviceAccountKey,
      deploymentType = "cloud-run",
      resources,
      environment,
      networking,
    } = req.body;

    // Get workflow from database
    const db = getDatabase();
    const workflow = await db.get(
      "SELECT * FROM workflows WHERE id = ?",
      workflowId,
    );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Workflow not found",
          code: "WORKFLOW_NOT_FOUND",
        },
      });
    }

    const gcpService = new GCPService({
      projectId,
      region,
      keyFileContent: serviceAccountKey,
    });

    // Create deployment record
    const deploymentId = uuidv4();
    const serviceName = `agentflow-${workflowId.replace(/-/g, "").substring(0, 8)}`;

    await db.run(
      `
      INSERT INTO deployments (id, workflow_id, status, created_at, logs)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        deploymentId,
        workflowId,
        "preparing",
        new Date().toISOString(),
        JSON.stringify([]),
      ],
    );

    // Start deployment process (in background)
    deployWorkflowToGCP(deploymentId, workflow, gcpService, {
      serviceName,
      workflowId,
      cpu: resources.cpu,
      memory: resources.memory,
      minInstances: resources.minInstances,
      maxInstances: resources.maxInstances,
      timeout: resources.timeout,
      environmentVariables: environment.variables || {},
      allowUnauthenticated: networking.allowUnauthenticated,
    });

    res.json({
      success: true,
      data: {
        deploymentId,
        status: "preparing",
        serviceName,
      },
    });
  } catch (error) {
    console.error("Failed to start deployment:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to start deployment",
        code: "DEPLOYMENT_ERROR",
      },
    });
  }
});

// Get deployment status
router.get("/deployment/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const db = getDatabase();
    const deployment = await db.get(
      "SELECT * FROM deployments WHERE id = ?",
      id,
    );

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Deployment not found",
          code: "DEPLOYMENT_NOT_FOUND",
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: deployment.id,
        status: deployment.status,
        url: deployment.url,
        logs: JSON.parse(deployment.logs || "[]"),
        createdAt: deployment.created_at,
      },
    });
  } catch (error) {
    console.error("Failed to get deployment status:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to get deployment status",
        code: "STATUS_ERROR",
      },
    });
  }
});

// Get cost estimation
router.post("/estimate-costs", async (req: Request, res: Response) => {
  try {
    const { projectId, region, resources } = req.body;

    const gcpService = new GCPService({
      projectId,
      region,
    });

    const costs = await gcpService.estimateCosts({
      workflowId: "temp",
      serviceName: "temp",
      image: "temp",
      port: 8080,
      cpu: resources.cpu,
      memory: resources.memory,
      minInstances: resources.minInstances,
      maxInstances: resources.maxInstances,
      timeout: resources.timeout,
      environmentVariables: {},
      allowUnauthenticated: true,
    });

    res.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    console.error("Failed to estimate costs:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to estimate costs",
        code: "COST_ESTIMATION_ERROR",
      },
    });
  }
});

// Background deployment function
async function deployWorkflowToGCP(
  deploymentId: string,
  workflow: any,
  gcpService: GCPService,
  options: any,
) {
  const db = getDatabase();
  const logs: any[] = [];

  try {
    // Update status to building
    await updateDeploymentStatus(deploymentId, "building", logs);

    logs.push({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Starting container image build...",
    });

    // Build and push container image
    const image = await gcpService.buildAndPushImage(workflow.id, workflow);

    logs.push({
      timestamp: new Date().toISOString(),
      level: "success",
      message: `Container image built: ${image}`,
    });

    // Update status to deploying
    await updateDeploymentStatus(deploymentId, "deploying", logs);

    logs.push({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Deploying to Cloud Run...",
    });

    // Deploy to Cloud Run
    const deployment = await gcpService.deployToCloudRun({
      ...options,
      image,
      port: 8080,
    });

    logs.push({
      timestamp: new Date().toISOString(),
      level: "success",
      message: `Service deployed successfully: ${deployment.url}`,
    });

    // Validate deployment
    const validation = await gcpService.validateDeployment(deployment.url);

    if (validation.healthy) {
      logs.push({
        timestamp: new Date().toISOString(),
        level: "success",
        message: `Health check passed (${validation.responseTime}ms)`,
      });

      // Update final status
      await db.run(
        `
        UPDATE deployments 
        SET status = ?, url = ?, logs = ?
        WHERE id = ?
      `,
        ["completed", deployment.url, JSON.stringify(logs), deploymentId],
      );
    } else {
      throw new Error("Health check failed");
    }
  } catch (error) {
    logs.push({
      timestamp: new Date().toISOString(),
      level: "error",
      message: `Deployment failed: ${error}`,
    });

    await updateDeploymentStatus(deploymentId, "failed", logs);
  }
}

async function updateDeploymentStatus(
  deploymentId: string,
  status: string,
  logs: any[],
) {
  const db = getDatabase();
  await db.run(
    `
    UPDATE deployments 
    SET status = ?, logs = ?
    WHERE id = ?
  `,
    [status, JSON.stringify(logs), deploymentId],
  );
}

export default router;
