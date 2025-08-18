export interface WorkflowNode {
  id: string;
  type: "agent" | "tool" | "input" | "output" | "decision";
  label: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    [key: string]: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  created_at: string;
  updated_at: string;
  deployed: boolean;
  deployment_url?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  endpoint: string;
  status: "active" | "inactive" | "error";
  configuration: {
    [key: string]: any;
  };
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  parameters: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
}

export interface Deployment {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "completed" | "failed";
  url?: string;
  created_at: string;
  logs: string[];
}

export interface ExecutionLog {
  id: string;
  workflow_id: string;
  node_id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  data?: any;
}
