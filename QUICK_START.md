# 🚀 Quick Start Guide

> **Get CoreBase AI-Powered Development Suite running in 3 minutes**

## Prerequisites

- **Node.js** 18+ 
- **Git**
- **Docker** (optional, for container features)

## 1️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/youlyank/Corebase.git
cd Corebase

# Install dependencies
npm install
```

## 2️⃣ Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

## 3️⃣ Start Development

```bash
# Start the development server
npm run dev
```

**🎉 Your CoreBase platform is now running at http://localhost:3000**

## 🔑 Default Access

The platform starts with development credentials:

- **URL**: http://localhost:3000
- **No login required** for development mode

## 🤖 Test AI Features

1. **AI Code Completion**
   - Go to the "AI Completion" tab
   - Start typing JavaScript/TypeScript code
   - AI will suggest completions automatically

2. **Agentic Developer**
   - Go to the "AI Agent" tab
   - Enter a goal like: "Create a user login component"
   - Watch AI plan and execute the task

3. **Real-time Collaboration**
   - Go to the "Real-time Collab" tab
   - Share the room URL with others
   - Edit code together in real-time

## 🐳 Docker Quick Start

```bash
# Using Docker Compose (recommended)
npm run docker:dev

# Or manual Docker build
npm run docker:build
npm run docker:run
```

## 📚 Next Steps

- **[Full Documentation](./README.md)** - Complete feature overview
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment
- **[API Documentation](./docs/api-documentation.md)** - API reference
- **[Architecture](./docs/architecture.md)** - System architecture

## 🆘 Need Help?

- **📖 Documentation**: Check the `docs/` folder
- **🐛 Issues**: [Open an issue](https://github.com/youlyank/Corebase/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/youlyank/Corebase/discussions)

---

**🚀 Happy coding with AI-powered development!**