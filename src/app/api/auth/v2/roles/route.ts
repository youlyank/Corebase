/**
 * Roles API
 * Provides endpoints for role management
 */

import { NextRequest, NextResponse } from 'next/server';
import { rbacSystem } from '@/lib/auth/rbac/rbac-system';
import { requirePermission, authenticate } from '@/lib/auth/enhanced-auth';

// GET /api/auth/v2/roles - List all roles
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'role', action: 'read' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const roles = rbacSystem.getAllRoles();

    return NextResponse.json({
      success: true,
      data: roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissionCount: role.permissions.length,
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }))
    });

  } catch (error) {
    console.error('Failed to list roles:', error);
    return NextResponse.json(
      { error: 'Failed to list roles' },
      { status: 500 }
    );
  }
}

// POST /api/auth/v2/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'role', action: 'create' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    const role = await rbacSystem.createRole(
      name,
      description,
      permissionIds || [],
      authResult.user.id
    );

    return NextResponse.json({
      success: true,
      data: role
    });

  } catch (error) {
    console.error('Failed to create role:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create role' },
      { status: 500 }
    );
  }
}