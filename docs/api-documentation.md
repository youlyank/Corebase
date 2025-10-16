# 📚 CoreBase API Documentation

> **Complete API reference** for the CoreBase AI-Powered Development Suite.

## 📋 Table of Contents

- [Authentication](#authentication)
- [AI & Agentic APIs](#ai--agentic-apis)
- [Container Management](#container-management)
- [File System](#file-system)
- [Collaboration](#collaboration)
- [Monitoring](#monitoring)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [SDK Examples](#sdk-examples)

## 🔐 Authentication

### Overview

CoreBase uses JWT (JSON Web Tokens) for authentication. All API endpoints (except auth endpoints) require a valid JWT token.

### Authentication Flow

```javascript
// 1. Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "user": { "id": "user_id", "email": "user@example.com", "role": "user" },
  "token": "jwt_token_here"
}

// 2. Include token in subsequent requests
Authorization: Bearer jwt_token_here
```

### Auth Endpoints

#### POST /api/auth/login
Login user and return JWT token.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "string",
    "role": "user|admin|super_admin",
    "createdAt": "datetime"
  },
  "token": "jwt_string",
  "refreshToken": "refresh_token_string"
}
```

#### POST /api/auth/register
Register new user account.

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "string",
    "role": "user",
    "createdAt": "datetime"
  },
  "token": "jwt_string"
}
```

#### POST /api/auth/refresh
Refresh JWT token using refresh token.

**Request:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "new_jwt_string",
  "refreshToken": "new_refresh_token_string"
}
```

#### POST /api/auth/logout
Logout user and invalidate tokens.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 🤖 AI & Agentic APIs

### Overview

The AI system provides intelligent code completion, task planning, and automated development capabilities.

### POST /api/agentic
Create a development plan using AI.

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request:**
```json
{
  "goal": "string"
}
```

**Example Request:**
```json
{
  "goal": "Add authentication system with login and registration"
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "id": "plan_1234567890",
    "goal": "Add authentication system with login and registration",
    "steps": [
      {
        "id": "step_0",
        "description": "Analyze project requirements for authentication",
        "type": "analysis",
        "status": "pending",
        "dependencies": []
      },
      {
        "id": "step_1",
        "description": "Install required authentication packages",
        "type": "command",
        "command": "npm install next-auth @auth/prisma-adapter",
        "status": "pending",
        "dependencies": ["step_0"]
      },
      {
        "id": "step_2",
        "description": "Create authentication API routes",
        "type": "file_edit",
        "filePath": "src/app/api/auth/[...nextauth]/route.ts",
        "content": "import NextAuth from 'next-auth'...",
        "status": "pending",
        "dependencies": ["step_1"]
      }
    ],
    "estimatedTime": 25,
    "complexity": "medium",
    "status": "planning",
    "currentStep": 0,
    "progress": 0
  }
}
```

### POST /api/agentic/execute
Execute a specific step from a development plan.

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request:**
```json
{
  "planId": "string",
  "stepId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "stepId": "step_1",
    "status": "completed",
    "output": "Packages installed successfully:\n- next-auth@4.24.5\n- @auth/prisma-adapter@1.0.6",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/completion
Get AI-powered code completions.

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request:**
```json
{
  "filePath": "string",
  "language": "string",
  "position": {
    "line": "number",
    "column": "number"
  },
  "prefix": "string",
  "suffix": "string",
  "entireContent": "string"
}
```

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "label": "console.log()",
      "kind": "method",
      "detail": "Logs output to console",
      "documentation": "Outputs a message to the web console",
      "insertText": "console.log()",
      "priority": 90,
      "source": "ai"
    },
    {
      "label": "const ",
      "kind": "keyword",
      "detail": "Constant declaration",
      "insertText": "const ",
      "priority": 85,
      "source": "local"
    }
  ],
  "processingTime": 150
}
```

## 🐳 Container Management

### Overview

Manage Docker containers for development environments.

### GET /api/runtime/containers
List all containers for the authenticated user.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "containers": [
    {
      "id": "container_123",
      "name": "my-node-app",
      "image": "node:18-alpine",
      "status": "running",
      "ports": ["3000:3000"],
      "createdAt": "2024-01-15T10:00:00.000Z",
      "config": {
        "environment": ["NODE_ENV=development"],
        "volumes": ["/app:/workspace"]
      }
    }
  ]
}
```

