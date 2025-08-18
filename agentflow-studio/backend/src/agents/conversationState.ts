/**
 * Conversation State Management - Manages conversation history and context
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  domain?: string;
  preferences?: Record<string, any>;
  variables?: Record<string, any>;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  lastActivity: Date;
  participants: string[];
  topics: string[];
  status: 'active' | 'archived' | 'deleted';
}

export class Conversation {
  public readonly id: string;
  private messages: ConversationMessage[] = [];
  private context: ConversationContext;
  private createdAt: Date;
  private lastActivity: Date;

  constructor(id: string, context: ConversationContext = {}) {
    this.id = id;
    this.context = { ...context };
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  /**
   * Add a message to the conversation
   */
  addMessage(message: ConversationMessage): void {
    this.messages.push({
      ...message,
      timestamp: message.timestamp || new Date()
    });
    this.lastActivity = new Date();
  }

  /**
   * Get all messages
   */
  getHistory(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get messages with pagination
   */
  getMessages(offset: number = 0, limit: number = 50): ConversationMessage[] {
    return this.messages.slice(offset, offset + limit);
  }

  /**
   * Get recent messages
   */
  getRecentMessages(count: number = 10): ConversationMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Get conversation context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Update conversation context
   */
  updateContext(updates: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...updates };
    this.lastActivity = new Date();
  }

  /**
   * Set context variable
   */
  setVariable(key: string, value: any): void {
    if (!this.context.variables) {
      this.context.variables = {};
    }
    this.context.variables[key] = value;
    this.lastActivity = new Date();
  }

  /**
   * Get context variable
   */
  getVariable(key: string, defaultValue?: any): any {
    return this.context.variables?.[key] ?? defaultValue;
  }

  /**
   * Get conversation summary
   */
  getSummary(): ConversationSummary {
    const topics = this.extractTopics();
    const participants = this.extractParticipants();

    return {
      id: this.id,
      title: this.generateTitle(),
      messageCount: this.messages.length,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      participants,
      topics,
      status: 'active'
    };
  }

  /**
   * Search messages by content
   */
  searchMessages(query: string, caseSensitive: boolean = false): ConversationMessage[] {
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    return this.messages.filter(message => {
      const content = caseSensitive ? message.content : message.content.toLowerCase();
      return content.includes(searchQuery);
    });
  }

  /**
   * Get messages by role
   */
  getMessagesByRole(role: ConversationMessage['role']): ConversationMessage[] {
    return this.messages.filter(message => message.role === role);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.messages = [];
    this.lastActivity = new Date();
  }

  /**
   * Export conversation data
   */
  export(): {
    id: string;
    messages: ConversationMessage[];
    context: ConversationContext;
    createdAt: Date;
    lastActivity: Date;
  } {
    return {
      id: this.id,
      messages: this.getHistory(),
      context: this.getContext(),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }

  /**
   * Generate a title based on conversation content
   */
  private generateTitle(): string {
    if (this.messages.length === 0) {
      return 'New Conversation';
    }

    const firstUserMessage = this.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const title = firstUserMessage.content.substring(0, 50);
      return title.length === firstUserMessage.content.length ? title : title + '...';
    }

    return `Conversation ${this.id.substring(0, 8)}`;
  }

  /**
   * Extract topics from conversation
   */
  private extractTopics(): string[] {
    const topicKeywords = [
      'workflow', 'agent', 'data', 'analysis', 'code', 'deployment',
      'monitoring', 'performance', 'optimization', 'integration',
      'automation', 'ai', 'machine learning', 'nlp', 'api'
    ];

    const content = this.messages
      .map(m => m.content.toLowerCase())
      .join(' ');

    return topicKeywords.filter(topic => content.includes(topic));
  }

  /**
   * Extract participants from conversation
   */
  private extractParticipants(): string[] {
    const roles = new Set(this.messages.map(m => m.role));
    return Array.from(roles);
  }
}

/**
 * Storage interface for conversation persistence
 */
export interface ConversationStorage {
  save(conversation: Conversation): Promise<void>;
  load(id: string): Promise<Conversation | null>;
  delete(id: string): Promise<boolean>;
  list(options?: {
    userId?: string;
    limit?: number;
    offset?: number;
    status?: ConversationSummary['status'];
  }): Promise<ConversationSummary[]>;
  search(query: string, options?: {
    userId?: string;
    limit?: number;
  }): Promise<ConversationSummary[]>;
}

