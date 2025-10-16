/**
 * Cursor API
 * Handles cursor position and selection updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { crdtCollaborationEngine } from '@/lib/collaboration/crdt-engine';
import { verifyJWT } from '@/lib/auth/jwt';

// PUT /api/collaboration/v2/sessions/[sessionId]/cursor - Update cursor
export async function PUT(
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
    const { cursor, selection } = body;

    if (cursor) {
      crdtCollaborationEngine.updateCursor(payload.userId, cursor);
    }

    if (selection) {
      crdtCollaborationEngine.updateSelection(payload.userId, selection);
    }

    return NextResponse.json({
      success: true,
      message: 'Cursor updated successfully'
    });

  } catch (error) {
    console.error('Failed to update cursor:', error);
    return NextResponse.json(
      { error: 'Failed to update cursor' },
      { status: 500 }
    );
  }
}