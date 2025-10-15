import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authMiddleware } from '@/lib/auth/middleware';

// PUT /api/storage/files/[fileId] - Update file
export async function PUT(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = params;
    const { content } = await request.json();

    const file = await db.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has permission to edit this file
    if (file.userId !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const updatedFile = await db.file.update({
      where: { id: fileId },
      data: {
        content,
        size: Buffer.byteLength(content, 'utf8'),
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
}

// DELETE /api/storage/files/[fileId] - Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = params;

    const file = await db.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has permission to delete this file
    if (file.userId !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await db.file.delete({
      where: { id: fileId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}