/**
 * In-memory storage implementation (for development)
 */
export class MemoryConversationStorage implements ConversationStorage {
  private conversations = new Map<string, Conversation>();

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, conversation);
  }

  async load(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async delete(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  async list(options: {
    userId?: string;
    limit?: number;
    offset?: number;
    status?: ConversationSummary['status'];
  } = {}): Promise<ConversationSummary[]> {
    const { limit = 50, offset = 0, status, userId } = options;
    
    let conversations = Array.from(this.conversations.values());
    
    // Filter by userId if provided
    if (userId) {
      conversations = conversations.filter(conv => 
        conv.getContext().userId === userId
      );
    }

    // Get summaries and filter by status
    let summaries = conversations.map(conv => conv.getSummary());
    
    if (status) {
      summaries = summaries.filter(summary => summary.status === status);
    }

    // Sort by last activity (most recent first)
    summaries.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

    // Apply pagination
    return summaries.slice(offset, offset + limit);
  }

  async search(query: string, options: {
    userId?: string;
    limit?: number;
  } = {}): Promise<ConversationSummary[]> {
    const { limit = 20, userId } = options;
    const lowerQuery = query.toLowerCase();
    
    let conversations = Array.from(this.conversations.values());
    
    // Filter by userId if provided
    if (userId) {
      conversations = conversations.filter(conv => 
        conv.getContext().userId === userId
      );
    }

    // Search in conversation content
    const matchingConversations = conversations.filter(conv => {
      const messages = conv.getHistory();
      return messages.some(message => 
        message.content.toLowerCase().includes(lowerQuery)
      );
    });

    // Get summaries and sort by relevance (simple: by last activity)
    const summaries = matchingConversations
      .map(conv => conv.getSummary())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

    return summaries.slice(0, limit);
  }

  // Additional methods for memory storage
  clear(): void {
    this.conversations.clear();
  }

  size(): number {
    return this.conversations.size;
  }
}

/**
 * File-based storage implementation
 */
export class FileConversationStorage implements ConversationStorage {
  private storageDir: string;

  constructor(storageDir: string = './data/conversations') {
    this.storageDir = storageDir;
    this.ensureStorageDirectory();
  }

  async save(conversation: Conversation): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const filePath = path.join(this.storageDir, `${conversation.id}.json`);
    const data = conversation.export();
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async load(id: string): Promise<Conversation | null> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const filePath = path.join(this.storageDir, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      const conversation = new Conversation(parsed.id, parsed.context);
      
      // Restore messages
      parsed.messages.forEach((msg: any) => {
        conversation.addMessage({
          ...msg,
          timestamp: new Date(msg.timestamp)
        });
      });

      return conversation;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null; // File not found
      }
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const filePath = path.join(this.storageDir, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return false; // File not found
      }
      throw error;
    }
  }

  async list(options: {
    userId?: string;
    limit?: number;
    offset?: number;
    status?: ConversationSummary['status'];
  } = {}): Promise<ConversationSummary[]> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const { limit = 50, offset = 0, status, userId } = options;
    
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const summaries: ConversationSummary[] = [];
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(data);
          
          // Filter by userId if provided
          if (userId && parsed.context?.userId !== userId) {
            continue;
          }
          
          const conversation = new Conversation(parsed.id, parsed.context);
          parsed.messages.forEach((msg: any) => {
            conversation.addMessage({
              ...msg,
              timestamp: new Date(msg.timestamp)
            });
          });
          
          const summary = conversation.getSummary();
          
          // Filter by status if provided
          if (!status || summary.status === status) {
            summaries.push(summary);
          }
        } catch (error) {
          console.warn(`Failed to load conversation from ${file}:`, error);
        }
      }
      
      // Sort by last activity (most recent first)
      summaries.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      
      // Apply pagination
      return summaries.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to list conversations:', error);
      return [];
    }
  }

  async search(query: string, options: {
    userId?: string;
    limit?: number;
  } = {}): Promise<ConversationSummary[]> {
    // For file storage, we need to load conversations to search
    // This is not efficient for large datasets, but works for smaller ones
    const allSummaries = await this.list(options);
    const lowerQuery = query.toLowerCase();
    
    const matchingSummaries: ConversationSummary[] = [];
    
    for (const summary of allSummaries) {
      try {
        const conversation = await this.load(summary.id);
        if (conversation) {
          const messages = conversation.getHistory();
          const hasMatch = messages.some(message => 
            message.content.toLowerCase().includes(lowerQuery)
          );
          
          if (hasMatch) {
            matchingSummaries.push(summary);
          }
        }
      } catch (error) {
        console.warn(`Failed to search conversation ${summary.id}:`, error);
      }
    }
    
    return matchingSummaries.slice(0, options.limit || 20);
  }

  private ensureStorageDirectory(): void {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Failed to create storage directory:', error);
    }
  }
}

