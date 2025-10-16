/**
 * Project Logs API
 * Retrieves logs from project containers
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedRuntimeService } from '@/lib/runtime/advanced-runtime-service';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tail = parseInt(searchParams.get('tail') || '100');

    const logs = await advancedRuntimeService.getProjectLogs(
      params.projectId,
      payload.userId,
      tail
    );

    return NextResponse.json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('Failed to get project logs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get project logs' },
      { status: 500 }
    );
  }
}