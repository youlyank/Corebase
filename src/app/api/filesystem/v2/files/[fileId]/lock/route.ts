/**
 * File Lock API
 * Handles file locking and unlocking operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedFileSystem } from '@/lib/filesystem/advanced-filesystem';
import { verifyJWT } from '@/lib/auth/jwt';

// POST /api/filesystem/v2/files/[fileId]/lock - Lock file
export async function POST(
  request: NextRequest,
  { params }: { params: { fileId: string } }
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
    const { type = 'write' } = body;

    const lock = await advancedFileSystem.lockFile(
      params.fileId,
      payload.userId,
      type
    );

    return NextResponse.json({
      success: true,
      data: lock
    });

  } catch (error) {
    console.error('Failed to lock file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to lock file' },
      { status: 500 }
    );
  }
}

// DELETE /api/filesystem/v2/files/[fileId]/lock - Unlock file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
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

    await advancedFileSystem.unlockFile(params.fileId, payload.userId);

    return NextResponse.json({
      success: true,
      message: 'File unlocked successfully'
    });

  } catch (error) {
    console.error('Failed to unlock file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unlock file' },
      { status: 500 }
    );
  }
}