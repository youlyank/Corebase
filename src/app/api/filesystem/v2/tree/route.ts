/**
 * Advanced File System API Routes
 * Provides endpoints for file operations with versioning and locking
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedFileSystem } from '@/lib/filesystem/advanced-filesystem';
import { verifyJWT } from '@/lib/auth/jwt';

// GET /api/filesystem/v2/tree - Get directory tree
export async function GET(request: NextRequest) {
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
    const projectId = searchParams.get('projectId');
    const parentId = searchParams.get('parentId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const tree = await advancedFileSystem.getDirectoryTree(
      projectId,
      parentId || null
    );

    return NextResponse.json({
      success: true,
      data: tree
    });

  } catch (error) {
    console.error('Failed to get directory tree:', error);
    return NextResponse.json(
      { error: 'Failed to get directory tree' },
      { status: 500 }
    );
  }
}

// POST /api/filesystem/v2/tree - Create new file or directory
export async function POST(request: NextRequest) {
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
    const { name, type, parentId, projectId, content, mimeType } = body;

    if (!name || !type || !projectId) {
      return NextResponse.json(
        { error: 'Name, type, and projectId are required' },
        { status: 400 }
      );
    }

    if (!['file', 'directory'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be file or directory' },
        { status: 400 }
      );
    }

    let fileContent: Buffer | undefined;
    if (type === 'file' && content) {
      fileContent = Buffer.from(content, 'base64');
    }

    const fileNode = await advancedFileSystem.createFile(
      name,
      type,
      parentId || null,
      projectId,
      payload.userId,
      fileContent,
      mimeType
    );

    return NextResponse.json({
      success: true,
      data: fileNode
    });

  } catch (error) {
    console.error('Failed to create file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create file' },
      { status: 500 }
    );
  }
}