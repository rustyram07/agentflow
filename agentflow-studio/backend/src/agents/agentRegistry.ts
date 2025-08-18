/**
 * Agent Registry Service - Manages multi-agent collaboration and discovery
 */

export interface AgentCapability {
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface AgentMetadata {
  id: string;
  name: string;
  type: string;
  version: string;
  description: string;
  capabilities: AgentCapability[];
  endpoint?: string;
  port?: number;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  lastHeartbeat: Date;
  load: number; // 0-100 representing current load
  tags: string[];
  dependencies: string[]; // Other agents this agent depends on
  metadata: Record<string, any>;
}

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  task: AgentTask;
  status: 'assigned' | 'running' | 'completed' | 'failed';
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  error?: string;
}

export interface AgentTask {
  task: string;
  args: Record<string, any>;
  context?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  timeout?: number;
  retries?: number;
}

export interface AgentNegotiation {
  taskId: string;
  requestingAgent: string;
  availableAgents: string[];
  proposals: AgentProposal[];
  selectedAgent?: string;
  status: 'open' | 'negotiating' | 'completed' | 'failed';
}

export interface AgentProposal {
  agentId: string;
  estimatedTime: number; // minutes
  confidence: number; // 0-1
  cost: number; // arbitrary units
  requirements: string[];
}

/**
 * Abstract Agent interface for multi-agent system
 */
export abstract class Agent {
  abstract readonly metadata: AgentMetadata;
  
  abstract execute(task: AgentTask): Promise<string>;
  abstract isHealthy(): Promise<boolean>;
  abstract getCapabilities(): AgentCapability[];
  abstract estimateTask(task: AgentTask): Promise<AgentProposal>;
}

/**
 * Built-in specialized agents
 */

export class DataAnalysisAgent extends Agent {
  readonly metadata: AgentMetadata = {
    id: 'data_analysis_agent',
    name: 'Data Analysis Agent',
    type: 'analysis',
    version: '1.0.0',
    description: 'Specialized agent for data analysis and insights generation',
    capabilities: [
      {
        name: 'statistical_analysis',
        description: 'Perform statistical analysis on datasets',
        inputTypes: ['csv', 'json', 'array'],
        outputTypes: ['statistics', 'insights'],
        complexity: 'medium'
      },
      {
        name: 'trend_analysis',
        description: 'Analyze trends in time-series data',
        inputTypes: ['timeseries', 'csv'],
        outputTypes: ['trends', 'forecasts'],
        complexity: 'high'
      }
    ],
    status: 'active',
    lastHeartbeat: new Date(),
    load: 0,
    tags: ['data', 'analysis', 'statistics'],
    dependencies: [],
    metadata: {}
  };

  async execute(task: AgentTask): Promise<string> {
    // Mock data analysis execution
    const { task: taskType, args } = task;
    
    if (taskType.includes('analyze') || taskType.includes('statistical')) {
      return this.performStatisticalAnalysis(args);
    } else if (taskType.includes('trend')) {
      return this.performTrendAnalysis(args);
    }
    
    return `Data analysis completed for task: ${taskType}`;
  }

  async isHealthy(): Promise<boolean> {
    return this.metadata.status === 'active';
  }

  getCapabilities(): AgentCapability[] {
    return this.metadata.capabilities;
  }

  async estimateTask(task: AgentTask): Promise<AgentProposal> {
    const complexity = task.task.toLowerCase();
    let estimatedTime = 5; // base 5 minutes
    let confidence = 0.8;

    if (complexity.includes('complex') || complexity.includes('advanced')) {
      estimatedTime = 15;
      confidence = 0.7;
    } else if (complexity.includes('simple') || complexity.includes('basic')) {
      estimatedTime = 3;
      confidence = 0.9;
    }

    return {
      agentId: this.metadata.id,
      estimatedTime,
      confidence,
      cost: estimatedTime * 2, // 2 cost units per minute
      requirements: []
    };
  }

  private performStatisticalAnalysis(args: Record<string, any>): string {
    // Mock statistical analysis
    return `Statistical Analysis Results:
- Mean: ${(Math.random() * 100).toFixed(2)}
- Standard Deviation: ${(Math.random() * 20).toFixed(2)}
- Sample Size: ${Math.floor(Math.random() * 1000) + 100}
- Confidence Interval: [${(Math.random() * 50).toFixed(2)}, ${(Math.random() * 50 + 50).toFixed(2)}]`;
  }

  private performTrendAnalysis(args: Record<string, any>): string {
    const trend = Math.random() > 0.5 ? 'upward' : 'downward';
    const strength = Math.random() > 0.5 ? 'strong' : 'moderate';
    
    return `Trend Analysis Results:
- Trend Direction: ${trend}
- Trend Strength: ${strength}
- R-squared: ${(Math.random() * 0.5 + 0.5).toFixed(3)}
- Forecast Accuracy: ${(Math.random() * 20 + 75).toFixed(1)}%`;
  }
}

