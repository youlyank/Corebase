/**
 * Move File API
 * Handles file/directory move and rename operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedFileSystem } from '@/lib/filesystem/advanced-filesystem';
import { verifyJWT } from '@/lib/auth/jwt';

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
    const { newParentId, newName } = body;

    const fileNode = await advancedFileSystem.moveFile(
      params.fileId,
      newParentId || null,
      newName,
      payload.userId
    );

    return NextResponse.json({
      success: true,
      data: fileNode
    });

  } catch (error) {
    console.error('Failed to move file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to move file' },
      { status: 500 }
    );
  }
}