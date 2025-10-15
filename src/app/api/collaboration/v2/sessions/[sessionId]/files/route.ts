/**
 * Session Files API
 * Handles file initialization and state in collaboration sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { crdtCollaborationEngine } from '@/lib/collaboration/crdt-engine';
import { verifyJWT } from '@/lib/auth/jwt';

// POST /api/collaboration/v2/sessions/[sessionId]/files - Initialize file
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
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
    const { fileId, content } = body;

    if (!fileId || content === undefined) {
      return NextResponse.json(
        { error: 'File ID and content are required' },
        { status: 400 }
      );
    }

    crdtCollaborationEngine.initializeFile(params.sessionId, fileId, content);

    return NextResponse.json({
      success: true,
      message: 'File initialized successfully'
    });

  } catch (error) {
    console.error('Failed to initialize file:', error);
    return NextResponse.json(
      { error: 'Failed to initialize file' },
      { status: 500 }
    );
  }
}