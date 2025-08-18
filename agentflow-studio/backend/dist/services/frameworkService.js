"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrameworkService = void 0;
const axios_1 = __importDefault(require("axios"));
const FRAMEWORK_BASE_URL = process.env.FRAMEWORK_URL || "http://localhost:8080";
class FrameworkService {
  async executeWorkflow(prompt, conversationId) {
    try {
      const response = await axios_1.default.post(
        `${FRAMEWORK_BASE_URL}/execute`,
        {
          prompt,
          conversation_id: conversationId,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Framework execution error:", error);
      throw new Error("Failed to execute workflow in framework");
    }
  }
  async getAgents() {
    try {
      const response = await axios_1.default.get(
        `${FRAMEWORK_BASE_URL}/agents`,
      );
      const frameworkAgents = response.data.agents || [];
      return frameworkAgents.map((agent) => ({
        id: agent.id,
        name: agent.id,
        type: "framework_agent",
        description: `Framework agent: ${agent.id}`,
        endpoint: `${FRAMEWORK_BASE_URL}/agents/${agent.id}`,
        status: agent.status,
        configuration: {},
      }));
    } catch (error) {
      console.error("Error fetching agents:", error);
      return this.getDefaultAgents();
    }
  }
  async getTools() {
    try {
      return [
        {
          id: "calculator",
          name: "Calculator",
          description: "Performs mathematical calculations",
          endpoint: `${FRAMEWORK_BASE_URL}/tools/calculator`,
          parameters: {
            expression: {
              type: "string",
              required: true,
              description: "Mathematical expression to evaluate",
            },
          },
        },
        {
          id: "search",
          name: "Search Tool",
          description: "Performs web searches",
          endpoint: `${FRAMEWORK_BASE_URL}/tools/search`,
          parameters: {
            query: {
              type: "string",
              required: true,
              description: "Search query",
            },
          },
        },
        {
          id: "document_processor",
          name: "Document Processor",
          description: "Processes and analyzes documents",
          endpoint: `${FRAMEWORK_BASE_URL}/tools/document_processor`,
          parameters: {
            document_url: {
              type: "string",
              required: true,
              description: "URL or path to document",
            },
            operation: {
              type: "string",
              required: true,
              description: "Operation to perform (extract, summarize, analyze)",
            },
          },
        },
        {
          id: "ml_model",
          name: "ML Model",
          description: "Machine learning model inference",
          endpoint: `${FRAMEWORK_BASE_URL}/tools/ml_model`,
          parameters: {
            input_data: {
              type: "object",
              required: true,
              description: "Input data for model inference",
            },
            model_type: {
              type: "string",
              required: false,
              description: "Type of ML model to use",
            },
          },
        },
      ];
    } catch (error) {
      console.error("Error fetching tools:", error);
      return [];
    }
  }
  getDefaultAgents() {
    return [
      {
        id: "audit_agent",
        name: "Audit Agent",
        type: "audit",
        description: "Performs tax audit analysis",
        endpoint: `${FRAMEWORK_BASE_URL}/agents/audit_agent`,
        status: "active",
        configuration: {},
      },
      {
        id: "data_analysis",
        name: "Data Analysis Agent",
        type: "analysis",
        description: "Analyzes data and generates insights",
        endpoint: `${FRAMEWORK_BASE_URL}/agents/data_analysis`,
        status: "active",
        configuration: {},
      },
      {
        id: "code_generation",
        name: "Code Generation Agent",
        type: "coding",
        description: "Generates and reviews code",
        endpoint: `${FRAMEWORK_BASE_URL}/agents/code_generation`,
        status: "active",
        configuration: {},
      },
      {
        id: "software_testing",
        name: "Software Testing Agent",
        type: "testing",
        description: "Performs software testing and validation",
        endpoint: `${FRAMEWORK_BASE_URL}/agents/software_testing`,
        status: "active",
        configuration: {},
      },
    ];
  }
  async getHealthStatus() {
    try {
      const response = await axios_1.default.get(`${FRAMEWORK_BASE_URL}/`);
      return {
        status: "connected",
        framework_status: response.data.status,
        url: FRAMEWORK_BASE_URL,
      };
    } catch (error) {
      return {
        status: "disconnected",
        error: "Framework not reachable",
        url: FRAMEWORK_BASE_URL,
      };
    }
  }
}
exports.FrameworkService = FrameworkService;
