/**
 * Individual Session API
 * Handles operations on specific collaboration sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { crdtCollaborationEngine } from '@/lib/collaboration/crdt-engine';
import { verifyJWT } from '@/lib/auth/jwt';

// GET /api/collaboration/v2/sessions/[sessionId] - Get session details
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

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        projectId: session.projectId,
        name: session.name,
        users: Array.from(session.users.values()).map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          color: user.color,
          status: user.status,
          lastSeen: user.lastSeen,
          permissions: user.permissions,
          cursor: user.cursor,
          selection: user.selection
        })),
        files: Array.from(session.files.values()).map(file => ({
          fileId: file.fileId,
          version: file.version,
          lastModified: file.lastModified,
          modifiedBy: file.modifiedBy
        })),
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        isActive: session.isActive
      }
    });

  } catch (error) {
    console.error('Failed to get session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

// POST /api/collaboration/v2/sessions/[sessionId] - Join session
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
    const { name, email, avatar, color, permissions } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const user = {
      id: payload.userId,
      name,
      email,
      avatar,
      color: color || this.generateUserColor(payload.userId),
      permissions: permissions || {
        canEdit: true,
        canComment: true,
        canShare: false,
        canDelete: false
      }
    };

    const session = await crdtCollaborationEngine.joinSession(params.sessionId, user);

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Failed to join session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join session' },
      { status: 500 }
    );
  }
}

// DELETE /api/collaboration/v2/sessions/[sessionId] - Leave session
export async function DELETE(
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

    await crdtCollaborationEngine.leaveSession(payload.userId);

    return NextResponse.json({
      success: true,
      message: 'Left session successfully'
    });

  } catch (error) {
    console.error('Failed to leave session:', error);
    return NextResponse.json(
      { error: 'Failed to leave session' },
      { status: 500 }
    );
  }
}

// Helper function to generate consistent user color
function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}