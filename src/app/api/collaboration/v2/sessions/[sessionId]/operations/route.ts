/**
 * Collaboration Operations API
 * Handles CRDT operations for collaborative editing
 */

import { NextRequest, NextResponse } from 'next/server';
import { crdtCollaborationEngine } from '@/lib/collaboration/crdt-engine';
import { verifyJWT } from '@/lib/auth/jwt';
import { CRDTOperation } from '@/lib/collaboration/crdt-engine';

// POST /api/collaboration/v2/sessions/[sessionId]/operations - Apply operation
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
    const { operations } = body;

    if (!Array.isArray(operations)) {
      return NextResponse.json(
        { error: 'Operations array is required' },
        { status: 400 }
      );
    }

    // Validate and apply each operation
    for (const op of operations) {
      const operation: CRDTOperation = {
        id: op.id || `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: op.type,
        fileId: op.fileId,
        userId: payload.userId,
        timestamp: op.timestamp || Date.now(),
        position: op.position,
        content: op.content,
        length: op.length,
        attributes: op.attributes,
        vectorClock: op.vectorClock || {}
      };

      await crdtCollaborationEngine.applyOperation(operation);
    }

    return NextResponse.json({
      success: true,
      message: 'Operations applied successfully'
    });

  } catch (error) {
    console.error('Failed to apply operations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply operations' },
      { status: 500 }
    );
  }
}