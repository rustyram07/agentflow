import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import path from "path";

let db: Database;

export async function initializeDatabase(): Promise<void> {
  const dbPath = path.join(__dirname, "../../data/agentflow.db");

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      nodes TEXT NOT NULL,
      edges TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deployed BOOLEAN DEFAULT 0,
      deployment_url TEXT
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      endpoint TEXT NOT NULL,
      status TEXT DEFAULT 'inactive',
      configuration TEXT
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      endpoint TEXT NOT NULL,
      parameters TEXT
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      logs TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows (id)
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows (id)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workflows_deployed ON workflows(deployed);
    CREATE INDEX IF NOT EXISTS idx_deployments_workflow_id ON deployments(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
    CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow_id ON execution_logs(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_execution_logs_timestamp ON execution_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_execution_logs_level ON execution_logs(level);
    CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow_timestamp ON execution_logs(workflow_id, timestamp DESC);
  `);

  console.log("Database initialized successfully");
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
