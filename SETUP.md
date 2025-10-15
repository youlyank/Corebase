# CoreBase Platform - Setup Guide

## 🚀 Quick Start

This guide provides all necessary keys and configuration to run CoreBase in a new window.

## 📋 Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Git

## 🔑 Environment Configuration

Create a `.env` file in the project root with the following configuration:

```bash
# ===========================================
# COREBASE PLATFORM - ENVIRONMENT VARIABLES
# ===========================================

# Database (SQLite for local development)
DATABASE_URL="file:./dev.db"

# Redis (for caching and sessions)
REDIS_URL="redis://redis:6379"

# MinIO (S3-compatible storage)
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
MINIO_ENDPOINT=minio:9000
MINIO_USE_SSL=false
MINIO_REGION=us-east-1

# ===========================================
# SECURITY KEYS (IMPORTANT - CHANGE IN PRODUCTION)
# ===========================================

# JWT Secrets - Generate new ones for production!
JWT_SECRET="replace_with_long_random_string_please_change_this_in_production"
JWT_REFRESH_SECRET="replace_with_another_long_random_string_for_refresh_tokens"

# NextAuth Secret
NEXTAUTH_SECRET="nextauth_secret_please_change_in_production"
NEXTAUTH_URL="http://localhost:3000"

# ===========================================
# OAUTH PROVIDERS (Optional - Configure for real auth)
# ===========================================
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================

# API Configuration
API_BASE_URL="http://localhost:3000/api"

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"

# WebSocket Configuration
WEBSOCKET_PORT=3001

# Monitoring Ports
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000

# Environment
NODE_ENV="development"
```

## 🔐 Security Keys Generation

### Generate JWT Secrets
```bash
# Generate JWT Secret (256 bits)
openssl rand -base64 32

# Generate Refresh Token Secret
openssl rand -base64 32

# Generate NextAuth Secret
openssl rand -base64 32
```

### Example Generated Keys
```bash
JWT_SECRET="xJ4kL8mN2pQ5rS7tV1wY3zA6bC9dE2fG5hI8jK1lM4oP7qR0sU3vX6yZ9aB2cE"
JWT_REFRESH_SECRET="nH3gF6jK9mP2qR5tV8wY1zA4bC7dE0fG3hI6jK9lM2oP5qR8sU1vX4yZ7aB0cD"
NEXTAUTH_SECRET="pL2oR5tV8wY1zA4bC7dE0fG3hI6jK9mP2qR5tV8wY1zA4bC7dE0fG3hI6jK9lM"
```

## 🛠️ Installation Steps

### 1. Clone and Install
```bash
git clone <repository-url>
cd corebase
npm install
```

### 2. Database Setup
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

### 3. Start Services
```bash
# Start development server
npm run dev

# Or for production
npm run build
npm run start
```

## 🐳 Docker Services (Optional)

If using Docker for Redis and MinIO:

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  minio_data:
```

Start Docker services:
```bash
docker-compose up -d
```

## 🔧 Development Configuration

### Port Mapping
- **Main Application**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3001
- **Redis**: localhost:6379
- **MinIO Console**: http://localhost:9001

### Database Files
- **SQLite Database**: `./dev.db`
- **Prisma Schema**: `./prisma/schema.prisma`

## 🌐 OAuth Setup (Optional)

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

## 📊 Monitoring Setup

### Prometheus Metrics
- Access: http://localhost:9090
- Metrics endpoint: http://localhost:3000/api/metrics

### Application Logs
- Development logs: `./dev.log`
- Production logs: `./server.log`

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   npm run db:push
   ```

2. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

3. **Redis Connection Failed**
   ```bash
   # Start Redis with Docker
   docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **Permission Issues**
   ```bash
   # Fix file permissions
   chmod -R 755 .
   ```

## 🚀 Production Deployment

### Environment Changes for Production
```bash
# Change these values in production
NODE_ENV="production"
JWT_SECRET="your_production_jwt_secret"
JWT_REFRESH_SECRET="your_production_refresh_secret"
NEXTAUTH_SECRET="your_production_nextauth_secret"
DATABASE_URL="your_production_database_url"
REDIS_URL="your_production_redis_url"
```

### Security Checklist
- [ ] Change all JWT secrets
- [ ] Configure HTTPS
- [ ] Set up real database (PostgreSQL/MySQL)
- [ ] Configure Redis cluster
- [ ] Set up monitoring and alerting
- [ ] Enable audit logging
- [ ] Configure backup strategy

## 📚 API Documentation

Once running, access:
- **API Docs**: http://localhost:3000/api/docs
- **Runtime API**: http://localhost:3000/api/runtime/docs
- **WebSocket Test**: http://localhost:3000/test/websocket

## 🆘 Support

If you encounter issues:
1. Check the logs: `tail -f dev.log`
2. Verify environment variables
3. Ensure all services are running
4. Check network connectivity

---

**🎉 CoreBase is now ready to use!**

Visit http://localhost:3000 to access your container orchestration platform.