#!/bin/bash

# CoreBase Platform - Quick Setup Script
# This script generates all necessary keys and configures the environment

echo "🚀 CoreBase Platform - Quick Setup"
echo "=================================="

# Check if .env file exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Generate secure random keys
echo "🔐 Generating secure keys..."

JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > .env << EOF
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
# SECURITY KEYS (AUTO-GENERATED)
# ===========================================

# JWT Secrets
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"

# NextAuth Secret
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
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
EOF

echo "✅ Environment file created successfully!"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup database
echo "🗄️  Setting up database..."
npm run db:generate
npm run db:push

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads
mkdir -p logs

echo "✅ Setup complete!"
echo ""
echo "🎉 CoreBase Platform is ready to run!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the development server: npm run dev"
echo "2. Open http://localhost:3000 in your browser"
echo "3. Create your first account and start building!"
echo ""
echo "🔑 Your generated secrets:"
echo "JWT_SECRET: ${JWT_SECRET}"
echo "JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}"
echo "NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}"
echo ""
echo "⚠️  Save these secrets securely for production use!"
echo ""
echo "📚 For more information, see SETUP.md"