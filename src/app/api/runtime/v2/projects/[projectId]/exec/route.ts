/**
 * Execute Command API
 * Executes commands in project containers
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

    const body = await request.json();
    const { command, workingDir, environment, timeout } = body;

    if (!command || !Array.isArray(command)) {
      return NextResponse.json(
        { error: 'Command array is required' },
        { status: 400 }
      );
    }

    const result = await advancedRuntimeService.executeCommand(
      params.projectId,
      payload.userId,
      command,
      { workingDir, environment, timeout }
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Failed to execute command:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute command' },
      { status: 500 }
    );
  }
}