export class CodeGenerationAgent extends Agent {
  readonly metadata: AgentMetadata = {
    id: 'code_generation_agent',
    name: 'Code Generation Agent',
    type: 'generation',
    version: '1.0.0',
    description: 'Specialized agent for code generation and software development tasks',
    capabilities: [
      {
        name: 'code_generation',
        description: 'Generate code from natural language descriptions',
        inputTypes: ['text', 'requirements'],
        outputTypes: ['code', 'typescript', 'javascript'],
        complexity: 'high'
      },
      {
        name: 'code_review',
        description: 'Review and analyze existing code',
        inputTypes: ['code', 'typescript', 'javascript'],
        outputTypes: ['feedback', 'suggestions'],
        complexity: 'medium'
      }
    ],
    status: 'active',
    lastHeartbeat: new Date(),
    load: 0,
    tags: ['code', 'generation', 'development'],
    dependencies: [],
    metadata: {}
  };

  async execute(task: AgentTask): Promise<string> {
    const { task: taskType, args } = task;
    
    if (taskType.includes('generate') || taskType.includes('create')) {
      return this.generateCode(args);
    } else if (taskType.includes('review') || taskType.includes('analyze')) {
      return this.reviewCode(args);
    }
    
    return `Code generation task completed: ${taskType}`;
  }

  async isHealthy(): Promise<boolean> {
    return this.metadata.status === 'active';
  }

  getCapabilities(): AgentCapability[] {
    return this.metadata.capabilities;
  }

  async estimateTask(task: AgentTask): Promise<AgentProposal> {
    const complexity = task.task.toLowerCase();
    let estimatedTime = 10; // base 10 minutes
    let confidence = 0.75;

    if (complexity.includes('complex') || complexity.includes('advanced')) {
      estimatedTime = 25;
      confidence = 0.6;
    } else if (complexity.includes('simple') || complexity.includes('basic')) {
      estimatedTime = 5;
      confidence = 0.85;
    }

    return {
      agentId: this.metadata.id,
      estimatedTime,
      confidence,
      cost: estimatedTime * 3, // 3 cost units per minute
      requirements: []
    };
  }

  private generateCode(args: Record<string, any>): string {
    const { type = 'function', language = 'typescript' } = args;
    
    return `Generated ${language} ${type}:

\`\`\`${language}
// Generated code based on requirements
export class GeneratedClass {
  constructor() {
    console.log('Generated class initialized');
  }

  execute(): string {
    return 'Generated functionality implemented';
  }
}
\`\`\`

Code generation completed successfully.`;
  }

  private reviewCode(args: Record<string, any>): string {
    return `Code Review Results:
- Code Quality: Good
- Security Issues: None detected
- Performance: Optimized
- Best Practices: Followed
- Suggestions:
  1. Add error handling for edge cases
  2. Consider adding unit tests
  3. Document public methods`;
  }
}

/**
 * Agent Registry manages agent discovery, registration, and collaboration
 */
