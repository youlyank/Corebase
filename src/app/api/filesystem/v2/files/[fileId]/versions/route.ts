/**
 * File Versions API
 * Handles file versioning operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedFileSystem } from '@/lib/filesystem/advanced-filesystem';
import { verifyJWT } from '@/lib/auth/jwt';

// GET /api/filesystem/v2/files/[fileId]/versions - Get file versions
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

    const versions = await advancedFileSystem.getFileVersions(params.fileId);

    return NextResponse.json({
      success: true,
      data: versions
    });

  } catch (error) {
    console.error('Failed to get file versions:', error);
    return NextResponse.json(
      { error: 'Failed to get file versions' },
      { status: 500 }
    );
  }
}