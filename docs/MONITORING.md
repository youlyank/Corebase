# CoreBase IDE Monitoring System

## Overview

The CoreBase IDE platform includes a comprehensive monitoring system built with Prometheus metrics collection and real-time health checks. This system provides visibility into system performance, application health, and containerized development environments.

## Architecture

### Components

1. **Prometheus Metrics Collector** (`src/lib/monitoring/prometheus-collector.ts`)
   - Collects system, application, and container metrics
   - Exposes metrics in Prometheus format
   - Provides real-time metric updates

2. **Health Check API** (`/api/monitoring/health`)
   - System health status endpoint
   - Resource usage monitoring
   - Service availability checks

3. **Metrics API** (`/api/monitoring/metrics`)
   - Prometheus-compatible metrics endpoint
   - Comprehensive metric collection
   - Real-time data exposure

4. **Monitoring Dashboard** (`src/components/monitoring/MonitoringDashboard.tsx`)
   - Real-time UI for system monitoring
   - Interactive charts and status indicators
   - Auto-refresh functionality

## Metrics Collected

### System Metrics

- **CPU Usage**: Percentage CPU utilization and load averages
- **Memory Usage**: Used, free, cached, and buffer memory
- **Disk Usage**: Total, used, and free disk space
- **Network I/O**: Bytes and packets transferred

### Application Metrics

- **Active Users**: Currently authenticated users
- **Active Projects**: Running development projects
- **Active Containers**: Containerized environments
- **Collaboration Sessions**: Active real-time collaboration
- **HTTP Requests**: Total requests and response times
- **Error Rate**: Application error percentage
- **File Operations**: File system operations count
- **Terminal Commands**: Executed command count

### Container Metrics

- **Container CPU Usage**: Per-container CPU utilization
- **Container Memory Usage**: Memory consumption per container
- **Container Network I/O**: Network transfer per container
- **Container Disk I/O**: Disk operations per container
- **Container Uptime**: Running time per container

## API Endpoints

### Health Check

**Endpoint**: `GET /api/monitoring/health`

**Response**:
```json
{
  "status": "healthy|unhealthy|degraded",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600.123,
  "version": "1.0.0",
  "checks": {
    "database": "healthy|unhealthy",
    "memory": "healthy|warning|critical",
    "cpu": "healthy|warning|critical",
    "disk": "healthy|warning|critical"
  },
  "metrics": {
    "memoryUsage": 65.2,
    "cpuUsage": 23.8,
    "diskUsage": 45.1,
    "activeConnections": 42,
    "responseTime": 120
  }
}
```

### Prometheus Metrics

**Endpoint**: `GET /api/monitoring/metrics`

**Response**: Prometheus-compatible text format

```
# HELP corebase_http_requests_total Total number of HTTP requests
# TYPE corebase_http_requests_total counter
corebase_http_requests_total{method="GET",route="/api/health",status_code="200",user_id="anonymous"} 1234

# HELP corebase_system_cpu_usage_percent System CPU usage percentage
# TYPE corebase_system_cpu_usage_percent gauge
corebase_system_cpu_usage_percent{core="0"} 23.5

# HELP corebase_active_users_total Number of active users
# TYPE corebase_active_users_total gauge
corebase_active_users_total 42
```

## Dashboard Features

### Real-time Monitoring

- **Auto-refresh**: Configurable automatic data refresh
- **Status Indicators**: Visual health status with color coding
- **Progress Bars**: Resource usage visualization
- **Live Metrics**: Real-time metric updates

### System Health

- **Overall Status**: System-wide health indicator
- **Component Health**: Individual service status
- **Resource Monitoring**: CPU, memory, disk usage
- **Response Times**: API performance metrics

### Interactive Features

- **Manual Refresh**: On-demand data updates
- **Tabbed Interface**: Organized metric categories
- **Responsive Design**: Mobile-friendly layout
- **Error Handling**: Graceful error display and retry

## Configuration

### Environment Variables

```bash
# Monitoring configuration
MONITORING_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
```

### Metric Collection Intervals

- **System Metrics**: 30 seconds
- **Application Metrics**: 10 seconds
- **Container Metrics**: 5 seconds

## Health Status Thresholds

### Memory Usage

- **Healthy**: < 75%
- **Warning**: 75-90%
- **Critical**: > 90%

### CPU Usage

- **Healthy**: < 75%
- **Warning**: 75-90%
- **Critical**: > 90%

### Disk Usage

- **Healthy**: < 75%
- **Warning**: 75-90%
- **Critical**: > 90%

## Integration with External Systems

### Prometheus

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'corebase-ide'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/monitoring/metrics'
    scrape_interval: 30s
```

### Grafana

Import the provided Grafana dashboard configuration for visualization:

- System Overview Dashboard
- Application Performance Dashboard
- Container Monitoring Dashboard

## Alerting

### Recommended Alerts

```yaml
groups:
  - name: corebase-ide
    rules:
      - alert: HighMemoryUsage
        expr: corebase_system_memory_usage_percent > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage detected"
          
      - alert: HighCPUUsage
        expr: corebase_system_cpu_usage_percent > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High CPU usage detected"
          
      - alert: ServiceDown
        expr: up{job="corebase-ide"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "CoreBase IDE service is down"
```

## Troubleshooting

### Common Issues

1. **Metrics Not Updating**
   - Check if the metrics collector is initialized
   - Verify API endpoints are accessible
   - Review browser console for errors

2. **Health Check Failing**
   - Check system resource availability
   - Verify database connectivity
   - Review application logs

3. **Dashboard Not Loading**
   - Ensure all dependencies are installed
   - Check API endpoint responses
   - Verify network connectivity

### Debug Commands

```bash
# Check health endpoint
curl http://localhost:3000/api/monitoring/health

# Check metrics endpoint
curl http://localhost:3000/api/monitoring/metrics

# View system logs
npm run logs

# Check application status
npm run status
```

## Performance Considerations

### Metric Collection Impact

- Minimal performance overhead (< 1% CPU)
- Efficient memory usage patterns
- Asynchronous metric collection
- Configurable collection intervals

### Scalability

- Horizontal scaling support
- Load balancer compatibility
- Distributed metric aggregation
- High availability deployment

## Security

### Access Control

- API endpoint authentication
- Role-based access control
- Rate limiting on metrics endpoints
- Secure metric transmission

### Data Privacy

- No sensitive data in metrics
- Anonymized user tracking
- Configurable data retention
- GDPR compliance

## Future Enhancements

### Planned Features

- Custom metric definitions
- Advanced alerting rules
- Historical data analysis
- Performance trend analysis
- Automated scaling recommendations

### Integration Roadmap

- Kubernetes monitoring
- Cloud provider metrics
- Third-party service monitoring
- Advanced visualization options
- Machine learning-based anomaly detection

## Support

For monitoring-related issues:

1. Check the troubleshooting section
2. Review application logs
3. Verify system requirements
4. Contact support with diagnostic information

## Contributing

When contributing to the monitoring system:

1. Follow the existing code patterns
2. Add appropriate tests
3. Update documentation
4. Consider performance impact
5. Ensure backward compatibility