import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult, query } from "express-validator";
import { OrchestratorAgent, ExecutionPlan } from "../agents/orchestrator";
import { LLMService } from "../agents/llm";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";

const router = Router();

// Initialize the orchestrator
const orchestrator = new OrchestratorAgent();

// Initialize orchestrator on startup
(async () => {
  try {
    await orchestrator.initialize();
    console.log("Orchestrator Agent initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Orchestrator Agent:", error);
  }
})();

// Validation rules
const executeValidation = [
  body("prompt")
    .isString()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Prompt must be between 1 and 2000 characters"),
  body("conversationId")
    .optional()
    .isString()
    .withMessage("Conversation ID must be a string"),
  body("options")
    .optional()
    .isObject()
    .withMessage("Options must be an object"),
  body("options.requireHumanApproval")
    .optional()
    .isBoolean()
    .withMessage("requireHumanApproval must be a boolean"),
  body("options.timeoutMs")
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage("timeoutMs must be between 1000 and 300000"),
];

// Helper function to handle validation errors
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errorMessages,
    });
  }
  next();
};

/**
 * POST /api/orchestrator/execute
 * Execute a task using the orchestrator agent
 */
router.post(
  "/execute",
  authenticate,
  executeValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prompt, conversationId, options = {} } = req.body;
      const userId = req.user?.id;

      // Add user context to options
      const executionOptions = {
        ...options,
        userId,
      };

      const result = await orchestrator.execute(
        prompt,
        conversationId,
        executionOptions
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/plans
 * Get active execution plans
 */
router.get(
  "/plans",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = orchestrator.getActivePlans();

      res.json({
        success: true,
        data: {
          plans,
          count: plans.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/plans/:planId
 * Get a specific execution plan
 */
router.get(
  "/plans/:planId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planId } = req.params;
      const plan = orchestrator.getPlan(planId);

      if (!plan) {
        throw new AppError("Plan not found", 404);
      }

      res.json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/orchestrator/plans/:planId/cancel
 * Cancel an execution plan
 */
router.post(
  "/plans/:planId/cancel",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planId } = req.params;
      const cancelled = await orchestrator.cancelPlan(planId);

      if (!cancelled) {
        throw new AppError(
          "Plan not found or cannot be cancelled",
          400
        );
      }

      res.json({
        success: true,
        message: "Plan cancelled successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/agents
 * Get agent activities and status
 */
router.get(
  "/agents",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activities = orchestrator.getAgentActivities();

      res.json({
        success: true,
        data: {
          agents: activities,
          summary: {
            total: activities.length,
            active: activities.filter(a => a.status === 'active').length,
            idle: activities.filter(a => a.status === 'idle').length,
            busy: activities.filter(a => a.status === 'busy').length,
            error: activities.filter(a => a.status === 'error').length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/tools
 * Get available tools catalog
 */
router.get(
  "/tools",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Access the tool registry through the orchestrator
      const toolRegistry = (orchestrator as any).toolRegistry;
      const catalog = toolRegistry.getToolCatalog();
      const categories = toolRegistry.getCategories();

      res.json({
        success: true,
        data: {
          tools: catalog,
          categories,
          count: catalog.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/tools/:toolName
 * Get documentation for a specific tool
 */
router.get(
  "/tools/:toolName",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { toolName } = req.params;
      const toolRegistry = (orchestrator as any).toolRegistry;
      
      if (!toolRegistry.hasTool(toolName)) {
        throw new AppError("Tool not found", 404);
      }

      const documentation = toolRegistry.getToolDocumentation(toolName);

      res.json({
        success: true,
        data: {
          toolName,
          documentation,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/conversations
 * Get conversation history
 */
router.get(
  "/conversations",
  authenticate,
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("offset").optional().isInt({ min: 0 }),
  query("search").optional().isString(),
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;

      const conversationState = (orchestrator as any).conversationState;
      
      let conversations;
      if (search) {
        conversations = await conversationState.searchConversations(search, {
          userId,
          limit,
        });
      } else {
        conversations = await conversationState.listConversations({
          userId,
          limit,
          offset,
        });
      }

      res.json({
        success: true,
        data: {
          conversations,
          count: conversations.length,
          hasMore: conversations.length === limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/conversations/:conversationId
 * Get a specific conversation
 */
router.get(
  "/conversations/:conversationId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.id;

      const conversationState = (orchestrator as any).conversationState;
      const conversation = await conversationState.getOrCreateConversation(
        conversationId,
        { userId }
      );

      res.json({
        success: true,
        data: {
          id: conversation.id,
          messages: conversation.getHistory(),
          context: conversation.getContext(),
          summary: conversation.getSummary(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/orchestrator/conversations/:conversationId
 * Delete a conversation
 */
router.delete(
  "/conversations/:conversationId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const conversationState = (orchestrator as any).conversationState;
      
      const deleted = await conversationState.deleteConversation(conversationId);

      if (!deleted) {
        throw new AppError("Conversation not found", 404);
      }

      res.json({
        success: true,
        message: "Conversation deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/llm/providers
 * Get available LLM providers
 */
router.get(
  "/llm/providers",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const llmService = (orchestrator as any).llmService as LLMService;
      const providers = llmService.getAvailableProviders();
      const defaultProvider = llmService.getDefaultProvider();
      const providerStatuses = await llmService.testAllProviders();

      res.json({
        success: true,
        data: {
          providers,
          defaultProvider,
          statuses: providerStatuses,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/orchestrator/llm/providers/:providerName/set-default
 * Set the default LLM provider
 */
router.post(
  "/llm/providers/:providerName/set-default",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { providerName } = req.params;
      const llmService = (orchestrator as any).llmService as LLMService;
      
      llmService.setDefaultProvider(providerName);

      res.json({
        success: true,
        message: `Default LLM provider set to ${providerName}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/statistics
 * Get orchestrator statistics
 */
router.get(
  "/statistics",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const plans = orchestrator.getActivePlans();
      const agents = orchestrator.getAgentActivities();
      
      const conversationState = (orchestrator as any).conversationState;
      const conversationStats = await conversationState.getStatistics(userId);

      const agentRegistry = (orchestrator as any).agentRegistry;
      const agentStats = agentRegistry.getAgentStatistics();

      const stats = {
        plans: {
          total: plans.length,
          executing: plans.filter(p => p.status === 'executing').length,
          completed: plans.filter(p => p.status === 'completed').length,
          failed: plans.filter(p => p.status === 'failed').length,
        },
        agents: {
          total: agents.length,
          active: agents.filter(a => a.status === 'active').length,
          busy: agents.filter(a => a.status === 'busy').length,
          idle: agents.filter(a => a.status === 'idle').length,
          error: agents.filter(a => a.status === 'error').length,
        },
        conversations: conversationStats,
        agentSystem: agentStats,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orchestrator/health
 * Health check endpoint
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const llmService = (orchestrator as any).llmService as LLMService;
    const defaultProvider = llmService.getDefaultProvider();
    const isLLMAvailable = await llmService.isProviderAvailable(defaultProvider);

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      orchestrator: "active",
      llm: isLLMAvailable ? "available" : "unavailable",
      defaultLLMProvider: defaultProvider,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;