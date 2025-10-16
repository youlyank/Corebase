import { NextRequest, NextResponse } from 'next/server';
import { runtimeService } from '@/lib/runtime/runtime-service';
import { authenticateToken, rateLimit } from '@/lib/auth/middleware';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 30, 60); // 30 requests per minute
    if (rateLimitResult) return rateLimitResult;

    // Authenticate user
    const authResult = await authenticateToken(request);
    if (authResult) return authResult;

    const user = (request as any).user;
    const { searchParams } = new URL(request.url);
    
    const containerId = searchParams.get('containerId');

    if (!containerId) {
      return NextResponse.json(
        { error: 'Missing containerId parameter' },
        { status: 400 }
      );
    }

    // Verify container ownership
    const container = await db.container.findFirst({
      where: {
        id: containerId,
        userId: user.id
      }
    });

    if (!container) {
      return NextResponse.json(
        { error: 'Container not found or access denied' },
        { status: 404 }
      );
    }

    // Get container stats
    const stats = await runtimeService.getContainerStats(containerId);

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to get container stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        containerId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting container stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get container stats' },
      { status: 500 }
    );
  }
}