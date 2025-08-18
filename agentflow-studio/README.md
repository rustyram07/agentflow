# AgentFlow Studio

AgentFlow Studio is a web-based platform that empowers users to define, deploy, and manage intelligent agent-based applications without writing extensive code, by leveraging your existing agentic framework as its powerful backend.

## Architecture

The platform follows a three-layer architecture:

1. **Frontend (React)**: Modern React application with Material-UI providing a visual workflow builder with drag-and-drop interface
2. **Backend API (Node.js/Express)**: Abstraction layer that translates UI operations to framework calls and manages application storage
3. **Agentic Framework (Python)**: Your existing framework that serves as the execution engine

## Features

- 🎨 **Visual Workflow Builder**: Drag-and-drop interface to create agent workflows
- 🔗 **Framework Integration**: Seamless integration with your existing agentic framework
- 🚀 **One-Click Deployment**: Deploy workflows to cloud with a single click
- 📊 **Real-time Monitoring**: Monitor workflow execution and performance
- 🛠️ **Agent & Tool Management**: Configure and manage available agents and tools
- 📈 **Dashboard Analytics**: Overview of system performance and usage

## Project Structure

```
agentflow-studio/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── nodes/        # Custom ReactFlow nodes
│   │   │   ├── Dashboard.tsx
│   │   │   ├── WorkflowBuilder.tsx
│   │   │   ├── Deployments.tsx
│   │   │   └── Monitoring.tsx
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API services
│   │   └── App.tsx
│   └── package.json
├── backend/                  # Node.js Express backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── models/           # Database models
│   │   ├── middleware/       # Express middleware
│   │   └── server.ts
│   └── package.json
└── README.md
```

## Prerequisites

1. **Agentic Framework**: Your existing agentic framework should be running on `http://localhost:8080`
2. **Node.js**: Version 16 or higher
3. **npm**: Version 8 or higher

## Quick Start

### 1. Start Your Agentic Framework

First, make sure your existing agentic framework is running:

```bash
cd /path/to/your/agentic-framework
python backend/orchestrator/main.py
```

The framework should be accessible at `http://localhost:8080`.

### 2. Start the Backend API

```bash
cd agentflow-studio/backend
npm install
npm run dev
```

The backend API will start on `http://localhost:3001`.

### 3. Start the Frontend

```bash
cd agentflow-studio/frontend
npm install
npm start
```

The frontend will start on `http://localhost:3000`.

### 4. Access AgentFlow Studio

Open your browser and navigate to `http://localhost:3000` to access the AgentFlow Studio interface.

## Usage

### Creating a Workflow

1. **Navigate to Workflows**: Click on "Workflows" in the sidebar
2. **Drag & Drop Nodes**: From the node palette, drag nodes (Input, Agent, Tool, Output) onto the canvas
3. **Connect Nodes**: Click and drag from output handles to input handles to create connections
4. **Configure Nodes**: Click on nodes to configure their properties
5. **Save Workflow**: Click "Save" and provide a name and description
6. **Execute Workflow**: Click "Execute" to run the workflow through your agentic framework

### Available Node Types

- **Input Node**: Entry point for workflow data
- **Agent Node**: Represents an AI agent from your framework
- **Tool Node**: Represents a tool/function from your framework
- **Output Node**: Exit point for workflow results

### Deploying Workflows

1. **Navigate to Deployments**: Click on "Deployments" in the sidebar
2. **Select Workflow**: Choose a workflow to deploy
3. **Deploy**: Click "Deploy" to create a cloud deployment
4. **Monitor**: View deployment status and logs

### Monitoring

1. **Navigate to Monitoring**: Click on "Monitoring" in the sidebar
2. **View Statistics**: See overall system performance metrics
3. **Execution Logs**: Filter and view detailed execution logs
4. **Real-time Updates**: Monitor live workflow executions

## Configuration

### Backend Configuration

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
FRAMEWORK_URL=http://localhost:8080  # Your agentic framework URL
```

### Frontend Configuration

Edit `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_FRAMEWORK_URL=http://localhost:8080
```

## API Integration

The backend provides a clean abstraction layer over your agentic framework:

- **Workflow Management**: CRUD operations for workflows
- **Execution**: Execute workflows via framework
- **Agent Discovery**: Fetch available agents and tools
- **Monitoring**: Collect and display execution logs
- **Deployment**: Manage workflow deployments

## Development

### Backend Development

```bash
cd backend
npm run dev    # Start with nodemon for auto-reload
npm run build  # Build TypeScript
npm start      # Run built version
```

### Frontend Development

```bash
cd frontend
npm start      # Start development server
npm run build  # Build for production
npm test       # Run tests
```

## Framework Integration

AgentFlow Studio integrates with your existing agentic framework through HTTP APIs:

- **Health Check**: `GET /` - Framework status
- **Execute**: `POST /execute` - Run workflows
- **Agents**: `GET /agents` - List available agents
- **Tools**: Discovery through framework structure

## Best Practices

1. **Node Configuration**: Always configure node properties before connecting
2. **Workflow Testing**: Test workflows locally before deployment
3. **Monitoring**: Regularly check execution logs for errors
4. **Framework Health**: Ensure framework connectivity before creating workflows

## Troubleshooting

### Common Issues

1. **Framework Not Connected**:
   - Check if framework is running on port 8080
   - Verify FRAMEWORK_URL in backend .env

2. **CORS Errors**:
   - Ensure FRONTEND_URL is correctly set in backend
   - Check CORS_ORIGIN configuration

3. **Database Issues**:
   - Database is automatically created in `backend/data/`
   - Check write permissions

### Getting Help

1. Check the console logs in browser developer tools
2. Review backend logs for API errors
3. Ensure all services are running on correct ports

## Production Deployment

For production deployment:

1. **Build Frontend**: `npm run build` in frontend directory
2. **Configure Environment**: Update .env files for production URLs
3. **Database**: Consider using PostgreSQL instead of SQLite
4. **Security**: Update JWT secrets and encryption keys
5. **Monitoring**: Set up proper logging and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test locally
4. Submit a pull request

## License

This project is licensed under the MIT License.
