import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authMiddleware } from '@/lib/auth/middleware';

// PUT /api/storage/files/[fileId]/rename - Rename file
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
    const { newName } = await request.json();

    if (!newName || newName.trim() === '') {
      return NextResponse.json({ error: 'New name is required' }, { status: 400 });
    }

    const file = await db.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has permission to rename this file
    if (file.userId !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Check if file with new name already exists in the same project
    const existingFile = await db.file.findFirst({
      where: {
        name: newName.trim(),
        projectId: file.projectId,
        id: { not: fileId }
      }
    });

    if (existingFile) {
      return NextResponse.json({ error: 'File with this name already exists' }, { status: 409 });
    }

    const updatedFile = await db.file.update({
      where: { id: fileId },
      data: {
        name: newName.trim(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error('Error renaming file:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}