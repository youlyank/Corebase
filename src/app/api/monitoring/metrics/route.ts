import { NextRequest, NextResponse } from 'next/server';
import { getMetricsCollector } from '@/lib/monitoring/prometheus-collector';
import { register } from 'prom-client';

export async function GET(request: NextRequest) {
  try {
    // Get the metrics collector instance
    const collector = getMetricsCollector();
    
    // Update metrics before returning them
    await collector.updateSystemMetrics();
    await collector.updateApplicationMetrics();
    
    // Get the metrics in Prometheus format
    const metrics = await register.metrics();
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}