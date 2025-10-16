/**
 * Stop Project API
 * Stops a project's container runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedRuntimeService } from '@/lib/runtime/advanced-runtime-service';
import { verifyJWT } from '@/lib/auth/jwt';

export async function POST(
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

    await advancedRuntimeService.stopProject(params.projectId, payload.userId);

    return NextResponse.json({
      success: true,
      message: 'Project stopped successfully'
    });

  } catch (error) {
    console.error('Failed to stop project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop project' },
      { status: 500 }
    );
  }
}