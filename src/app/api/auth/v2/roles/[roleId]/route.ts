/**
 * Individual Role API
 * Handles operations on specific roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { rbacSystem } from '@/lib/auth/rbac/rbac-system';
import { requirePermission, authenticate } from '@/lib/auth/enhanced-auth';

// GET /api/auth/v2/roles/[roleId] - Get role details
export async function GET(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'role', action: 'read' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const role = rbacSystem.getRole(params.roleId);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: role.permissions.map(p => ({
          id: p.id,
          name: p.name,
          resource: p.resource,
          action: p.action,
          description: p.description
        }))
      }
    });

  } catch (error) {
    console.error('Failed to get role:', error);
    return NextResponse.json(
      { error: 'Failed to get role' },
      { status: 500 }
    );
  }
}

// PUT /api/auth/v2/roles/[roleId] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'role', action: 'update' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { name, description, permissionIds } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (permissionIds !== undefined) {
      updates.permissions = permissionIds.map((id: string) => ({ id }));
    }

    const role = await rbacSystem.updateRole(
      params.roleId,
      updates,
      authResult.user.id
    );

    return NextResponse.json({
      success: true,
      data: role
    });

  } catch (error) {
    console.error('Failed to update role:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/v2/roles/[roleId] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'role', action: 'delete' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await rbacSystem.deleteRole(params.roleId, authResult.user.id);

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete role:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete role' },
      { status: 500 }
    );
  }
}