### POST /api/runtime/containers
Create a new container.

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request:**
```json
{
  "name": "string",
  "image": "string",
  "config": {
    "environment": ["string"],
    "ports": ["string"],
    "volumes": ["string"],
    "command": ["string"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "container": {
    "id": "container_456",
    "name": "my-python-app",
    "image": "python:3.11-alpine",
    "status": "created",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST /api/runtime/containers/{containerId}/start
Start a container.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "status": "running"
}
```

### POST /api/runtime/containers/{containerId}/stop
Stop a container.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "status": "stopped"
}
```

### DELETE /api/runtime/containers/{containerId}
Delete a container.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "message": "Container deleted successfully"
}
```

## 📁 File System

### Overview

Manage project files and directories.

### GET /api/filesystem/v2/tree
Get file tree for a project.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `path` (optional): Root path for tree (default: "/")

**Response:**
```json
{
  "success": true,
  "tree": [
    {
      "name": "src",
      "type": "directory",
      "path": "/src",
      "children": [
        {
          "name": "app",
          "type": "directory",
          "path": "/src/app",
          "children": [
            {
              "name": "page.tsx",
              "type": "file",
              "path": "/src/app/page.tsx",
              "size": 2048,
              "lastModified": "2024-01-15T10:00:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

### GET /api/filesystem/v2/files/{fileId}
Get file content.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file_123",
    "name": "page.tsx",
    "path": "/src/app/page.tsx",
    "content": "export default function Home() { return <div>Hello</div>; }",
    "size": 2048,
    "lastModified": "2024-01-15T10:00:00.000Z"
  }
}
```

