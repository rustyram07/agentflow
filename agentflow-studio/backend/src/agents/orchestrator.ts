import { v4 as uuidv4 } from 'uuid';
import { LLMService } from './llm';
import { ToolRegistry } from './toolRegistry';
import { AgentRegistry } from './agentRegistry';
import { ConversationState } from './conversationState';
import { Planner } from './planner';

export interface ExecutionStep {
  id: string;
  name: string;
  task: string;
  toolName: string;
  toolArgs: Record<string, any>;
  contextSpec?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface ExecutionPlan {
  id: string;
  conversationId: string;
  goal: string;
  complexity: 'simple' | 'medium' | 'complex';
  steps: ExecutionStep[];
  status: 'created' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface AgentActivity {
  agentId: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  lastActivity: Date;
  currentTask?: string;
}

export class OrchestratorAgent {
  private llmService: LLMService;
  private toolRegistry: ToolRegistry;
  private agentRegistry: AgentRegistry;
  private conversationState: ConversationState;
  private planner: Planner;
  private activePlans = new Map<string, ExecutionPlan>();
  private agentActivities = new Map<string, AgentActivity>();

  constructor() {
    this.llmService = new LLMService();
    this.toolRegistry = new ToolRegistry();
    this.agentRegistry = new AgentRegistry();
    this.conversationState = new ConversationState();
    this.planner = new Planner(this.llmService);
  }

  /**
   * Main execution method - the "brain" of the system
   */
  async execute(
    goal: string, 
    conversationId?: string,
    options?: {
      requireHumanApproval?: boolean;
      timeoutMs?: number;
    }
  ): Promise<{
    response: string;
    conversationId: string;
    plan: ExecutionPlan;
    agents: AgentActivity[];
    thought: string;
  }> {
    const startTime = Date.now();
    
    // Initialize or get conversation
    if (!conversationId) {
      conversationId = uuidv4();
    }
    
    const conversation = await this.conversationState.getOrCreateConversation(conversationId);
    
    // Add user message to conversation history
    conversation.addMessage({
      role: 'user',
      content: goal,
      timestamp: new Date()
    });

    // Generate execution plan using the planner
    const plan = await this.planner.generatePlan(goal, conversationId, conversation.getHistory());
    this.activePlans.set(plan.id, plan);

    let thought = `Generated ${plan.complexity} complexity plan with ${plan.steps.length} steps`;
    
    try {
      // Execute the plan
      const executionResults = await this.executePlan(plan, options);
      
      // Combine results into response
      const response = this.formatExecutionResults(executionResults);
      
      // Add assistant response to conversation
      conversation.addMessage({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        metadata: {
          planId: plan.id,
          executionTime: Date.now() - startTime
        }
      });

      // Save conversation state
      await this.conversationState.saveConversation(conversationId, conversation);
      
      // Update plan status
      plan.status = 'completed';
      plan.completedAt = new Date();
      
      thought += `\nExecution completed in ${Date.now() - startTime}ms`;

      return {
        response,
        conversationId,
        plan,
        agents: Array.from(this.agentActivities.values()),
        thought
      };

    } catch (error) {
      plan.status = 'failed';
      const errorMessage = `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      conversation.addMessage({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        metadata: { error: error instanceof Error ? error.stack : String(error) }
      });

      await this.conversationState.saveConversation(conversationId, conversation);
      thought += `\nExecution failed: ${errorMessage}`;

      return {
        response: errorMessage,
        conversationId,
        plan,
        agents: Array.from(this.agentActivities.values()),
        thought
      };
    }
  }

  /**
   * Execute a generated plan step by step
   */
  private async executePlan(
    plan: ExecutionPlan, 
    options?: { requireHumanApproval?: boolean; timeoutMs?: number }
  ): Promise<string[]> {
    plan.status = 'executing';
    const results: string[] = [];
    
    for (const step of plan.steps) {
      try {
        step.status = 'running';
        
        // Check if human approval is required
        if (options?.requireHumanApproval && this.requiresHumanApproval(step)) {
          const approved = await this.requestHumanApproval(step, plan);
          if (!approved) {
            step.status = 'failed';
            step.error = 'Human approval denied';
            results.push(`Step '${step.name}' was denied by human reviewer`);
            continue;
          }
        }

        // Execute the step
        const result = await this.executeStep(step);
        step.result = result;
        step.status = 'completed';
        results.push(result);

        // Update agent activity
        this.updateAgentActivity(step.toolName, 'active', step.name);

      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : String(error);
        results.push(`Step '${step.name}' failed: ${step.error}`);
        
        // Update agent activity
        this.updateAgentActivity(step.toolName, 'error', step.name);
      }
    }
    
    return results;
  }

  /**
   * Execute a single step using tools or agents
   */
  private async executeStep(step: ExecutionStep): Promise<string> {
    // Try to execute with registered tools first
    if (this.toolRegistry.hasTool(step.toolName)) {
      const tool = this.toolRegistry.getTool(step.toolName);
      return await tool.run(step.toolArgs);
    }

    // Try to delegate to registered agents
    if (this.agentRegistry.hasAgent(step.toolName)) {
      const agent = this.agentRegistry.getAgent(step.toolName);
      return await agent.execute({
        task: step.task,
        args: step.toolArgs,
        context: step.contextSpec
      });
    }

    // If neither tool nor agent found, try to handle with LLM
    return await this.handleWithLLM(step);
  }

  /**
   * Handle step execution using LLM when no specific tool/agent is available
   */
  private async handleWithLLM(step: ExecutionStep): Promise<string> {
    const prompt = `
      Execute the following task: ${step.task}
      Tool requested: ${step.toolName}
      Arguments: ${JSON.stringify(step.toolArgs)}
      Context: ${JSON.stringify(step.contextSpec)}
      
      Provide a helpful response or explain what would be needed to complete this task.
    `;
    
    return await this.llmService.generate(prompt);
  }

  /**
   * Format execution results into a coherent response
   */
  private formatExecutionResults(results: string[]): string {
    if (results.length === 0) {
      return "No results generated.";
    }
    
    if (results.length === 1) {
      return results[0];
    }
    
    return results
      .map((result, index) => `${index + 1}. ${result}`)
      .join('\n\n');
  }

  /**
   * Check if a step requires human approval
   */
  private requiresHumanApproval(step: ExecutionStep): boolean {
    const sensitiveOperations = [
      'delete', 'remove', 'deploy', 'publish', 
      'financial', 'payment', 'transaction',
      'user_data', 'personal_info'
    ];
    
    const stepText = `${step.name} ${step.task} ${step.toolName}`.toLowerCase();
    return sensitiveOperations.some(op => stepText.includes(op));
  }

  /**
   * Request human approval for a step
   */
  private async requestHumanApproval(step: ExecutionStep, plan: ExecutionPlan): Promise<boolean> {
    // This would integrate with a human-in-the-loop interface
    // For now, we'll simulate approval
    console.log(`Human approval requested for step: ${step.name}`);
    
    // In a real implementation, this would:
    // 1. Send notification to human reviewers
    // 2. Wait for approval/rejection
    // 3. Log the decision
    
    return true; // Simulate approval for now
  }

  /**
   * Update agent activity tracking
   */
  private updateAgentActivity(agentId: string, status: AgentActivity['status'], currentTask?: string): void {
    this.agentActivities.set(agentId, {
      agentId,
      status,
      lastActivity: new Date(),
      currentTask
    });
  }

  /**
   * Get current agent activities
   */
  getAgentActivities(): AgentActivity[] {
    return Array.from(this.agentActivities.values());
  }

  /**
   * Get active execution plans
   */
  getActivePlans(): ExecutionPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): ExecutionPlan | undefined {
    return this.activePlans.get(planId);
  }

  /**
   * Cancel a plan execution
   */
  async cancelPlan(planId: string): Promise<boolean> {
    const plan = this.activePlans.get(planId);
    if (!plan || plan.status === 'completed' || plan.status === 'failed') {
      return false;
    }

    plan.status = 'failed';
    plan.steps.forEach(step => {
      if (step.status === 'pending' || step.status === 'running') {
        step.status = 'failed';
        step.error = 'Plan cancelled by user';
      }
    });

    return true;
  }

  /**
   * Initialize the orchestrator with available tools and agents
   */
  async initialize(): Promise<void> {
    // Load built-in tools
    await this.toolRegistry.loadBuiltInTools();
    
    // Discover available agents
    await this.agentRegistry.discoverAgents();
    
    // Initialize conversation state storage
    await this.conversationState.initialize();
    
    console.log('Orchestrator Agent initialized');
  }
}