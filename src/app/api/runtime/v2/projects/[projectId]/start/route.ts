/**
 * Start Project API
 * Starts a project's container runtime
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

    const project = await advancedRuntimeService.startProject(
      params.projectId,
      payload.userId
    );

    return NextResponse.json({
      success: true,
      data: project
    });

  } catch (error) {
    console.error('Failed to start project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start project' },
      { status: 500 }
    );
  }
}