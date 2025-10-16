# 🚀 CoreBase Platform - Complete GitHub Repository

> **Production-Ready Container Orchestration Platform**  
> Fully functional code with complete setup instructions

## 🌐 Repository Information

**GitHub Repository**: https://github.com/youlyank/Corebase.git  
**Branch**: `main`  
**Status**: Production Ready  

---

## 🎯 Quick Start (3 Commands)

```bash
# 1. Clone the repository
git clone https://github.com/youlyank/Corebase.git
cd Corebase

# 2. Run automated setup (generates JWT secrets & database)
./setup.sh

# 3. Start the platform
npm run dev
```

**🎉 Access your platform at: http://localhost:3000**

---

## 🔑 JWT Secret Setup

### Automated Setup (Recommended)
```bash
./setup.sh
```
The script automatically generates secure JWT secrets and configures everything.

### Manual JWT Secret Generation
```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Add to .env file
cat > .env << EOF
DATABASE_URL="file:./dev.db"
REDIS_URL="redis://redis:6379"
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="http://localhost:3000"
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
MINIO_ENDPOINT=minio:9000
MINIO_USE_SSL=false
MINIO_REGION=us-east-1
API_BASE_URL="http://localhost:3000/api"
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
WEBSOCKET_PORT=3001
NODE_ENV="development"
EOF
```

---

## 🗄️ Database Setup

### SQLite (Development)
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Create database schema
```

### PostgreSQL (Production)
```bash
# Update .env with PostgreSQL URL
DATABASE_URL="postgresql://username:password@localhost:5432/corebase"

# Run setup
npm run db:generate
npm run db:push
```

### Database Schema
```sql
-- Core Models (11 total)
users                 # User management
sessions              # JWT sessions
api_keys              # API authentication
projects              # Project organization
database_tables       # Dynamic tables
files                 # File storage
audit_logs            # Activity tracking
containers            # Docker containers
container_templates   # Container templates
runtime_metrics       # Performance metrics
user_quotas           # Resource limits
```

---

## 📋 Complete File Structure

```
Corebase/
├── 📚 Documentation
│   ├── README.md                    # Main project README
│   ├── GITHUB-SETUP.md             # GitHub setup guide
│   ├── SETUP.md                    # Detailed setup instructions
│   ├── KEYS.md                     # JWT secret reference
│   ├── README-SETUP.md             # Quick start guide
│   ├── DEPLOYMENT.md               # Production deployment
│   ├── PHASE-1-COMPLETE.md         # Project summary
│   └── GITHUB-PUSH-INSTRUCTIONS.md # Push instructions
│
├── 🔧 Configuration
│   ├── .env                        # Environment variables
│   ├── package.json                # Dependencies & scripts
│   ├── setup.sh                    # Automated setup script
│   ├── push-to-github.sh           # GitHub push script
│   └── docker-compose.yml          # Docker services
│
├── 🗄️ Database
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Sample data
│   └── dev.db                     # SQLite database
│
├── 🐳 Container Runtime
│   ├── src/lib/runtime/           # Docker management
│   │   ├── runtime-service.ts     # Core runtime logic
│   │   ├── mock-runtime-service.ts # Mock service
│   │   ├── monitoring.ts          # Performance monitoring
│   │   ├── pool-manager.ts        # Container pooling
│   │   └── security.ts            # Security layer
│   └── src/app/api/runtime/       # Runtime API endpoints
│
├── 🔌 API Layer
│   ├── src/app/api/
│   │   ├── auth/                  # Authentication endpoints
│   │   ├── runtime/               # Container management
│   │   ├── storage/               # File operations
│   │   ├── database/              # Database operations
│   │   ├── users/                 # User management
│   │   └── realtime/              # WebSocket events
│   └── src/lib/
│       ├── auth/                  # JWT authentication
│       ├── storage/               # MinIO integration
│       └── realtime/              # WebSocket handling
│
├── 🎨 Frontend
│   ├── src/app/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── layout.tsx            # App layout
│   │   └── globals.css           # Global styles
│   └── src/components/
│       ├── ui/                   # shadcn/ui components
│       ├── auth/                 # Authentication UI
│       └── dashboard/            # Dashboard components
│
├── 🐳 Docker & Deployment
│   ├── Dockerfile                # Application container
│   ├── docker-compose.yml        # Multi-service setup
│   ├── nginx/                    # Reverse proxy
│   └── monitoring/               # Prometheus/Grafana
│
└── 📊 Monitoring
    ├── monitoring/
    │   ├── prometheus.yml        # Metrics config
    │   └── grafana/              # Dashboards
    └── scripts/                  # Utility scripts
