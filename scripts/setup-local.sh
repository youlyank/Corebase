#!/bin/bash

# CoreBase Local Development Setup Script
echo "🚀 Setting up CoreBase for local development..."

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not installed."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required but not installed."
        exit 1
    fi
    
    echo "✅ Requirements check passed"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
}

# Setup environment
setup_environment() {
    echo "🔧 Setting up environment..."
    
    if [ ! -f .env ]; then
        echo "⚠️  .env file not found. Creating from template..."
        cat > .env << EOF
# Database (SQLite for local development)
DATABASE_URL="file:./dev.db"

# Redis (optional for local development)
REDIS_URL="redis://localhost:6379"

# MinIO (optional for local development)
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
MINIO_ENDPOINT=localhost:9000
MINIO_USE_SSL=false
MINIO_REGION=us-east-1

# JWT
JWT_SECRET="local_dev_secret_change_in_production"
JWT_REFRESH_SECRET="local_dev_refresh_secret_change_in_production"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="local_nextauth_secret_change_in_production"

# API
API_BASE_URL="http://localhost:3000/api"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"

# WebSocket
WEBSOCKET_PORT=3001

# Development
NODE_ENV="development"
EOF
        echo "✅ .env file created"
    else
        echo "✅ .env file already exists"
    fi
}

# Setup database
setup_database() {
    echo "🗄️  Setting up database..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Push database schema
    npx prisma db push
    
    # Seed database
    if [ -f prisma/seed.ts ]; then
        npx tsx prisma/seed.ts
        echo "✅ Database seeded"
    else
        echo "⚠️  No seed file found"
    fi
    
    echo "✅ Database setup complete"
}

# Create necessary directories
create_directories() {
    echo "📁 Creating directories..."
    mkdir -p uploads
    mkdir -p logs
    echo "✅ Directories created"
}

# Main setup function
main() {
    echo "🎯 CoreBase Local Development Setup"
    echo "=================================="
    
    check_requirements
    install_dependencies
    setup_environment
    setup_database
    create_directories
    
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Run 'npm run dev' to start the development server"
    echo "   2. Visit http://localhost:3000 to access the application"
    echo "   3. Check the API documentation at http://localhost:3000/api/docs"
    echo ""
    echo "🔍 Service endpoints:"
    echo "   • Main app: http://localhost:3000"
    echo "   • API: http://localhost:3000/api"
    echo "   • Health check: http://localhost:3000/api/health"
    echo "   • Metrics: http://localhost:3000/api/metrics"
    echo ""
    echo "📚 For production deployment, see DEPLOYMENT.md"
}

# Run the setup
main "$@"