export class AgentRegistry {
  private agents = new Map<string, Agent>();
  private taskAssignments = new Map<string, TaskAssignment>();
  private negotiations = new Map<string, AgentNegotiation>();
  private heartbeats = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.loadBuiltInAgents();
  }

  /**
   * Load built-in agents
   */
  loadBuiltInAgents(): void {
    const builtInAgents = [
      new DataAnalysisAgent(),
      new CodeGenerationAgent()
    ];

    builtInAgents.forEach(agent => {
      this.registerAgent(agent);
    });

    console.log(`Loaded ${builtInAgents.length} built-in agents`);
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.metadata.id, agent);
    this.startHeartbeatMonitoring(agent);
    console.log(`Registered agent: ${agent.metadata.name} (${agent.metadata.id})`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    const heartbeat = this.heartbeats.get(agentId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeats.delete(agentId);
    }
    return this.agents.delete(agentId);
  }

  /**
   * Check if an agent exists and is available
   */
  hasAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    return agent !== undefined && agent.metadata.status === 'active';
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): Agent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }
    return agent;
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: string): Agent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.metadata.type === type
    );
  }

  /**
   * Find best agent for a task using negotiation
   */
  async findBestAgentForTask(task: AgentTask): Promise<string | null> {
    const availableAgents = this.getAvailableAgents();
    
    if (availableAgents.length === 0) {
      return null;
    }

    // Get proposals from all available agents
    const proposals: AgentProposal[] = [];
    
    for (const agent of availableAgents) {
      try {
        const proposal = await agent.estimateTask(task);
        proposals.push(proposal);
      } catch (error) {
        console.warn(`Agent ${agent.metadata.id} failed to provide proposal:`, error);
      }
    }

    if (proposals.length === 0) {
      return null;
    }

    // Select best agent based on confidence, time, and load
    const bestProposal = proposals.reduce((best, current) => {
      const currentAgent = this.agents.get(current.agentId);
      const bestAgent = this.agents.get(best.agentId);
      
      if (!currentAgent || !bestAgent) return best;

      // Calculate score: higher is better
      const currentScore = current.confidence * 0.5 + 
                          (1 - current.estimatedTime / 60) * 0.3 +
                          (1 - currentAgent.metadata.load / 100) * 0.2;
      
      const bestScore = best.confidence * 0.5 + 
                       (1 - best.estimatedTime / 60) * 0.3 +
                       (1 - bestAgent.metadata.load / 100) * 0.2;

      return currentScore > bestScore ? current : best;
    });

    return bestProposal.agentId;
  }

  /**
   * Assign a task to an agent
   */
  async assignTask(agentId: string, task: AgentTask): Promise<string> {
    const agent = this.getAgent(agentId);
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const assignment: TaskAssignment = {
      taskId,
      agentId,
      task,
      status: 'assigned',
      assignedAt: new Date()
    };

    this.taskAssignments.set(taskId, assignment);

    try {
      // Update agent status
      agent.metadata.status = 'busy';
      agent.metadata.load = Math.min(100, agent.metadata.load + 20);
      
      assignment.status = 'running';
      assignment.startedAt = new Date();

      // Execute the task
      const result = await agent.execute(task);
      
      assignment.status = 'completed';
      assignment.completedAt = new Date();
      assignment.result = result;

      // Update agent status
      agent.metadata.status = 'active';
      agent.metadata.load = Math.max(0, agent.metadata.load - 20);

      return result;

    } catch (error) {
      assignment.status = 'failed';
      assignment.error = error instanceof Error ? error.message : String(error);
      
      // Update agent status
      agent.metadata.status = 'error';
      agent.metadata.load = Math.max(0, agent.metadata.load - 20);

      throw error;
    }
  }

  /**
   * Execute a task with automatic agent selection
   */
  async executeTask(task: AgentTask): Promise<string> {
    const bestAgentId = await this.findBestAgentForTask(task);
    
    if (!bestAgentId) {
      throw new Error('No suitable agent found for the task');
    }

    return await this.assignTask(bestAgentId, task);
  }

  /**
   * Get available agents (active and not overloaded)
   */
  private getAvailableAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.metadata.status === 'active' && agent.metadata.load < 80
    );
  }

  /**
   * Start heartbeat monitoring for an agent
   */
  private startHeartbeatMonitoring(agent: Agent): void {
    const heartbeat = setInterval(async () => {
      try {
        const isHealthy = await agent.isHealthy();
        agent.metadata.lastHeartbeat = new Date();
        
        if (!isHealthy && agent.metadata.status === 'active') {
          agent.metadata.status = 'error';
          console.warn(`Agent ${agent.metadata.id} reported unhealthy status`);
        } else if (isHealthy && agent.metadata.status === 'error') {
          agent.metadata.status = 'active';
          console.log(`Agent ${agent.metadata.id} recovered`);
        }
      } catch (error) {
        agent.metadata.status = 'offline';
        console.error(`Heartbeat failed for agent ${agent.metadata.id}:`, error);
      }
    }, 30000); // 30 second heartbeat

    this.heartbeats.set(agent.metadata.id, heartbeat);
  }

  /**
   * Discover agents from external registry
   */
  async discoverAgents(): Promise<void> {
    // This would integrate with external agent registry service
    // For now, we just ensure built-in agents are loaded
    console.log('Agent discovery completed');
  }

  /**
   * Get agent statistics
   */
  getAgentStatistics(): {
    totalAgents: number;
    activeAgents: number;
    busyAgents: number;
    errorAgents: number;
    averageLoad: number;
  } {
    const agents = Array.from(this.agents.values());
    const activeAgents = agents.filter(a => a.metadata.status === 'active').length;
    const busyAgents = agents.filter(a => a.metadata.status === 'busy').length;
    const errorAgents = agents.filter(a => a.metadata.status === 'error').length;
    const averageLoad = agents.reduce((sum, a) => sum + a.metadata.load, 0) / agents.length || 0;

    return {
      totalAgents: agents.length,
      activeAgents,
      busyAgents,
      errorAgents,
      averageLoad
    };
  }

  /**
   * Get task assignments
   */
  getTaskAssignments(): TaskAssignment[] {
    return Array.from(this.taskAssignments.values());
  }

  /**
   * Get agent metadata for monitoring
   */
  getAgentMetadata(): AgentMetadata[] {
    return Array.from(this.agents.values()).map(agent => ({ ...agent.metadata }));
  }

  /**
   * Reset agent load (for testing/debugging)
   */
  resetAgentLoads(): void {
    for (const agent of this.agents.values()) {
      agent.metadata.load = 0;
      if (agent.metadata.status === 'busy') {
        agent.metadata.status = 'active';
      }
    }
  }

  /**
   * Shutdown the registry
   */
  shutdown(): void {
    // Clear all heartbeat intervals
    for (const heartbeat of this.heartbeats.values()) {
      clearInterval(heartbeat);
    }
    this.heartbeats.clear();
    
    console.log('Agent Registry shutdown completed');
  }
}