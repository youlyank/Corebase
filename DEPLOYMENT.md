# CoreBase Deployment Guide

## 🚀 Production Deployment

This guide covers deploying CoreBase to production environments using Docker Compose or Kubernetes.

## 📋 Prerequisites

- **Docker** & **Docker Compose** (for containerized deployment)
- **Node.js 18+** & **npm** (for local development)
- **PostgreSQL** (production database)
- **Redis** (caching & sessions)
- **MinIO** or **S3** (file storage)
- **SSL Certificate** (for HTTPS)

## 🐳 Docker Compose Deployment (Recommended)

### 1. Environment Setup

Create a production `.env` file:

```bash
# Database
DATABASE_URL="postgresql://corebase:secure_password@postgres:5432/corebase"

# Redis
REDIS_URL="redis://redis:6379"

# MinIO Storage
MINIO_ROOT_USER="your_minio_user"
MINIO_ROOT_PASSWORD="secure_minio_password"
MINIO_ENDPOINT="minio:9000"
MINIO_USE_SSL=false
MINIO_REGION="us-east-1"

# JWT Secrets (CHANGE THESE!)
JWT_SECRET="your_256_bit_jwt_secret_minimum"
JWT_REFRESH_SECRET="your_256_bit_refresh_secret_minimum"

# OAuth (Optional - get from providers)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# Next.js
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your_nextauth_secret_minimum_32_characters"

# Production
NODE_ENV="production"
```

### 2. Start Services

```bash
# Start all services
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f app
```

### 3. Database Setup

```bash
# Generate Prisma client
docker compose exec app npx prisma generate

# Push database schema
docker compose exec app npx prisma db push

# Seed initial data (optional)
docker compose exec app npx tsx prisma/seed.ts
```

### 4. Verify Deployment

Check that all services are running:

- **Main App**: `https://yourdomain.com`
- **API Health**: `https://yourdomain.com/api/health`
- **MinIO Console**: `https://yourdomain.com:9001`
- **Prometheus**: `https://yourdomain.com:9090`
- **Grafana**: `https://yourdomain.com:3001`

## ☁️ Cloud Deployment Options

### AWS Deployment

#### 1. ECS (Elastic Container Service)

```yaml
# task-definition.json
{
  "family": "corebase",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "corebase-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/corebase:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:corebase/db-url"
        }
      ]
    }
  ]
}
```

#### 2. RDS + ElastiCache + S3

```bash
# AWS CLI setup
aws rds create-db-instance \
  --db-instance-identifier corebase-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username corebase \
  --master-user-password secure_password \
  --allocated-storage 20

aws elasticache create-cache-cluster \
  --cache-cluster-id corebase-redis \
  --cache-node-type cache.t3.micro \
  --engine redis

aws s3 mb s3://your-corebase-bucket
```

### Google Cloud Platform

#### Cloud Run Deployment

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT-ID/corebase

# Deploy to Cloud Run
gcloud run deploy corebase \
  --image gcr.io/PROJECT-ID/corebase \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=corebase-db-url:latest
```

### Azure Container Instances

```bash
# Create container instance
az container create \
  --resource-group corebase-rg \
  --name corebase-app \
  --image your-registry.azurecr.io/corebase:latest \
  --cpu 1 \
  --memory 2 \
  --ports 3000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables DATABASE_URL=$DATABASE_URL
```

## 🔧 Configuration Management

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (256-bit) |
| `NEXTAUTH_SECRET` | ✅ | NextAuth.js secret |
| `MINIO_ROOT_USER` | ✅ | MinIO access key |
| `MINIO_ROOT_PASSWORD` | ✅ | MinIO secret key |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GITHUB_CLIENT_ID` | ❌ | GitHub OAuth client ID |

### SSL/TLS Setup

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring & Observability

### Prometheus Metrics

Access metrics at: `/api/metrics`

Key metrics to monitor:
- `http_requests_total` - HTTP request count
- `active_connections` - WebSocket connections
- `database_connections` - DB connection pool
- `storage_usage_bytes` - File storage usage

### Grafana Dashboards

1. Access Grafana: `http://localhost:3001`
2. Login with admin/admin
3. Import dashboard from `monitoring/grafana/dashboards/`

### Logging

```bash
# View application logs
docker compose logs -f app

# View specific service logs
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f minio
```

## 🔒 Security Best Practices

### 1. Secrets Management

```bash
# Use Docker secrets (recommended)
echo "your_jwt_secret" | docker secret create jwt_secret -

# Or use environment files
docker compose --env-file .env.prod up -d
```

### 2. Network Security

```yaml
# docker-compose.prod.yml
networks:
  corebase-internal:
    driver: bridge
    internal: true
  corebase-external:
    driver: bridge

services:
  app:
    networks:
      - corebase-internal
      - corebase-external
  
  postgres:
    networks:
      - corebase-internal
    # No external access
```

### 3. Rate Limiting

Configure in `nginx/nginx.conf`:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
```

## 🚦 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy CoreBase

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          docker build -t corebase:latest .
          docker push ${{ secrets.REGISTRY_URL }}/corebase:latest
          # Deploy commands...
```

## 🔄 Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="corebase_backup_$DATE.sql"

docker compose exec -T postgres pg_dump -U corebase corebase > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# Clean up old backups (keep 7 days)
find . -name "corebase_backup_*.sql" -mtime +7 -delete
```

### File Storage Backup

```bash
# MinIO backup
mc mirror minio/corebase-files/ /backup/corebase-files/

# Or sync to S3
aws s3 sync s3://corebase-files/ s3://backup-corebase-files/
```

## 🎯 Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 2. Redis Caching

```javascript
// Cache strategy example
const cacheKey = `user:${userId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const user = await db.user.findUnique({ where: { id: userId } });
await redis.setex(cacheKey, 300, JSON.stringify(user)); // 5 minutes
```

### 3. CDN Configuration

```nginx
# Static asset caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
  add_header X-CDN-Cache "HIT";
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   docker compose exec postgres pg_isready -U corebase
   
   # Check connection string
   docker compose logs app | grep -i database
   ```

2. **Redis Connection Failed**
   ```bash
   # Test Redis connection
   docker compose exec redis redis-cli ping
   ```

3. **MinIO Connection Failed**
   ```bash
   # Check MinIO status
   curl http://localhost:9000/minio/health/live
   
   # Check credentials
   docker compose exec minio mc admin info local
   ```

4. **High Memory Usage**
   ```bash
   # Monitor container resources
   docker stats
   
   # Check Node.js heap
   docker compose exec app node --inspect=0.0.0.0:9229
   ```

### Health Checks

```bash
# Application health
curl https://yourdomain.com/api/health

# Database health
docker compose exec postgres pg_isready

# Redis health
docker compose exec redis redis-cli ping

# MinIO health
curl http://localhost:9000/minio/health/live
```

## 📞 Support

For deployment issues:

1. Check logs: `docker compose logs -f`
2. Verify environment variables
3. Check network connectivity
4. Review resource usage
5. Consult the troubleshooting guide above

---

**Note**: This deployment guide assumes you have Docker and Docker Compose installed. For alternative deployment methods, refer to the Cloud Deployment sections.