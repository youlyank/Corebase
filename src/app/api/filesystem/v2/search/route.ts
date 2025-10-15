/**
 * File Search API
 * Handles file search operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedFileSystem } from '@/lib/filesystem/advanced-filesystem';
import { verifyJWT } from '@/lib/auth/jwt';

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
    const query = searchParams.get('query');
    const type = searchParams.get('type') as 'file' | 'directory' | undefined;

    if (!projectId || !query) {
      return NextResponse.json(
        { error: 'Project ID and query are required' },
        { status: 400 }
      );
    }

    const results = await advancedFileSystem.searchFiles(
      projectId,
      query,
      type
    );

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Failed to search files:', error);
    return NextResponse.json(
      { error: 'Failed to search files' },
      { status: 500 }
    );
  }
}