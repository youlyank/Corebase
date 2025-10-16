/**
 * Advanced Runtime API Routes
 * Provides endpoints for container management and project operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedRuntimeService } from '@/lib/runtime/advanced-runtime-service';
import { containerPoolManager } from '@/lib/runtime/container-pool';
import { verifyJWT } from '@/lib/auth/jwt';

// GET /api/runtime/v2/projects - List user projects
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

    const projects = advancedRuntimeService.getUserProjects(payload.userId);
    
    return NextResponse.json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

// POST /api/runtime/v2/projects - Create new project
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
    const { name, templateId, settings } = body;

    if (!name || !templateId) {
      return NextResponse.json(
        { error: 'Name and templateId are required' },
        { status: 400 }
      );
    }

    const project = await advancedRuntimeService.createProject(
      name,
      templateId,
      payload.userId,
      settings
    );

    return NextResponse.json({
      success: true,
      data: project
    });

  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}