### POST /api/filesystem/v2/files
Create or update a file.

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request:**
```json
{
  "name": "string",
  "path": "string",
  "content": "string",
  "type": "file"
}
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file_456",
    "name": "component.tsx",
    "path": "/src/components/component.tsx",
    "size": 1024,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### DELETE /api/filesystem/v2/files/{fileId}
Delete a file.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## 👥 Collaboration

### Overview

Real-time collaboration features using WebSockets.

### POST /api/collaboration/v2/sessions
Create a collaboration session.

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request:**
```json
{
  "projectId": "string",
  "name": "string"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session_123",
    "projectId": "project_456",
    "name": "Development Session",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "participants": [
      {
        "userId": "user_789",
        "name": "John Doe",
        "joinedAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

### POST /api/collaboration/v2/sessions/{sessionId}/operations
Send an operation to the collaboration session.

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request:**
```json
{
  "type": "insert|delete|retain",
  "position": "number",
  "content": "string",
  "length": "number"
}
```

**Response:**
```json
{
  "success": true,
  "operationId": "op_123"
}
```

### WebSocket Events

#### Connection
```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

#### Join Session
```javascript
socket.emit('join_session', {
  sessionId: 'session_123',
  projectId: 'project_456'
});
```

#### File Operation
```javascript
socket.emit('file_operation', {
  sessionId: 'session_123',
  operation: {
    type: 'insert',
    position: 10,
    content: 'Hello World'
  }
});
```

#### Cursor Movement
```javascript
socket.emit('cursor_move', {
  sessionId: 'session_123',
  position: { line: 5, column: 10 }
});
```

## 📊 Monitoring

### Overview

System monitoring and metrics endpoints.

### GET /api/monitoring/metrics
Get system metrics.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "system": {
      "cpu": 45.2,
      "memory": 68.5,
      "disk": 32.1
    },
    "application": {
      "activeUsers": 12,
      "runningContainers": 5,
      "totalProjects": 23
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/monitoring/health
Get application health status.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "docker": "healthy"
  },
  "uptime": 86400,
  "version": "1.0.0"
}
```

## ❌ Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `INTERNAL_ERROR` | 500 | Server internal error |
| `AI_SERVICE_ERROR` | 503 | AI service unavailable |
| `CONTAINER_ERROR` | 500 | Docker container operation failed |
| `FILE_ERROR` | 500 | File system operation failed |

### Error Examples

#### Authentication Error
```json
{
  "success": false,
  "error": "Invalid authentication token",
  "code": "UNAUTHORIZED"
}
```

#### Validation Error
```json
{
  "success": false,
  "error": "Invalid request parameters",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

## ⚡ Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

### Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth endpoints | 10 requests | 15 minutes |
| AI APIs | 100 requests | 1 hour |
| Container APIs | 200 requests | 1 hour |
| File APIs | 500 requests | 1 hour |
| Other APIs | 1000 requests | 1 hour |

### Rate Limit Error

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": "1 hour",
    "retryAfter": 3600
  }
}
```

## 💻 SDK Examples

### JavaScript/TypeScript SDK

```typescript
// Install SDK
npm install @corebase/sdk

// Initialize
import { CoreBaseClient } from '@corebase/sdk'

const client = new CoreBaseClient({
  baseURL: 'https://api.corebase.dev',
  token: 'your_jwt_token'
})

// AI Planning
const plan = await client.agentic.createPlan({
  goal: 'Add user authentication system'
})

// Execute Step
const result = await client.agentic.executeStep({
  planId: plan.id,
  stepId: 'step_1'
})

// Container Management
const containers = await client.runtime.containers.list()
const container = await client.runtime.containers.create({
  name: 'my-app',
  image: 'node:18-alpine'
})

// File Operations
const file = await client.filesystem.create({
  path: '/src/app/page.tsx',
  content: 'export default function Home() { return <div>Hello</div>; }'
})
```

### Python SDK

```python
# Install SDK
pip install corebase-sdk

# Initialize
from corebase import CoreBaseClient

client = CoreBaseClient(
    base_url='https://api.corebase.dev',
    token='your_jwt_token'
)

# AI Planning
plan = client.agentic.create_plan(
    goal='Add user authentication system'
)

# Execute Step
result = client.agentic.execute_step(
    plan_id=plan['id'],
    step_id='step_1'
)

# Container Management
containers = client.runtime.containers.list()
container = client.runtime.containers.create(
    name='my-app',
    image='node:18-alpine'
)
```

### cURL Examples

```bash
# Authentication
curl -X POST https://api.corebase.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# AI Planning
curl -X POST https://api.corebase.dev/api/agentic \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"goal":"Add authentication system"}'

# List Containers
curl -X GET https://api.corebase.dev/api/runtime/containers \
  -H "Authorization: Bearer your_jwt_token"

# Create File
curl -X POST https://api.corebase.dev/api/filesystem/v2/files \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"test.tsx","path":"/src/test.tsx","content":"console.log(\"Hello\")"}'
```

## 🔧 Advanced Usage

### Streaming Responses

Some endpoints support streaming responses for real-time updates:

```javascript
const response = await fetch('/api/agentic/execute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ planId, stepId })
})

const reader = response.body.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  console.log(new TextDecoder().decode(value))
}
```

### Batch Operations

```javascript
// Execute multiple steps in parallel
const promises = plan.steps.map(step => 
  fetch('/api/agentic/execute', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer token' },
    body: JSON.stringify({ planId, stepId: step.id })
  })
)

const results = await Promise.all(promises)
```

---

**📚 This API documentation provides comprehensive information for integrating with the CoreBase platform.**