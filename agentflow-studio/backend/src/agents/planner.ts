import { v4 as uuidv4 } from 'uuid';
import { LLMService } from './llm';
import { ExecutionPlan, ExecutionStep } from './orchestrator';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class Planner {
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  /**
   * Generate an execution plan based on user prompt and conversation history
   */
  async generatePlan(
    prompt: string, 
    conversationId: string, 
    history: ConversationMessage[] = []
  ): Promise<ExecutionPlan> {
    const complexity = this.assessComplexity(prompt);
    const planId = uuidv4();

    // Create the planning prompt for the LLM
    const planningPrompt = this.createPlanningPrompt(prompt, complexity, history);
    
    // Generate plan using LLM
    const llmResponse = await this.llmService.generate(planningPrompt);
    
    // Parse the LLM response into structured steps
    const steps = this.parsePlanFromLLM(llmResponse);
    
    return {
      id: planId,
      conversationId,
      prompt,
      complexity,
      steps,
      status: 'created',
      createdAt: new Date()
    };
  }

  /**
   * Assess the complexity of a task based on various factors
   */
  private assessComplexity(prompt: string): 'simple' | 'medium' | 'complex' {
    const promptLower = prompt.toLowerCase();
    
    // Complex indicators
    const complexIndicators = [
      'workflow', 'multi-step', 'integration', 'analysis', 'report',
      'multiple', 'complex', 'advanced', 'comprehensive', 'detailed',
      'enterprise', 'production', 'deployment', 'scale', 'optimize'
    ];
    
    // Simple indicators
    const simpleIndicators = [
      'simple', 'quick', 'basic', 'single', 'just', 'only',
      'help me', 'what is', 'how to', 'explain', 'show me'
    ];

    const complexScore = complexIndicators.filter(indicator => 
      promptLower.includes(indicator)
    ).length;
    
    const simpleScore = simpleIndicators.filter(indicator => 
      promptLower.includes(indicator)
    ).length;

    // Additional complexity factors
    const hasMultipleRequests = prompt.split(/\band\b|\bor\b|\bthen\b/i).length > 2;
    const hasQuestions = (prompt.match(/\?/g) || []).length > 1;
    const wordCount = prompt.split(/\s+/).length;

    let totalComplexity = complexScore - simpleScore;
    
    if (hasMultipleRequests) totalComplexity += 2;
    if (hasQuestions) totalComplexity += 1;
    if (wordCount > 50) totalComplexity += 1;
    if (wordCount > 100) totalComplexity += 2;

    if (totalComplexity >= 3) return 'complex';
    if (totalComplexity >= 1) return 'medium';
    return 'simple';
  }

  /**
   * Create the planning prompt for the LLM
   */
  private createPlanningPrompt(
    prompt: string, 
    complexity: string, 
    history: ConversationMessage[]
  ): string {
    const contextualInfo = this.extractContextFromHistory(history);
    
    return `
You are an intelligent planning agent for AgentFlow Studio. Your job is to analyze user requests and create detailed execution plans.

TASK COMPLEXITY: ${complexity}
USER REQUEST: "${prompt}"

${contextualInfo ? `CONVERSATION CONTEXT: ${contextualInfo}` : ''}

Create a detailed execution plan by breaking down the request into specific, actionable steps.
Each step should specify exactly what tool or agent to use and what arguments to provide.

AVAILABLE CAPABILITIES:
1. WORKFLOW MANAGEMENT:
   - workflow_builder: Create, modify, analyze workflows
   - workflow_executor: Execute workflows with parameters
   - workflow_optimizer: Optimize workflow performance

2. INTELLIGENT SERVICES:
   - recommendation_engine: Generate workflow recommendations
   - performance_analyzer: Analyze and suggest optimizations
   - anomaly_detector: Detect unusual patterns in executions
   - error_resolver: Provide intelligent error resolution

3. LLM SERVICES:
   - natural_language_processor: Process natural language requests
   - code_generator: Generate code from descriptions
   - documentation_generator: Create documentation

4. DATA PROCESSING:
   - data_processor: Process various data formats
   - api_connector: Connect to external APIs
   - file_processor: Handle file operations

5. ANALYSIS TOOLS:
   - data_analyzer: Analyze data patterns and trends
   - report_generator: Generate comprehensive reports
   - visualization_creator: Create charts and visualizations

PLANNING RULES:
- For SIMPLE tasks: 1-3 steps focusing on direct solutions
- For MEDIUM tasks: 3-5 steps with some analysis or processing
- For COMPLEX tasks: 5+ steps with comprehensive analysis, validation, and optimization

Return ONLY a JSON array of execution steps in this exact format:
[
  {
    "name": "Brief step name",
    "task": "Detailed description of what this step accomplishes",
    "toolName": "exact_tool_name_from_available_capabilities",
    "toolArgs": {
      "parameter1": "value1",
      "parameter2": "value2"
    },
    "contextSpec": {
      "context_key": "context_value"
    }
  }
]

EXAMPLES:

Simple Task - "Create a basic data processing workflow":
[
  {
    "name": "Create Basic Workflow",
    "task": "Create a simple data processing workflow with input, process, and output nodes",
    "toolName": "workflow_builder",
    "toolArgs": {
      "template": "data_processing",
      "complexity": "simple"
    },
    "contextSpec": {
      "workflow_type": "data_processing"
    }
  }
]

Medium Task - "Analyze my workflow performance and suggest improvements":
[
  {
    "name": "Analyze Performance",
    "task": "Analyze current workflow execution performance and identify bottlenecks",
    "toolName": "performance_analyzer",
    "toolArgs": {
      "analysis_type": "comprehensive",
      "include_metrics": true
    },
    "contextSpec": {
      "focus": "performance_optimization"
    }
  },
  {
    "name": "Generate Recommendations",
    "task": "Generate specific improvement recommendations based on performance analysis",
    "toolName": "recommendation_engine",
    "toolArgs": {
      "recommendation_type": "performance",
      "priority": "high_impact"
    },
    "contextSpec": {
      "source": "performance_analysis"
    }
  }
]

Complex Task - "Build an intelligent customer service workflow with natural language processing and automated responses":
[
  {
    "name": "Analyze Requirements",
    "task": "Analyze customer service workflow requirements and identify key components",
    "toolName": "natural_language_processor",
    "toolArgs": {
      "task": "requirement_analysis",
      "domain": "customer_service"
    },
    "contextSpec": {
      "workflow_domain": "customer_service"
    }
  },
  {
    "name": "Design Workflow Architecture",
    "task": "Design the overall workflow architecture with NLP integration points",
    "toolName": "workflow_builder",
    "toolArgs": {
      "template": "customer_service",
      "features": ["nlp_processing", "automated_responses", "escalation"]
    },
    "contextSpec": {
      "architecture_type": "intelligent_service"
    }
  },
  {
    "name": "Integrate NLP Capabilities",
    "task": "Integrate natural language processing for customer query understanding",
    "toolName": "natural_language_processor",
    "toolArgs": {
      "task": "integration_setup",
      "capabilities": ["intent_detection", "entity_extraction", "sentiment_analysis"]
    },
    "contextSpec": {
      "integration_point": "query_processing"
    }
  },
  {
    "name": "Configure Response Generation",
    "task": "Set up automated response generation based on processed queries",
    "toolName": "code_generator",
    "toolArgs": {
      "type": "response_templates",
      "language": "typescript"
    },
    "contextSpec": {
      "response_type": "automated"
    }
  },
  {
    "name": "Test and Optimize",
    "task": "Test the complete workflow and optimize for performance and accuracy",
    "toolName": "workflow_executor",
    "toolArgs": {
      "mode": "test",
      "validation": true
    },
    "contextSpec": {
      "optimization_target": "accuracy_and_performance"
    }
  }
]

Now analyze the user request and generate the appropriate execution plan:
`;
  }

  /**
   * Extract relevant context from conversation history
   */
  private extractContextFromHistory(history: ConversationMessage[]): string {
    if (history.length === 0) return '';

    // Get recent context (last 5 messages)
    const recentHistory = history.slice(-5);
    
    // Extract key topics and entities
    const context = recentHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join(' | ');

    return context.length > 500 ? context.substring(0, 500) + '...' : context;
  }

  /**
   * Parse the LLM response into structured execution steps
   */
  private parsePlanFromLLM(llmResponse: string): ExecutionStep[] {
    try {
      // Clean the response - remove any markdown code blocks
      let cleanResponse = llmResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/```$/, '');
      }

      // Parse the JSON
      const parsed = JSON.parse(cleanResponse);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Expected array of steps');
      }

      // Convert to ExecutionStep objects
      return parsed.map((step: any, index: number) => ({
        id: uuidv4(),
        name: step.name || `Step ${index + 1}`,
        task: step.task || step.description || 'No description provided',
        toolName: step.toolName || step.tool_name || 'unknown',
        toolArgs: step.toolArgs || step.tool_args || {},
        contextSpec: step.contextSpec || step.context_spec || {},
        status: 'pending' as const
      }));

    } catch (error) {
      console.error('Failed to parse LLM plan response:', error);
      console.error('Raw LLM response:', llmResponse);
      
      // Fallback: create a simple plan based on the original prompt
      return this.createFallbackPlan(llmResponse);
    }
  }

  /**
   * Create a fallback plan when LLM parsing fails
   */
  private createFallbackPlan(originalPrompt: string): ExecutionStep[] {
    return [{
      id: uuidv4(),
      name: 'Process Request',
      task: 'Process the user request using available tools',
      toolName: 'natural_language_processor',
      toolArgs: {
        request: originalPrompt,
        fallback: true
      },
      contextSpec: {
        fallback_plan: true
      },
      status: 'pending'
    }];
  }

  /**
   * Validate a generated plan for completeness and logic
   */
  validatePlan(plan: ExecutionPlan): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if plan has steps
    if (plan.steps.length === 0) {
      issues.push('Plan has no execution steps');
    }

    // Check each step
    plan.steps.forEach((step, index) => {
      if (!step.name || step.name.trim().length === 0) {
        issues.push(`Step ${index + 1} has no name`);
      }
      
      if (!step.task || step.task.trim().length === 0) {
        issues.push(`Step ${index + 1} has no task description`);
      }
      
      if (!step.toolName || step.toolName.trim().length === 0) {
        issues.push(`Step ${index + 1} has no tool specified`);
      }
    });

    // Check for logical flow
    const toolNames = plan.steps.map(s => s.toolName);
    const hasWorkflowSteps = toolNames.some(name => name.includes('workflow'));
    const hasAnalysisSteps = toolNames.some(name => name.includes('analy'));
    
    // If complex plan, should have multiple complementary tools
    if (plan.complexity === 'complex' && new Set(toolNames).size < 2) {
      issues.push('Complex plan should utilize multiple tools');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Refine a plan based on validation feedback or execution results
   */
  async refinePlan(
    originalPlan: ExecutionPlan, 
    feedback: string
  ): Promise<ExecutionPlan> {
    const refinementPrompt = `
Original plan had issues. Please create a refined version.

ORIGINAL PLAN:
${JSON.stringify(originalPlan.steps, null, 2)}

ISSUES/FEEDBACK:
${feedback}

ORIGINAL PROMPT: "${originalPlan.prompt}"

Create an improved execution plan that addresses the feedback while maintaining the original intent.
Return the same JSON format as before.
`;

    const refinedResponse = await this.llmService.generate(refinementPrompt);
    const refinedSteps = this.parsePlanFromLLM(refinedResponse);

    return {
      ...originalPlan,
      id: uuidv4(), // New plan ID
      steps: refinedSteps,
      status: 'created'
    };
  }
}