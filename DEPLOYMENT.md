# 🚀 CoreBase Deployment Guide

> **Complete deployment instructions** for CoreBase AI-Powered Development Suite in production environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Configuration](#database-configuration)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Environment Variables](#environment-variables)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements
- **Node.js** 18.0.0 or higher
- **Docker** 20.10+ and Docker Compose
- **Git** 2.30+
- **4GB+ RAM** (8GB+ recommended for production)
- **20GB+ Storage** (50GB+ recommended for production)
- **SSL Certificate** (for HTTPS)

### Port Requirements
- **3000** - Main application
- **5432** - PostgreSQL (if using external database)
- **6379** - Redis (if using external Redis)
- **80/443** - HTTP/HTTPS (if using reverse proxy)

## 🌍 Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/youlyank/Corebase.git
cd Corebase
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate JWT Secrets
```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
NEXTAUTH_SECRET=$(openssl rand -base64 64)

# Create production .env file
cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production

# Security Secrets
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/corebase"

# AI Configuration
ZAI_API_KEY="your_zai_api_key_here"

# Application Settings
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Docker Configuration
DOCKER_HOST="unix:///var/run/docker.sock"

# Redis Configuration (Optional)
REDIS_URL="redis://localhost:6379"

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Logging
LOG_LEVEL="info"
LOG_FILE="/var/log/corebase/app.log"
EOF
```

## 🗄️ Database Configuration

### PostgreSQL Setup (Recommended for Production)

#### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2. Create Database
```bash
sudo -u postgres psql
CREATE DATABASE corebase;
CREATE USER corebase_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE corebase TO corebase_user;
\q
```

#### 3. Configure Database
```bash
# Update .env.production
DATABASE_URL="postgresql://corebase_user:secure_password@localhost:5432/corebase"
```

#### 4. Initialize Database
```bash
npm run db:generate
npm run db:push
npm run db:seed  # Optional: seed with sample data
```

### SQLite (Development/Small Scale)
```bash
# For development or small deployments
DATABASE_URL="file:./dev.db"
npm run db:generate
npm run db:push
```

## 🐳 Docker Deployment

### 1. Build Docker Image
```bash
docker build -t corebase:latest .
```

### 2. Docker Compose (Recommended)
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: corebase:latest
    container_name: corebase-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./logs:/var/log/corebase
      - ./uploads:/app/uploads
    depends_on:
      - postgres
      - redis
    networks:
      - corebase-network

  postgres:
    image: postgres:15-alpine
    container_name: corebase-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: corebase
      POSTGRES_USER: corebase_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - corebase-network

  redis:
    image: redis:7-alpine
    container_name: corebase-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - corebase-network

  nginx:
    image: nginx:alpine
    container_name: corebase-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    networks:
      - corebase-network

volumes:
  postgres_data:
  redis_data:

networks:
  corebase-network:
    driver: bridge
```

### 3. Deploy with Docker Compose
```bash
# Create necessary directories
mkdir -p logs nginx/ssl backups uploads

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. EC2 Setup
```bash
# Launch EC2 instance (t3.medium or larger)
# Ubuntu 22.04 LTS recommended

# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Deploy Application
```bash
# Clone repository
git clone https://github.com/youlyank/Corebase.git
cd Corebase

# Setup environment
cp .env.example .env.production
# Edit .env.production with your settings

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Configure Security Group
- Allow HTTP (80) and HTTPS (443) from 0.0.0.0/0
- Allow SSH (22) from your IP only
- Consider using Application Load Balancer for SSL termination

### Google Cloud Platform

#### 1. Create VM Instance
```bash
# Use gcloud CLI
gcloud compute instances create corebase-server \
    --machine-type=e2-medium \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --tags=http-server,https-server
```

#### 2. Setup Firewall Rules
```bash
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 --target-tags http-server

gcloud compute firewall-rules create allow-https \
    --allow tcp:443 --target-tags https-server
```

### DigitalOcean

#### 1. Create Droplet
- Ubuntu 22.04 LTS
- 4GB RAM, 2 CPU, 80GB SSD (minimum)
- Enable IPv6
- Add SSH keys

#### 2. One-Click Deploy
```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Docker and deploy
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

git clone https://github.com/youlyank/Corebase.git
cd Corebase
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Environment Variables

### Required Variables
```bash
# Environment
NODE_ENV=production

# Security (Generate these!)
JWT_SECRET="your-256-bit-secret"
JWT_REFRESH_SECRET="your-256-bit-secret"
NEXTAUTH_SECRET="your-256-bit-secret"

# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# URLs
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Optional Variables
```bash
# AI Configuration
ZAI_API_KEY="your_zai_api_key"

# Redis (for caching/sessions)
REDIS_URL="redis://localhost:6379"

# Docker
DOCKER_HOST="unix:///var/run/docker.sock"

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Logging
LOG_LEVEL="info"
LOG_FILE="/var/log/corebase/app.log"

# File Upload
MAX_FILE_SIZE="100MB"
UPLOAD_DIR="/app/uploads"
```

## 🔒 SSL/HTTPS Setup

### 1. Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Nginx Configuration
```nginx
# /etc/nginx/sites-available/corebase
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring & Logging

### 1. Application Monitoring
```bash
# Check application logs
docker-compose -f docker-compose.prod.yml logs -f app

# Check all services
docker-compose -f docker-compose.prod.yml ps
```

### 2. System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor resources
htop                    # CPU/Memory
iotop                   # Disk I/O
nethogs                 # Network usage
docker stats            # Container stats
```

### 3. Log Management
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/corebase

# Content:
/var/log/corebase/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f/path/to/docker-compose.prod.yml restart app
    endscript
}
```

## 🛡️ Security Considerations

### 1. System Security
```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

### 2. Application Security
```bash
# Use strong secrets (64+ characters)
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
NEXTAUTH_SECRET=$(openssl rand -base64 64)

# Regular backups
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker exec corebase-postgres pg_dump -U corebase_user corebase > /backups/corebase_$DATE.sql
find /backups -name "*.sql" -mtime +7 -delete
```

### 3. Network Security
- Use VPN for administrative access
- Implement rate limiting
- Regular security updates
- Monitor access logs
- Use Web Application Firewall (WAF)

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check database status
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker exec -it corebase-postgres psql -U corebase_user -d corebase

# Reset database
npm run db:reset
```

#### 2. Docker Socket Issues
```bash
# Check Docker daemon
sudo systemctl status docker

# Fix permissions
sudo usermod -aG docker $USER
sudo chmod 666 /var/run/docker.sock
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h
docker stats

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test nginx configuration
sudo nginx -t
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_containers_status ON containers(status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

#### 2. Application Optimization
```bash
# Enable caching
REDIS_URL="redis://localhost:6379"

# Optimize Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# Use PM2 for process management
npm install -g pm2
pm2 start npm --name "corebase" -- start
pm2 startup
pm2 save
```

## 📞 Support

For deployment issues:
- **📖 Documentation**: [Check our docs](./docs/)
- **🐛 Issues**: [Open an issue on GitHub](https://github.com/youlyank/Corebase/issues)
- **💬 Discussions**: [Join our GitHub Discussions](https://github.com/youlyank/Corebase/discussions)
- **📧 Email**: support@corebase.dev

---

**🚀 Your CoreBase platform is now ready for production!**