/**
 * Extensible Tool Library - Modular system for adding capabilities to the orchestrator
 */

export interface ToolMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  category: string;
  tags: string[];
  parameters: Record<string, ToolParameter>;
  examples: ToolExample[];
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface ToolExample {
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: string;
}

export interface ToolExecutionContext {
  workflowId?: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Base class for all tools in the system
 */
export abstract class Tool {
  abstract readonly metadata: ToolMetadata;

  /**
   * Execute the tool with given arguments
   */
  abstract run(args: Record<string, any>, context?: ToolExecutionContext): Promise<string>;

  /**
   * Validate input arguments
   */
  validateArgs(args: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [paramName, param] of Object.entries(this.metadata.parameters)) {
      const value = args[paramName];

      // Check required parameters
      if (param.required && (value === undefined || value === null)) {
        errors.push(`Required parameter '${paramName}' is missing`);
        continue;
      }

      // Skip validation for optional missing parameters
      if (value === undefined || value === null) continue;

      // Type validation
      if (param.type === 'string' && typeof value !== 'string') {
        errors.push(`Parameter '${paramName}' must be a string`);
      } else if (param.type === 'number' && typeof value !== 'number') {
        errors.push(`Parameter '${paramName}' must be a number`);
      } else if (param.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Parameter '${paramName}' must be a boolean`);
      } else if (param.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
        errors.push(`Parameter '${paramName}' must be an object`);
      } else if (param.type === 'array' && !Array.isArray(value)) {
        errors.push(`Parameter '${paramName}' must be an array`);
      }

      // Validation rules
      if (param.validation) {
        const validation = param.validation;
        
        if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
          errors.push(`Parameter '${paramName}' must be >= ${validation.min}`);
        }
        
        if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
          errors.push(`Parameter '${paramName}' must be <= ${validation.max}`);
        }
        
        if (validation.pattern && typeof value === 'string' && !new RegExp(validation.pattern).test(value)) {
          errors.push(`Parameter '${paramName}' does not match required pattern`);
        }
        
        if (validation.enum && !validation.enum.includes(value)) {
          errors.push(`Parameter '${paramName}' must be one of: ${validation.enum.join(', ')}`);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Get tool usage documentation
   */
  getDocumentation(): string {
    const { metadata } = this;
    let doc = `# ${metadata.name}\n\n`;
    doc += `${metadata.description}\n\n`;
    doc += `**Category:** ${metadata.category}\n`;
    doc += `**Tags:** ${metadata.tags.join(', ')}\n\n`;
    
    doc += '## Parameters\n\n';
    for (const [name, param] of Object.entries(metadata.parameters)) {
      doc += `- **${name}** (${param.type}${param.required ? ', required' : ', optional'}): ${param.description}\n`;
      if (param.default !== undefined) {
        doc += `  - Default: ${JSON.stringify(param.default)}\n`;
      }
    }
    
    if (metadata.examples.length > 0) {
      doc += '\n## Examples\n\n';
      metadata.examples.forEach((example, index) => {
        doc += `### ${example.name}\n`;
        doc += `${example.description}\n\n`;
        doc += `**Input:**\n\`\`\`json\n${JSON.stringify(example.input, null, 2)}\n\`\`\`\n\n`;
        doc += `**Expected Output:** ${example.expectedOutput}\n\n`;
      });
    }

    return doc;
  }
}

/**
 * Built-in tools
 */

export class WorkflowBuilderTool extends Tool {
  readonly metadata: ToolMetadata = {
    name: 'workflow_builder',
    description: 'Create and modify workflows programmatically',
    version: '1.0.0',
    category: 'workflow',
    tags: ['workflow', 'creation', 'builder'],
    parameters: {
      template: {
        type: 'string',
        required: false,
        description: 'Template to use for workflow creation',
        validation: {
          enum: ['basic', 'data_processing', 'api_integration', 'custom']
        }
      },
      nodes: {
        type: 'array',
        required: false,
        description: 'Array of node definitions'
      },
      name: {
        type: 'string',
        required: true,
        description: 'Name of the workflow'
      },
      description: {
        type: 'string',
        required: false,
        description: 'Description of the workflow'
      }
    },
    examples: [{
      name: 'Create basic workflow',
      description: 'Create a simple data processing workflow',
      input: { name: 'Data Processor', template: 'data_processing' },
      expectedOutput: 'Created workflow with 3 nodes: Input → Process → Output'
    }]
  };

