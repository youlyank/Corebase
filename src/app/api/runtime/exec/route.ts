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
    
    const { containerId, command, workingDir, user: execUser, timeout } = body;

    if (!containerId || !command || !Array.isArray(command)) {
      return NextResponse.json(
        { error: 'Missing required fields: containerId, command (array)' },
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

    // Execute command
    const result = await runtimeService.executeCommand(containerId, {
      command,
      workingDir,
      user: execUser,
      timeout: timeout || 30000, // 30 second default timeout
      attachStdout: true,
      attachStderr: true
    });

    return NextResponse.json({
      success: true,
      result: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        command,
        containerId
      }
    });

  } catch (error) {
    console.error('Error executing command:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute command' },
      { status: 500 }
    );
  }
}