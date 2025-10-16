# 🚀 CoreBase Platform - GitHub Repository Setup

## 📋 Repository Information

**Repository**: https://github.com/youlyank/Corebase.git  
**Branch**: `master`  
**Status**: Production Ready

---

## 🔑 JWT Secret Key Setup

### Method 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/youlyank/Corebase.git
cd Corebase

# Run the automated setup script
chmod +x setup.sh
./setup.sh
```

The setup script will automatically:
- Generate secure JWT secrets
- Create .env file with all configuration
- Install dependencies
- Setup database
- Start the platform

### Method 2: Manual JWT Secret Generation

```bash
# Generate secure JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > .env << EOF
# Database
DATABASE_URL="file:./dev.db"

# Redis
REDIS_URL="redis://redis:6379"

# JWT Secrets (NEWLY GENERATED)
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"

# NextAuth
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="http://localhost:3000"

# MinIO Storage
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
MINIO_ENDPOINT=minio:9000
MINIO_USE_SSL=false
MINIO_REGION=us-east-1

# API Configuration
API_BASE_URL="http://localhost:3000/api"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"

# WebSocket
WEBSOCKET_PORT=3001

# Environment
NODE_ENV="development"
EOF

echo "✅ JWT secrets generated and .env file created"
echo "🔑 Your JWT_SECRET: ${JWT_SECRET}"
echo "🔑 Your JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}"
echo "🔑 Your NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}"
```

### Method 3: Online JWT Secret Generator

Visit https://jwt-secret-generator.vercel.app/ to generate secure secrets online, then update your `.env` file:

```bash
# .env file
JWT_SECRET="your_generated_jwt_secret_here"
JWT_REFRESH_SECRET="your_generated_refresh_secret_here"
NEXTAUTH_SECRET="your_generated_nextauth_secret_here"
```

---

## 🗄️ Database Setup Instructions

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

# 3. Create user
sudo -u postgres createuser --interactive

# 4. Update .env with PostgreSQL URL
DATABASE_URL="postgresql://username:password@localhost:5432/corebase"

# 5. Generate and push schema
npm run db:generate
npm run db:push
```

### Database Schema Overview

The platform includes these core models:

```sql
-- User Management
users, sessions, api_keys, audit_logs

-- Project Management  
projects, database_tables

-- Container Runtime
containers, container_templates, runtime_metrics, user_quotas

-- File Storage
files

-- Authentication
auth_providers
```

---

## 🚀 Complete Setup Process

### Step 1: Clone Repository
```bash
git clone https://github.com/youlyank/Corebase.git
cd Corebase
```

### Step 2: Environment Setup
```bash
# Option A: Automated (Recommended)
./setup.sh

# Option B: Manual
cp .env.example .env
# Edit .env with your JWT secrets
```

### Step 3: Database Setup
```bash
npm run db:generate
npm run db:push
```

### Step 4: Start Platform
```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

### Step 5: Access Platform
- **Main App**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **WebSocket**: ws://localhost:3000/api/socketio

---

## 🔐 Security Configuration

### JWT Token Configuration

```javascript
// JWT Settings (src/lib/auth/jwt.ts)
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  expiresIn: '15m',
  refreshExpiresIn: '7d'
};
```

### OAuth Provider Setup

```bash
# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# GitHub OAuth (Optional)  
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

---

## 🐳 Docker Deployment

### Development with Docker
```bash
# Start services
docker-compose up -d

# Setup database
docker-compose exec app npm run db:push

# Access application
http://localhost:3000
```

### Production Docker Build
```bash
# Build image
docker build -t corebase .

# Run container
docker run -p 3000:3000 --env-file .env corebase
```

---

## 📊 Platform Features

### Container Management
- ✅ Docker integration
- ✅ Lifecycle management
- ✅ Resource monitoring
- ✅ Security isolation

### Real-time Features
- ✅ WebSocket communication
- ✅ Live database events
- ✅ Container status updates
- ✅ Collaborative editing

### Enterprise Features
- ✅ User authentication
- ✅ Role-based access
- ✅ Audit logging
- ✅ Resource quotas

---

## 🛠️ Development Commands

```bash
# Development
npm run dev          # Start development server
npm run lint         # Run ESLint
npm run db:push      # Push database schema
npm run db:generate  # Generate Prisma client

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run migrations
npm run db:reset     # Reset database
npm run db:seed      # Seed sample data
```

---

## 📚 Documentation Files

- **SETUP.md** - Complete setup guide
- **KEYS.md** - JWT secret reference
- **README-SETUP.md** - Quick start guide
- **DEPLOYMENT.md** - Production deployment
- **PHASE-1-COMPLETE.md** - Project summary

---

## 🆘 Troubleshooting

### Common Issues

1. **JWT Secret Error**
   ```bash
   # Generate new secrets
   openssl rand -base64 32
   ```

2. **Database Connection Error**
   ```bash
   # Reset database
   npm run db:push --force-reset
   ```

3. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

4. **Permission Issues**
   ```bash
   # Fix permissions
   chmod +x setup.sh
   ```

---

## 🎉 Success Indicators

✅ **Platform Running**: http://localhost:3000  
✅ **API Working**: http://localhost:3000/api/health  
✅ **WebSocket Connected**: ws://localhost:3000/api/socketio  
✅ **Database Connected**: Prisma client active  
✅ **JWT Authentication**: Login system functional  

---

**🚀 Your CoreBase Platform is now ready for development and production!**

For support, open an issue at: https://github.com/youlyank/Corebase/issues