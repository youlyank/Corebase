/**
 * Individual File API Routes
 * Handles operations on specific files
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedFileSystem } from '@/lib/filesystem/advanced-filesystem';
import { verifyJWT } from '@/lib/auth/jwt';

// GET /api/filesystem/v2/files/[fileId] - Get file details
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');
    const download = searchParams.get('download') === 'true';

    // Get file content if requested
    if (download || version) {
      const content = await advancedFileSystem.getFileContent(
        params.fileId,
        version ? parseInt(version) : undefined
      );

      if (download) {
        // Return file as downloadable content
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="file"`
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: content.toString('base64')
      });
    }

    // Otherwise, this would return file metadata
    // In a real implementation, we'd have a method to get file metadata
    return NextResponse.json({
      success: true,
      data: { fileId: params.fileId }
    });

  } catch (error) {
    console.error('Failed to get file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get file' },
      { status: 500 }
    );
  }
}

// PUT /api/filesystem/v2/files/[fileId] - Update file content
export async function PUT(
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
    const { content, message } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const fileContent = Buffer.from(content, 'base64');
    const fileNode = await advancedFileSystem.updateFile(
      params.fileId,
      fileContent,
      payload.userId,
      message
    );

    return NextResponse.json({
      success: true,
      data: fileNode
    });

  } catch (error) {
    console.error('Failed to update file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update file' },
      { status: 500 }
    );
  }
}

// DELETE /api/filesystem/v2/files/[fileId] - Delete file
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

    await advancedFileSystem.deleteFile(params.fileId, payload.userId);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file' },
      { status: 500 }
    );
  }
}