/**
 * Main conversation state manager
 */
export class ConversationState {
  private storage: ConversationStorage;
  private activeConversations = new Map<string, Conversation>();

  constructor(storage?: ConversationStorage) {
    this.storage = storage || new MemoryConversationStorage();
  }

  /**
   * Initialize the conversation state manager
   */
  async initialize(): Promise<void> {
    console.log('Conversation state manager initialized');
  }

  /**
   * Create a new conversation
   */
  createConversation(id: string, context: ConversationContext = {}): Conversation {
    const conversation = new Conversation(id, context);
    this.activeConversations.set(id, conversation);
    return conversation;
  }

  /**
   * Get or create a conversation
   */
  async getOrCreateConversation(id: string, context: ConversationContext = {}): Promise<Conversation> {
    // Check active conversations first
    let conversation = this.activeConversations.get(id);
    if (conversation) {
      return conversation;
    }

    // Try to load from storage
    const loadedConversation = await this.storage.load(id);
    if (loadedConversation) {
      conversation = loadedConversation;
      this.activeConversations.set(id, conversation);
      return conversation;
    }

    // Create new conversation
    return this.createConversation(id, context);
  }

  /**
   * Save a conversation to storage
   */
  async saveConversation(id: string, conversation?: Conversation): Promise<void> {
    const conv = conversation || this.activeConversations.get(id);
    if (!conv) {
      throw new Error(`Conversation ${id} not found`);
    }

    await this.storage.save(conv);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<boolean> {
    this.activeConversations.delete(id);
    return await this.storage.delete(id);
  }

  /**
   * List conversations
   */
  async listConversations(options?: {
    userId?: string;
    limit?: number;
    offset?: number;
    status?: ConversationSummary['status'];
  }): Promise<ConversationSummary[]> {
    return await this.storage.list(options);
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string, options?: {
    userId?: string;
    limit?: number;
  }): Promise<ConversationSummary[]> {
    return await this.storage.search(query, options);
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(id: string): Promise<void> {
    const conversation = await this.getOrCreateConversation(id);
    const summary = conversation.getSummary();
    summary.status = 'archived';
    
    // This would update the status in storage
    await this.saveConversation(id, conversation);
  }

  /**
   * Get conversation statistics
   */
  async getStatistics(userId?: string): Promise<{
    totalConversations: number;
    activeConversations: number;
    archivedConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
  }> {
    const summaries = await this.listConversations({ userId, limit: 1000 });
    
    const activeCount = summaries.filter(s => s.status === 'active').length;
    const archivedCount = summaries.filter(s => s.status === 'archived').length;
    const totalMessages = summaries.reduce((sum, s) => sum + s.messageCount, 0);
    const averageMessages = summaries.length > 0 ? totalMessages / summaries.length : 0;

    return {
      totalConversations: summaries.length,
      activeConversations: activeCount,
      archivedConversations: archivedCount,
      totalMessages,
      averageMessagesPerConversation: Math.round(averageMessages * 100) / 100
    };
  }

  /**
   * Cleanup old conversations
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAge);
    const summaries = await this.listConversations({ limit: 1000 });
    
    let cleaned = 0;
    for (const summary of summaries) {
      if (summary.lastActivity < cutoffDate && summary.status === 'archived') {
        await this.deleteConversation(summary.id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Export conversation data
   */
  async exportConversation(id: string): Promise<any> {
    const conversation = await this.getOrCreateConversation(id);
    return conversation.export();
  }

  /**
   * Import conversation data
   */
  async importConversation(data: any): Promise<void> {
    const conversation = new Conversation(data.id, data.context);
    
    data.messages.forEach((msg: any) => {
      conversation.addMessage({
        ...msg,
        timestamp: new Date(msg.timestamp)
      });
    });

    await this.saveConversation(data.id, conversation);
  }
}