```

---

## 🛠️ Development Commands

```bash
# Setup & Installation
npm install                 # Install dependencies
./setup.sh                 # Automated setup
npm run db:generate        # Generate Prisma client
npm run db:push           # Create database schema

# Development
npm run dev               # Start development server
npm run lint              # Run ESLint
npm run build             # Build for production

# Database Management
npm run db:reset          # Reset database
npm run db:seed           # Add sample data

# Production
npm run start             # Start production server
```

---

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Main Platform** | http://localhost:3000 | CoreBase Dashboard |
| **API Endpoints** | http://localhost:3000/api | REST API |
| **API Documentation** | http://localhost:3000/api/docs | Swagger Docs |
| **WebSocket** | ws://localhost:3000/api/socketio | Real-time Updates |
| **Health Check** | http://localhost:3000/api/health | System Status |

---

## 🔐 Security Configuration

### JWT Tokens
```bash
# Current development keys (CHANGE FOR PRODUCTION)
JWT_SECRET="replace_with_long_random_string_please_change_this_in_production"
JWT_REFRESH_SECRET="replace_with_another_long_random_string_for_refresh_tokens"
NEXTAUTH_SECRET="nextauth_secret_please_change_in_production"
```

### OAuth Providers (Optional)
```bash
# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
```

---

## 🐳 Docker Deployment

### Development with Docker
```bash
# Start all services
docker-compose up -d

# Setup database
docker-compose exec app npm run db:push

# View logs
docker-compose logs -f
```

### Production Docker
```bash
# Build image
docker build -t corebase .

# Run container
docker run -p 3000:3000 --env-file .env corebase
```

---

## 📊 Platform Features

### 🐳 Container Management
- ✅ Full Docker SDK integration
- ✅ Container lifecycle (start/stop/restart/delete)
- ✅ Resource monitoring (CPU/memory/network)
- ✅ Template system (Node.js, Python, PostgreSQL)
- ✅ Security isolation

### 🔄 Real-time Features
- ✅ WebSocket communication
- ✅ Live database events
- ✅ Container status updates
- ✅ Collaborative editing

### 🛡️ Enterprise Security
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Resource quotas
- ✅ API key management

### 📈 Monitoring & Analytics
- ✅ Real-time metrics
- ✅ Performance monitoring
- ✅ Usage analytics
- ✅ Alert system

---

## 🎯 Use Cases

### 🏢 Enterprise Teams
- Development environments for each team
- CI/CD integration
- Resource management and tracking
- Security and compliance

### 👥 Individual Developers
- Personal development cloud
- Project organization
- Learning environment
- Portfolio hosting

### 🎓 Educational Institutions
- Teaching platform
- Student project spaces
- Resource monitoring
- Collaborative coding

---

## 🆘 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Database connection error**
   ```bash
   npm run db:push --force-reset
   ```

3. **JWT secret error**
   ```bash
   ./setup.sh  # Regenerate secrets
   ```

4. **Permission denied on setup script**
   ```bash
   chmod +x setup.sh
   # or
   bash setup.sh
   ```

### Health Checks
```bash
# Check application health
curl http://localhost:3000/api/health

# Test database connection
npx prisma db pull

# Test Redis connection
redis-cli -u redis://localhost:6379 ping
```

---

## 📚 Additional Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[KEYS.md](./KEYS.md)** - JWT secret generation guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment
- **[PHASE-1-COMPLETE.md](./PHASE-1-COMPLETE.md)** - Project summary

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🎉 Success Indicators

✅ **Repository Cloned** - All files downloaded successfully  
✅ **Setup Script Run** - JWT secrets generated and .env created  
✅ **Database Setup** - Schema created and Prisma client generated  
✅ **Dependencies Installed** - All npm packages installed  
✅ **Platform Running** - Accessible at http://localhost:3000  
✅ **API Working** - All endpoints functional  
✅ **WebSocket Connected** - Real-time features active  

---

**🚀 Your CoreBase Platform is now fully operational!**

This repository contains everything needed to run a production-ready container orchestration platform with complete documentation, automated setup, and enterprise-grade features.

Made with ❤️ by the CoreBase Team