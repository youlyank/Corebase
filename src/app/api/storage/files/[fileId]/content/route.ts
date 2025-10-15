import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authMiddleware } from '@/lib/auth/middleware';

// GET /api/storage/files/[fileId]/content - Get file content
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;
    
    const file = await db.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(file.content || '', {
      headers: {
        'Content-Type': file.mimeType || 'text/plain',
        'Content-Length': file.size?.toString() || '0'
      }
    });
  } catch (error) {
    console.error('Error getting file content:', error);
    return NextResponse.json({ error: 'Failed to get file content' }, { status: 500 });
  }
}