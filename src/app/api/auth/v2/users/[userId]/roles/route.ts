/**
 * User Role Assignments API
 * Provides endpoints for managing user role assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { rbacSystem } from '@/lib/auth/rbac/rbac-system';
import { requirePermission, authenticate } from '@/lib/auth/enhanced-auth';

// GET /api/auth/v2/users/[userId]/roles - Get user roles
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'user', action: 'read' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userRoles = rbacSystem.getUserRoleAssignments(params.userId);
    const rolesWithDetails = await Promise.all(
      userRoles.map(async (userRole) => {
        const role = rbacSystem.getRole(userRole.roleId);
        return {
          ...userRole,
          role: role ? {
            id: role.id,
            name: role.name,
            description: role.description,
            permissionCount: role.permissions.length
          } : null
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: rolesWithDetails
    });

  } catch (error) {
    console.error('Failed to get user roles:', error);
    return NextResponse.json(
      { error: 'Failed to get user roles' },
      { status: 500 }
    );
  }
}

// POST /api/auth/v2/users/[userId]/roles - Assign role to user
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'user', action: 'manage_roles' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { roleId, projectId, expiresAt, conditions } = body;

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    await rbacSystem.assignRole(
      params.userId,
      roleId,
      authResult.user.id,
      projectId,
      expiresAt ? new Date(expiresAt) : undefined,
      conditions
    );

    return NextResponse.json({
      success: true,
      message: 'Role assigned successfully'
    });

  } catch (error) {
    console.error('Failed to assign role:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign role' },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/v2/users/[userId]/roles/[roleId] - Remove role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; roleId: string } }
) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'user', action: 'manage_roles' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    await rbacSystem.removeRole(params.userId, params.roleId, projectId || undefined);

    return NextResponse.json({
      success: true,
      message: 'Role removed successfully'
    });

  } catch (error) {
    console.error('Failed to remove role:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove role' },
      { status: 500 }
    );
  }
}