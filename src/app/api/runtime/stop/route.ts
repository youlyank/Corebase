import { NextRequest, NextResponse } from 'next/server';
import { runtimeService } from '@/lib/runtime/runtime-service';
import { authenticateToken, rateLimit } from '@/lib/auth/middleware';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 20, 60); // 20 requests per minute
    if (rateLimitResult) return rateLimitResult;

    // Authenticate user
    const authResult = await authenticateToken(request);
    if (authResult) return authResult;

    const user = (request as any).user;
    const body = await request.json();
    const { containerId } = body;

    if (!containerId) {
      return NextResponse.json(
        { error: 'Missing containerId' },
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

    // Stop container
    await runtimeService.stopContainer(containerId, user.id);

    return NextResponse.json({
      success: true,
      message: 'Container stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping container:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stop container' },
      { status: 500 }
    );
  }
}