  async run(args: Record<string, any>, context?: ToolExecutionContext): Promise<string> {
    const validation = this.validateArgs(args);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { name, template = 'basic', description, nodes } = args;
    
    // Mock workflow creation logic
    let nodeCount = 1;
    let workflowDescription = `Created workflow "${name}"`;
    
    if (template === 'data_processing') {
      nodeCount = 3;
      workflowDescription += ' with data processing template (Input → Process → Output)';
    } else if (template === 'api_integration') {
      nodeCount = 4;
      workflowDescription += ' with API integration template (Input → Authenticate → API Call → Output)';
    } else if (nodes && Array.isArray(nodes)) {
      nodeCount = nodes.length;
      workflowDescription += ` with ${nodeCount} custom nodes`;
    }

    if (description) {
      workflowDescription += `\nDescription: ${description}`;
    }

    // In a real implementation, this would:
    // 1. Create actual workflow in the database
    // 2. Generate workflow nodes based on template
    // 3. Connect nodes appropriately
    // 4. Return workflow ID

    return workflowDescription;
  }
}

export class NaturalLanguageProcessorTool extends Tool {
  readonly metadata: ToolMetadata = {
    name: 'natural_language_processor',
    description: 'Process natural language requests and extract structured information',
    version: '1.0.0',
    category: 'nlp',
    tags: ['nlp', 'language', 'processing', 'analysis'],
    parameters: {
      request: {
        type: 'string',
        required: true,
        description: 'Natural language request to process'
      },
      task: {
        type: 'string',
        required: false,
        description: 'Specific NLP task to perform',
        validation: {
          enum: ['intent_detection', 'entity_extraction', 'sentiment_analysis', 'requirement_analysis']
        }
      }
    },
    examples: [{
      name: 'Intent Detection',
      description: 'Detect the intent behind a user request',
      input: { request: 'I want to create a workflow for processing customer data', task: 'intent_detection' },
      expectedOutput: 'Intent: workflow_creation, Entities: [customer_data], Confidence: 0.95'
    }]
  };

  async run(args: Record<string, any>, context?: ToolExecutionContext): Promise<string> {
    const validation = this.validateArgs(args);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { request, task = 'intent_detection' } = args;

    // Mock NLP processing
    switch (task) {
      case 'intent_detection':
        return this.detectIntent(request);
      case 'entity_extraction':
        return this.extractEntities(request);
      case 'sentiment_analysis':
        return this.analyzeSentiment(request);
      case 'requirement_analysis':
        return this.analyzeRequirements(request);
      default:
        return `Processed natural language request: "${request}"`;
    }
  }

  private detectIntent(request: string): string {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('create') || lowerRequest.includes('build') || lowerRequest.includes('make')) {
      return 'Intent: creation, Confidence: 0.9';
    } else if (lowerRequest.includes('analyze') || lowerRequest.includes('check') || lowerRequest.includes('review')) {
      return 'Intent: analysis, Confidence: 0.85';
    } else if (lowerRequest.includes('help') || lowerRequest.includes('how')) {
      return 'Intent: help_request, Confidence: 0.8';
    } else {
      return 'Intent: general_query, Confidence: 0.6';
    }
  }

  private extractEntities(request: string): string {
    const entities: string[] = [];
    
    if (request.includes('workflow')) entities.push('workflow');
    if (request.includes('data')) entities.push('data');
    if (request.includes('customer')) entities.push('customer');
    if (request.includes('API')) entities.push('API');
    if (request.includes('database')) entities.push('database');
    
    return `Entities: [${entities.join(', ')}]`;
  }

  private analyzeSentiment(request: string): string {
    const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'wrong', 'problem'];
    
    const words = request.toLowerCase().split(' ');
    const positive = words.some(word => positiveWords.includes(word));
    const negative = words.some(word => negativeWords.includes(word));
    
    if (positive && !negative) return 'Sentiment: positive (0.8)';
    if (negative && !positive) return 'Sentiment: negative (0.8)';
    if (positive && negative) return 'Sentiment: mixed (0.5)';
    return 'Sentiment: neutral (0.5)';
  }

  private analyzeRequirements(request: string): string {
    const requirements: string[] = [];
    
    if (request.includes('workflow')) requirements.push('Workflow management capability needed');
    if (request.includes('data')) requirements.push('Data processing functionality required');
    if (request.includes('API')) requirements.push('API integration support needed');
    if (request.includes('database')) requirements.push('Database connectivity required');
    if (request.includes('real-time') || request.includes('live')) requirements.push('Real-time processing capability needed');
    
    return `Requirements Analysis:\n${requirements.map(r => `- ${r}`).join('\n')}`;
  }
}

export class PerformanceAnalyzerTool extends Tool {
  readonly metadata: ToolMetadata = {
    name: 'performance_analyzer',
    description: 'Analyze workflow and system performance metrics',
    version: '1.0.0',
    category: 'analysis',
    tags: ['performance', 'analysis', 'metrics', 'optimization'],
    parameters: {
      workflowId: {
        type: 'string',
        required: false,
        description: 'ID of the workflow to analyze'
      },
      analysisType: {
        type: 'string',
        required: false,
        description: 'Type of performance analysis to perform',
        default: 'comprehensive',
        validation: {
          enum: ['basic', 'comprehensive', 'bottleneck', 'resource_usage']
        }
      },
      timeRange: {
        type: 'string',
        required: false,
        description: 'Time range for analysis',
        default: '24h',
        validation: {
          enum: ['1h', '6h', '24h', '7d', '30d']
        }
      }
    },
    examples: [{
      name: 'Comprehensive Analysis',
      description: 'Perform a comprehensive performance analysis',
      input: { analysisType: 'comprehensive', timeRange: '24h' },
      expectedOutput: 'Performance Analysis: Average execution time: 2.3s, Success rate: 98.5%, Bottlenecks identified in data processing stage'
    }]
  };

