import { NextRequest, NextResponse } from 'next/server';
import { runtimeService } from '@/lib/runtime/runtime-service';
import { authenticateToken, rateLimit } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 50, 60); // 50 requests per minute
    if (rateLimitResult) return rateLimitResult;

    // Authenticate user
    const authResult = await authenticateToken(request);
    if (authResult) return authResult;

    const user = (request as any).user;
    const { searchParams } = new URL(request.url);
    
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    // Get user's containers
    let containers = await runtimeService.listUserContainers(user.id);

    // Filter by project if specified
    if (projectId) {
      containers = containers.filter(c => c.projectId === projectId);
    }

    // Filter by status if specified
    if (status) {
      containers = containers.filter(c => c.status === status);
    }

    return NextResponse.json({
      success: true,
      containers,
      total: containers.length,
      filters: { projectId, status }
    });

  } catch (error) {
    console.error('Error listing containers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list containers' },
      { status: 500 }
    );
  }
}