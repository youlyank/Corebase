/**
 * Collaboration Sessions API
 * Provides endpoints for managing collaboration sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { crdtCollaborationEngine } from '@/lib/collaboration/crdt-engine';
import { verifyJWT } from '@/lib/auth/jwt';

// GET /api/collaboration/v2/sessions - List project sessions
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

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const sessions = crdtCollaborationEngine.getProjectSessions(projectId);

    return NextResponse.json({
      success: true,
      data: sessions.map(session => ({
        id: session.id,
        projectId: session.projectId,
        name: session.name,
        userCount: session.users.size,
        fileCount: session.files.size,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        isActive: session.isActive
      }))
    });

  } catch (error) {
    console.error('Failed to list sessions:', error);
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}

// POST /api/collaboration/v2/sessions - Create new session
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
    const { projectId, name } = body;

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      );
    }

    const session = crdtCollaborationEngine.createSession(projectId, name);

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}