  async run(args: Record<string, any>, context?: ToolExecutionContext): Promise<string> {
    const validation = this.validateArgs(args);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { workflowId, analysisType = 'comprehensive', timeRange = '24h' } = args;

    // Mock performance analysis
    const metrics = {
      avgExecutionTime: Math.random() * 5 + 1, // 1-6 seconds
      successRate: Math.random() * 10 + 90, // 90-100%
      throughput: Math.random() * 100 + 50, // 50-150 req/min
      errorRate: Math.random() * 5, // 0-5%
      resourceUtilization: Math.random() * 30 + 40 // 40-70%
    };

    let analysis = `Performance Analysis (${timeRange}):\n`;
    analysis += `- Average Execution Time: ${metrics.avgExecutionTime.toFixed(2)}s\n`;
    analysis += `- Success Rate: ${metrics.successRate.toFixed(1)}%\n`;
    analysis += `- Throughput: ${metrics.throughput.toFixed(0)} req/min\n`;
    analysis += `- Error Rate: ${metrics.errorRate.toFixed(1)}%\n`;
    analysis += `- Resource Utilization: ${metrics.resourceUtilization.toFixed(1)}%\n`;

    // Add analysis-specific insights
    if (analysisType === 'bottleneck') {
      analysis += '\nBottleneck Analysis:\n';
      if (metrics.avgExecutionTime > 3) {
        analysis += '- High execution time detected in data processing stage\n';
      }
      if (metrics.errorRate > 2) {
        analysis += '- Elevated error rate suggests connection issues\n';
      }
    }

    if (analysisType === 'comprehensive') {
      analysis += '\nRecommendations:\n';
      if (metrics.resourceUtilization > 60) {
        analysis += '- Consider scaling resources for better performance\n';
      }
      if (metrics.successRate < 95) {
        analysis += '- Investigate failure patterns to improve reliability\n';
      }
    }

    return analysis;
  }
}

/**
 * Tool Registry manages all available tools
 */
export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private categories = new Set<string>();

  constructor() {
    // Load built-in tools
    this.loadBuiltInTools();
  }

  /**
   * Load built-in tools
   */
  async loadBuiltInTools(): Promise<void> {
    const builtInTools = [
      new WorkflowBuilderTool(),
      new NaturalLanguageProcessorTool(),
      new PerformanceAnalyzerTool()
    ];

    builtInTools.forEach(tool => {
      this.registerTool(tool);
    });

    console.log(`Loaded ${builtInTools.length} built-in tools`);
  }

  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.metadata.name, tool);
    this.categories.add(tool.metadata.category);
    console.log(`Registered tool: ${tool.metadata.name}`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }
    return tool;
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): Tool[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.metadata.category === category
    );
  }

  /**
   * Search tools by tags
   */
  searchToolsByTags(tags: string[]): Tool[] {
    return Array.from(this.tools.values()).filter(tool =>
      tags.some(tag => tool.metadata.tags.includes(tag))
    );
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories);
  }

  /**
   * Get tool metadata for all tools
   */
  getToolCatalog(): ToolMetadata[] {
    return Array.from(this.tools.values()).map(tool => tool.metadata);
  }

  /**
   * Validate a tool execution request
   */
  validateToolExecution(toolName: string, args: Record<string, any>): {
    isValid: boolean;
    errors: string[];
    tool?: Tool;
  } {
    if (!this.hasTool(toolName)) {
      return {
        isValid: false,
        errors: [`Tool '${toolName}' not found`]
      };
    }

    const tool = this.getTool(toolName);
    const validation = tool.validateArgs(args);

    return {
      ...validation,
      tool: validation.isValid ? tool : undefined
    };
  }

  /**
   * Execute a tool with error handling and logging
   */
  async executeTool(
    toolName: string, 
    args: Record<string, any>, 
    context?: ToolExecutionContext
  ): Promise<string> {
    const validation = this.validateToolExecution(toolName, args);
    
    if (!validation.isValid) {
      throw new Error(`Tool execution validation failed: ${validation.errors.join(', ')}`);
    }

    const tool = validation.tool!;
    const startTime = Date.now();

    try {
      const result = await tool.run(args, context);
      const executionTime = Date.now() - startTime;
      
      console.log(`Tool '${toolName}' executed successfully in ${executionTime}ms`);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Tool '${toolName}' failed after ${executionTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Get tool documentation
   */
  getToolDocumentation(toolName: string): string {
    if (!this.hasTool(toolName)) {
      throw new Error(`Tool '${toolName}' not found`);
    }
    return this.getTool(toolName).getDocumentation();
  }

  /**
   * Generate full documentation for all tools
   */
  generateFullDocumentation(): string {
    let doc = '# Tool Registry Documentation\n\n';
    doc += `Total tools registered: ${this.tools.size}\n\n`;
    
    for (const category of this.getCategories()) {
      doc += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Tools\n\n`;
      
      const categoryTools = this.getToolsByCategory(category);
      categoryTools.forEach(tool => {
        doc += tool.getDocumentation() + '\n---\n\n';
      });
    }

    return doc;
  }
}