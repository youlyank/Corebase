# CoreBase Platform - Environment Keys Reference

## 🔑 Essential Keys for New Window Setup

### JWT Configuration
```bash
# Access Tokens (15 minutes expiry)
JWT_SECRET="your_jwt_secret_here"
JWT_EXPIRES_IN="15m"

# Refresh Tokens (7 days expiry)
JWT_REFRESH_SECRET="your_refresh_secret_here"
JWT_REFRESH_EXPIRES_IN="7d"
```

### Session Management
```bash
# NextAuth.js Session
NEXTAUTH_SECRET="your_nextauth_secret_here"
NEXTAUTH_URL="http://localhost:3000"
SESSION_MAX_AGE="86400"  # 24 hours
```

### Database Keys
```bash
# SQLite (Development)
DATABASE_URL="file:./dev.db"

# PostgreSQL (Production)
# DATABASE_URL="postgresql://user:password@localhost:5432/corebase"
```

### External Service Keys
```bash
# Redis Cache
REDIS_URL="redis://localhost:6379"

# MinIO Storage
MINIO_ROOT_USER="minio"
MINIO_ROOT_PASSWORD="minio123"
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
```

### OAuth Provider Keys
```bash
# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

### API Keys
```bash
# Z.AI SDK (for AI features)
Z_AI_API_KEY="your_z_ai_api_key"

# External APIs (if needed)
EXTERNAL_API_KEY="your_external_api_key"
```

## 🔐 Key Generation Commands

### JWT Secrets
```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Refresh Secret
openssl rand -base64 32

# Generate NextAuth Secret
openssl rand -base64 32
```

### MinIO Keys
```bash
# Generate Access Key
openssl rand -base64 16 | tr -d "=+/" | cut -c1-20

# Generate Secret Key
openssl rand -base64 32
```

## 🚀 Quick Start Commands

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your keys
nano .env
```

### 2. Database Setup
```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 3. Start Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 📋 Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Web App | 3000 | Main application |
| API | 3000 | REST API endpoints |
| WebSocket | 3001 | Real-time communication |
| Redis | 6379 | Caching layer |
| MinIO | 9000 | Object storage |
| MinIO Console | 9001 | Storage management |
| Prometheus | 9090 | Metrics collection |

## 🔍 Environment Validation

### Check Required Variables
```bash
# Verify all required env vars are set
node -e "
const required = ['DATABASE_URL', 'JWT_SECRET', 'NEXTAUTH_SECRET'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing environment variables:', missing);
  process.exit(1);
}
console.log('✅ All required environment variables are set');
"
```

### Test Database Connection
```bash
# Test database connection
npx prisma db pull --preview-feature
```

### Test Redis Connection
```bash
# Test Redis connection
redis-cli -u redis://localhost:6379 ping
```

## 🛡️ Security Best Practices

### Production Keys
1. **Never commit secrets to git**
2. **Use environment-specific keys**
3. **Rotate keys regularly**
4. **Use key management services**

### Key Storage
```bash
# Use .env.local for local development
# Use .env.production for production
# Use secret management services in cloud
```

### Example Production .env
```bash
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@host:5432/db"
REDIS_URL="redis://user:pass@host:6379"
JWT_SECRET="prod_jwt_secret_32_chars_long"
JWT_REFRESH_SECRET="prod_refresh_secret_32_chars"
NEXTAUTH_SECRET="prod_nextauth_secret_32_chars"
```

## 🆘 Troubleshooting

### Common Key Issues
1. **Invalid JWT format** - Ensure base64 encoded strings
2. **Database connection failed** - Check URL format
3. **Redis connection refused** - Verify Redis is running
4. **OAuth redirect errors** - Check callback URLs

### Debug Commands
```bash
# Check environment variables
env | grep -E "(JWT|DATABASE|REDIS|NEXTAUTH)"

# Test database schema
npx prisma db push --force-reset

# Clear Redis cache
redis-cli -u redis://localhost:6379 flushall
```

---

**🎯 Save this reference for quick setup in new windows!**