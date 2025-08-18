# AgentFlow Studio API Documentation

## Overview

AgentFlow Studio provides a RESTful API for managing workflows, agents, deployments, and monitoring. All API responses follow a consistent structure for error handling and data representation.

## Base URL

```
http://localhost:3001/api
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": <response_data>,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Rate Limiting

- 100 requests per 15 minutes per IP address
- Rate limit headers included in responses

## Authentication

Currently, the API does not require authentication. This will be added in future versions.

---

## Workflows API

### GET /workflows

Retrieve all workflows

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Workflow Name",
      "description": "Workflow description",
      "nodes": [],
      "edges": [],
      "created_at": "2024-01-01T12:00:00.000Z",
      "updated_at": "2024-01-01T12:00:00.000Z",
      "deployed": false
    }
  ]
}
```

### GET /workflows/:id

Retrieve a specific workflow

**Parameters:**

- `id` (required): Workflow UUID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Workflow Name",
    "description": "Workflow description",
    "nodes": [],
    "edges": [],
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z",
    "deployed": false
  }
}
```

### POST /workflows

Create a new workflow

**Request Body:**

```json
{
  "name": "Workflow Name (required, 1-255 chars)",
  "description": "Description (optional, max 1000 chars)",
  "nodes": [],
  "edges": []
}
```

**Validation:**

- `name`: Required string, 1-255 characters
- `description`: Optional string, max 1000 characters
- `nodes`: Required array with node objects
- `edges`: Required array with edge objects

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "generated-uuid",
    "name": "Workflow Name",
    "description": "Description",
    "nodes": [],
    "edges": [],
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z",
    "deployed": false
  }
}
```

### PUT /workflows/:id

Update an existing workflow

**Parameters:**

- `id` (required): Workflow UUID

**Request Body:**

```json
{
  "name": "Updated Name (optional)",
  "description": "Updated description (optional)",
  "nodes": [],
  "edges": []
}
```

### DELETE /workflows/:id

Delete a workflow

**Parameters:**

- `id` (required): Workflow UUID

**Response:**

```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

### POST /workflows/:id/execute

Execute a workflow

**Parameters:**

- `id` (required): Workflow UUID

**Request Body:**

```json
{
  "input": "Execution input (optional, max 10000 chars)"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "result": "execution_result",
    "workflow": {
      "id": "uuid",
      "name": "Workflow Name"
    }
  }
}
```

---

## Agents API

### GET /agents

Retrieve all available agents

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "agent-id",
      "name": "Agent Name",
      "type": "agent_type",
      "description": "Agent description",
      "status": "active|inactive"
    }
  ]
}
```

### GET /agents/tools

Retrieve all available tools

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "tool-id",
      "name": "Tool Name",
      "description": "Tool description",
      "parameters": {}
    }
  ]
}
```

### GET /agents/health

Check agent framework health

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy|unhealthy",
    "framework_connected": true,
    "agents_count": 5,
    "tools_count": 10
  }
}
```

---

## Deployments API

### GET /deployments

Retrieve all deployments

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "deployment-uuid",
      "workflow_id": "workflow-uuid",
      "workflow_name": "Workflow Name",
      "status": "pending|running|completed|failed",
      "url": "deployment-url",
      "created_at": "2024-01-01T12:00:00.000Z",
      "logs": ["log1", "log2"]
    }
  ]
}
```

### GET /deployments/:id

Retrieve a specific deployment

**Parameters:**

- `id` (required): Deployment UUID

### POST /deployments

Create a new deployment

**Request Body:**

```json
{
  "workflow_id": "workflow-uuid (required)"
}
```

**Validation:**

- `workflow_id`: Required valid UUID

### DELETE /deployments/:id

Delete a deployment

**Parameters:**

- `id` (required): Deployment UUID

---

## Monitoring API

### GET /monitoring/stats

Retrieve monitoring statistics

**Response:**

```json
{
  "success": true,
  "data": {
    "total_workflows": 10,
    "active_deployments": 5,
    "recent_executions": 25,
    "errors_24h": 2
  }
}
```

### GET /monitoring/logs/:workflowId

Retrieve execution logs for a workflow

**Parameters:**

- `workflowId` (required): Workflow UUID

**Query Parameters:**

- `limit` (optional): Number of logs to return (1-1000, default: 100)
- `level` (optional): Log level filter (info|warn|error)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "workflow_id": "workflow-uuid",
      "node_id": "node-id",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "level": "info|warn|error",
      "message": "Log message",
      "data": {}
    }
  ]
}
```

---

## Health Check

### GET /health

Check API health

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## Error Codes

| Code                  | Description                         |
| --------------------- | ----------------------------------- |
| `VALIDATION_ERROR`    | Request validation failed           |
| `NOT_FOUND`           | Resource not found                  |
| `INTERNAL_ERROR`      | Internal server error               |
| `FRAMEWORK_ERROR`     | External framework connection error |
| `RATE_LIMIT_EXCEEDED` | Too many requests                   |

---

## Examples

### Create and Execute Workflow

```bash
# Create workflow
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "description": "A test workflow",
    "nodes": [],
    "edges": []
  }'

# Execute workflow
curl -X POST http://localhost:3001/api/workflows/{workflow-id}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": "test input"
  }'
```

### Deploy Workflow

```bash
curl -X POST http://localhost:3001/api/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "workflow-uuid"
  }'
```

### Monitor Execution

```bash
# Get stats
curl http://localhost:3001/api/monitoring/stats

# Get logs
curl "http://localhost:3001/api/monitoring/logs/{workflow-id}?limit=50&level=error"
```
