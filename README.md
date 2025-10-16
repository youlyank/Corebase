# 🚀 CoreBase Platform - AI-Powered Development Suite

> **Production-ready AI-powered development platform** with intelligent code completion, agentic development, real-time collaboration, and container orchestration.

[![GitHub License](https://img.shields.io/github/license/youlyank/Corebase)](https://github.com/youlyank/Corebase)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black)](https://nextjs.org/)
[![AI Features](https://img.shields.io/badge/AI-Enabled-purple)](https://github.com/youlyank/Corebase)

## 🎯 What is CoreBase?

CoreBase is a **complete AI-powered development platform** that transforms your development workflow. It combines cutting-edge AI technology with modern development environment, bringing together:

- 🤖 **AI-Powered Development** - Intelligent code completion and agentic planning
- 🐳 **Container Management** - Full Docker orchestration with lifecycle control
- 🔌 **Real-time Collaboration** - WebSocket-powered live updates  
- 🛠️ **Development Environment** - Replit-style coding experience
- 🔐 **Enterprise Security** - JWT auth, audit logs, resource quotas
- 📊 **Monitoring & Analytics** - Real-time metrics and insights

## ✨ Key Features

### 🤖 AI-Powered Development
- **Intelligent Code Completion** - Context-aware AI suggestions powered by ZAI SDK
- **Agentic Developer Mode** - AI agent that plans and executes development tasks
- **Smart Task Planning** - Automatic breakdown of goals into executable steps
- **Memory Management** - Persistent learning from project patterns and history

### 🐳 Container Orchestration
- **Full Docker Integration** - Start, stop, restart, delete containers
- **Resource Management** - CPU, memory, network monitoring
- **Template System** - 6+ pre-configured templates (Node.js, Python, PostgreSQL)
- **Security Isolation** - Multi-layer security and access control

### 🔄 Real-time Features
- **WebSocket Communication** - Live updates and notifications
- **Database Events** - Real-time data synchronization
- **Collaborative Editing** - Multi-user development environment
- **Status Monitoring** - Live container and system metrics

### 🛡️ Enterprise Security
- **JWT Authentication** - Secure token-based auth system
- **Role-Based Access** - User, Admin, Super Admin roles
- **Audit Logging** - Complete activity tracking
- **Resource Quotas** - User-based resource limits

### 📊 Monitoring & Analytics
- **Real-time Metrics** - CPU, memory, network statistics
- **Performance Monitoring** - Container performance tracking
- **Usage Analytics** - Resource utilization insights
- **Alert System** - Configurable notifications

## 🚀 Quick Start (3 Commands)

```bash
# 1. Clone the repository
git clone https://github.com/youlyank/Corebase.git
cd Corebase

# 2. Run automated setup (generates JWT secrets & database)
./setup.sh

# 3. Start the platform
npm run dev
```

**🎉 That's it! Your platform is running at http://localhost:3000**

## 🔑 JWT Secret Setup

### Automated Setup (Recommended)
```bash
# The setup script automatically generates secure JWT secrets
./setup.sh

# Your generated secrets will be displayed and saved to .env
```

### Manual JWT Secret Generation
```bash
# Generate secure JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Add to your .env file
echo "JWT_SECRET=\"${JWT_SECRET}\"" >> .env
echo "JWT_REFRESH_SECRET=\"${JWT_REFRESH_SECRET}\"" >> .env
echo "NEXTAUTH_SECRET=\"${NEXTAUTH_SECRET}\"" >> .env

echo "✅ JWT secrets generated:"
echo "🔑 JWT_SECRET: ${JWT_SECRET}"
echo "🔑 JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}"
echo "🔑 NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}"
```

### Current Development Keys
```bash
# For immediate testing (CHANGE IN PRODUCTION)
JWT_SECRET="replace_with_long_random_string_please_change_this_in_production"
JWT_REFRESH_SECRET="replace_with_another_long_random_string_for_refresh_tokens"
NEXTAUTH_SECRET="nextauth_secret_please_change_in_production"
```

## 🗄️ Database Setup

### SQLite Database (Development)
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npm run db:generate

# 3. Push schema to database
npm run db:push

# 4. (Optional) Seed database with sample data
npm run db:seed
```

### PostgreSQL Database (Production)
```bash
# 1. Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 2. Create database
sudo -u postgres createdb corebase

# 3. Update .env with PostgreSQL URL
DATABASE_URL="postgresql://username:password@localhost:5432/corebase"

# 4. Generate and push schema
npm run db:generate
npm run db:push
```

### Database Schema Overview
```sql
-- Core Models
users, sessions, api_keys, audit_logs

-- Project Management  
projects, database_tables

-- Container Runtime
containers, container_templates, runtime_metrics, user_quotas

-- File Storage
files

-- AI & Memory System
project_memory, development_plans, task_executions, file_context

-- Authentication
auth_providers
```

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Main Platform** | http://localhost:3000 | CoreBase Dashboard |
| **API Endpoints** | http://localhost:3000/api | REST API |
| **AI Agent API** | http://localhost:3000/api/agentic | AI Planning & Execution |
| **WebSocket** | ws://localhost:3000/api/socketio | Real-time Updates |

## 🏗️ Architecture

```
CoreBase Platform
├── 🤖 AI Engine (ZAI SDK + Memory Management)
├── 🐳 Container Runtime (Docker SDK)
├── 🔌 API Layer (Next.js 15)
├── 🗄️ Database Layer (Prisma + SQLite/PostgreSQL)
├── 🔄 Real-time Engine (Socket.IO)
├── 🔐 Authentication (JWT + NextAuth)
├── 📊 Monitoring (Custom Metrics)
└── 🛡️ Security (RBAC + Audit)
```

## 🤖 AI Features

### Intelligent Code Completion
- **Context-Aware Suggestions** - AI understands your code context
- **Multi-Language Support** - JavaScript, TypeScript, Python, and more
- **Real-time Completion** - Instant suggestions as you type
- **Learning System** - Improves based on your coding patterns

### Agentic Developer Mode
- **Goal Planning** - AI breaks down complex goals into steps
- **Automated Execution** - Executes development tasks automatically
- **Memory System** - Learns from project structure and history
- **Progress Tracking** - Real-time monitoring of task execution

### Example Usage
```javascript
// AI will suggest completions as you type
function createUser(name, email) {
  // AI suggests: const user = { id: generateId(), name, email };
  // AI suggests: return database.users.create(user);
}

// Agentic Developer: "Add authentication system"
// AI will:
// 1. Plan the implementation steps
// 2. Install required dependencies
// 3. Create auth components
// 4. Set up API routes
// 5. Test the implementation
```

## 📋 System Requirements

- **Node.js** 18+ 
- **Docker** & Docker Compose
- **Git**
- **4GB+ RAM** recommended
- **10GB+ Storage** recommended

## 🛠️ Development Commands

```bash
# Development
npm run dev          # Start development server
npm run lint         # Run ESLint
npm run build        # Build for production

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:reset     # Reset database
npm run db:seed      # Seed sample data

# Production
npm run start        # Start production server
```

## 🐳 Docker Deployment

```bash
# Development with Docker Compose
docker-compose up -d

# Production Docker Build
docker build -t corebase .
docker run -p 3000:3000 --env-file .env corebase
```

## 📚 Documentation

- **[GitHub Setup Guide](./GITHUB-SETUP.md)** - Complete repository setup
- **[Setup Instructions](./SETUP.md)** - Detailed configuration guide
- **[JWT Key Reference](./KEYS.md)** - Security keys and secrets
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment
- **[API Documentation](./docs/runtime-api.md)** - REST API reference
- **[AI Features Guide](./docs/ai-features.md)** - AI capabilities and usage
- **[Architecture Documentation](./docs/architecture.md)** - System architecture

## 🎯 Use Cases

### 🏢 Enterprise Teams
- **Development Environments** - Isolated dev spaces for each team
- **AI-Assisted Development** - Accelerate coding with AI suggestions
- **CI/CD Integration** - Automated testing and deployment
- **Resource Management** - Track and limit resource usage
- **Security & Compliance** - Audit logs and access control

### 👥 Individual Developers
- **Personal Cloud** - Your own AI-powered development platform
- **Project Management** - Organize projects and containers
- **Learning Environment** - Safe space to experiment with AI
- **Portfolio Hosting** - Deploy and showcase projects
- **Productivity Boost** - AI assistance for faster development

### 🎓 Educational Institutions
- **AI-Powered Teaching** - Intelligent coding assistance
- **Student Projects** - Isolated project spaces with AI help
- **Resource Monitoring** - Track student progress
- **Collaborative Coding** - Real-time pair programming

## 🔄 What's New

### Phase 1 Complete ✅
- ✅ **Complete Container Orchestration** - Full Docker lifecycle management
- ✅ **Real-time WebSocket System** - Live updates and collaboration
- ✅ **Enterprise Authentication** - JWT-based security system
- ✅ **Advanced Monitoring** - Resource metrics and analytics
- ✅ **Template System** - Pre-configured development environments
- ✅ **Production Deployment** - Docker and cloud-ready

### Phase 2 Complete ✅
- ✅ **AI-Powered Code Completion** - Intelligent code suggestions
- ✅ **Agentic Developer Mode** - AI task planning and execution
- ✅ **Memory Management System** - Persistent AI learning
- ✅ **Real-time Collaboration** - Multi-user editing
- ✅ **Advanced IDE Features** - Web-based development environment

## 🛣️ Roadmap

### Phase 3 (Q3 2024)
- [ ] **Advanced AI Features** - Code generation, refactoring assistance
- [ ] **Cloud Deployment** - AWS, GCP, Azure integration
- [ ] **Auto-scaling** - Dynamic resource management
- [ ] **Advanced Monitoring** - Prometheus + Grafana
- [ ] **Marketplace** - Template and plugin ecosystem

### Phase 4 (Q4 2024)
- [ ] **Git Integration** - Repository management
- [ ] **Team Collaboration** - Multi-user projects
- [ ] **Advanced Networking** - Container networking
- [ ] **Mobile App** - iOS and Android applications

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **📖 Documentation**: [Check our docs](./docs/)
- **🐛 Issues**: [Open an issue on GitHub](https://github.com/youlyank/Corebase/issues)
- **💬 Discussions**: [Join our GitHub Discussions](https://github.com/youlyank/Corebase/discussions)
- **📧 Email**: support@corebase.dev

## 🙏 Acknowledgments

- **Next.js Team** - Excellent framework foundation
- **Prisma Team** - Modern database toolkit
- **Docker Team** - Containerization technology
- **Socket.IO Team** - Real-time communication
- **shadcn/ui** - Beautiful UI components
- **ZAI SDK** - AI integration capabilities

---

<div align="center">

**🚀 Transform your development workflow with AI-powered CoreBase!**

[![GitHub stars](https://img.shields.io/github/stars/youlyank/Corebase?style=social)](https://github.com/youlyank/Corebase/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/youlyank/Corebase?style=social)](https://github.com/youlyank/Corebase/network)
[![GitHub issues](https://img.shields.io/github/issues/youlyank/Corebase)](https://github.com/youlyank/Corebase/issues)

Made with ❤️ and 🤖 by the CoreBase Team

</div>