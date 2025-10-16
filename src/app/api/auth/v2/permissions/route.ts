/**
 * Permissions API
 * Provides endpoints for permission management and checking
 */

import { NextRequest, NextResponse } from 'next/server';
import { rbacSystem } from '@/lib/auth/rbac/rbac-system';
import { authenticate } from '@/lib/auth/enhanced-auth';

// GET /api/auth/v2/permissions - List all permissions
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request, {
      requiredPermissions: [{ resource: 'role', action: 'read' }]
    });

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');

    if (userId) {
      // Get user permissions
      const permissions = await rbacSystem.getUserPermissions(
        userId,
        projectId || undefined
      );

      return NextResponse.json({
        success: true,
        data: permissions.map(p => ({
          id: p.id,
          name: p.name,
          resource: p.resource,
          action: p.action,
          description: p.description
        }))
      });
    }

    // Get all permissions (optionally filtered by resource)
    const allRoles = rbacSystem.getAllRoles();
    const allPermissions = new Set(
      allRoles.flatMap(role => role.permissions.map(p => p.id))
    );

    const permissions = Array.from(allPermissions)
      .map(id => {
        const role = allRoles.find(r => r.permissions.some(p => p.id === id));
        return role?.permissions.find(p => p.id === id);
      })
      .filter(Boolean)
      .filter(p => !resource || p.resource === resource);

    return NextResponse.json({
      success: true,
      data: permissions
    });

  } catch (error) {
    console.error('Failed to get permissions:', error);
    return NextResponse.json(
      { error: 'Failed to get permissions' },
      { status: 500 }
    );
  }
}

// POST /api/auth/v2/permissions/check - Check permissions
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { userId, resource, action, resourceId, context } = body;

    if (!userId || !resource || !action) {
      return NextResponse.json(
        { error: 'User ID, resource, and action are required' },
        { status: 400 }
      );
    }

    const hasPermission = await rbacSystem.hasPermission(
      userId,
      resource,
      action,
      resourceId,
      context
    );

    const effectivePermissions = await rbacSystem.getEffectivePermissions(
      userId,
      resource,
      resourceId,
      context?.projectId
    );

    return NextResponse.json({
      success: true,
      data: {
        hasPermission,
        effectivePermissions,
        checked: {
          userId,
          resource,
          action,
          resourceId,
          context
        }
      }
    });

  } catch (error) {
    console.error('Failed to check permissions:', error);
    return NextResponse.json(
      { error: 'Failed to check permissions' },
      { status: 500 }
    );
  }
}