/**
 * Messages API
 * Handles chat messages in collaboration sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { crdtCollaborationEngine } from '@/lib/collaboration/crdt-engine';
import { verifyJWT } from '@/lib/auth/jwt';

// GET /api/collaboration/v2/sessions/[sessionId]/messages - Get messages
export async function GET(
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

    const session = crdtCollaborationEngine.getSession(params.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const messages = session.messages
      .slice(-limit - offset)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: messages,
      total: session.messages.length
    });

  } catch (error) {
    console.error('Failed to get messages:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

// POST /api/collaboration/v2/sessions/[sessionId]/messages - Send message
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
    const { content, type = 'text' } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    crdtCollaborationEngine.sendMessage(payload.userId, content, type);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}