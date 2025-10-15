/**
 * Runtime Stats API
 * Provides runtime system statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedRuntimeService } from '@/lib/runtime/advanced-runtime-service';
import { verifyJWT } from '@/lib/auth/jwt';

// GET /api/runtime/v2/stats - Get runtime statistics
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const stats = advancedRuntimeService.getRuntimeStats();
    const userProjects = advancedRuntimeService.getUserProjects(payload.userId);

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        userProjects: userProjects.length,
        userRunningProjects: userProjects.filter(p => p.status === 'running').length
      }
    });

  } catch (error) {
    console.error('Failed to get runtime stats:', error);
    return NextResponse.json(
      { error: 'Failed to get runtime stats' },
      { status: 500 }
    );
  }
}