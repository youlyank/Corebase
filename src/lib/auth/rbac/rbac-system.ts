/**
 * Role-Based Access Control (RBAC) System
 * Provides enterprise-grade permission management
 */

import { EventEmitter } from 'events';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  isSystem: boolean;
  createdAt: Date;
}

export interface UserRole {
  userId: string;
  roleId: string;
  projectId?: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  conditions?: RoleCondition[];
}

export interface RoleCondition {
  type: 'time' | 'ip' | 'environment' | 'custom';
  operator: 'equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
  description?: string;
}

export interface ResourceAccess {
  resource: string;
  resourceId?: string;
  action: string;
  context?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  roles: UserRole[];
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
}

class RBACSystem extends EventEmitter {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map();
  private resourceHierarchy: Map<string, string[]> = new Map();
  private permissionCache: Map<string, Set<string>> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    this.initializeSystemRoles();
    this.initializeResourceHierarchy();
    this.startCacheCleanup();
  }

  /**
   * Initialize system roles and permissions
   */
  private initializeSystemRoles() {
    // System permissions
    const systemPermissions: Permission[] = [
      // User management
      { id: 'user.create', name: 'Create users', resource: 'user', action: 'create', description: 'Create new user accounts', isSystem: true, createdAt: new Date() },
      { id: 'user.read', name: 'View users', resource: 'user', action: 'read', description: 'View user information', isSystem: true, createdAt: new Date() },
      { id: 'user.update', name: 'Update users', resource: 'user', action: 'update', description: 'Update user information', isSystem: true, createdAt: new Date() },
      { id: 'user.delete', name: 'Delete users', resource: 'user', action: 'delete', description: 'Delete user accounts', isSystem: true, createdAt: new Date() },
      { id: 'user.manage_roles', name: 'Manage user roles', resource: 'user', action: 'manage_roles', description: 'Assign and remove user roles', isSystem: true, createdAt: new Date() },

      // Role management
      { id: 'role.create', name: 'Create roles', resource: 'role', action: 'create', description: 'Create new roles', isSystem: true, createdAt: new Date() },
      { id: 'role.read', name: 'View roles', resource: 'role', action: 'read', description: 'View role information', isSystem: true, createdAt: new Date() },
      { id: 'role.update', name: 'Update roles', resource: 'role', action: 'update', description: 'Update role information', isSystem: true, createdAt: new Date() },
      { id: 'role.delete', name: 'Delete roles', resource: 'role', action: 'delete', description: 'Delete roles', isSystem: true, createdAt: new Date() },

      // Project management
      { id: 'project.create', name: 'Create projects', resource: 'project', action: 'create', description: 'Create new projects', isSystem: true, createdAt: new Date() },
      { id: 'project.read', name: 'View projects', resource: 'project', action: 'read', description: 'View project information', isSystem: true, createdAt: new Date() },
      { id: 'project.update', name: 'Update projects', resource: 'project', action: 'update', description: 'Update project information', isSystem: true, createdAt: new Date() },
      { id: 'project.delete', name: 'Delete projects', resource: 'project', action: 'delete', description: 'Delete projects', isSystem: true, createdAt: new Date() },
      { id: 'project.manage_members', name: 'Manage project members', resource: 'project', action: 'manage_members', description: 'Add and remove project members', isSystem: true, createdAt: new Date() },

      // Runtime management
      { id: 'runtime.start', name: 'Start containers', resource: 'runtime', action: 'start', description: 'Start container instances', isSystem: true, createdAt: new Date() },
      { id: 'runtime.stop', name: 'Stop containers', resource: 'runtime', action: 'stop', description: 'Stop container instances', isSystem: true, createdAt: new Date() },
      { id: 'runtime.exec', name: 'Execute commands', resource: 'runtime', action: 'exec', description: 'Execute commands in containers', isSystem: true, createdAt: new Date() },
      { id: 'runtime.logs', name: 'View logs', resource: 'runtime', action: 'logs', description: 'View container logs', isSystem: true, createdAt: new Date() },
      { id: 'runtime.metrics', name: 'View metrics', resource: 'runtime', action: 'metrics', description: 'View container metrics', isSystem: true, createdAt: new Date() },

      // File system
      { id: 'file.create', name: 'Create files', resource: 'file', action: 'create', description: 'Create new files and directories', isSystem: true, createdAt: new Date() },
      { id: 'file.read', name: 'Read files', resource: 'file', action: 'read', description: 'Read file contents', isSystem: true, createdAt: new Date() },
      { id: 'file.update', name: 'Update files', resource: 'file', action: 'update', description: 'Update file contents', isSystem: true, createdAt: new Date() },
      { id: 'file.delete', name: 'Delete files', resource: 'file', action: 'delete', description: 'Delete files and directories', isSystem: true, createdAt: new Date() },
      { id: 'file.share', name: 'Share files', resource: 'file', action: 'share', description: 'Share files with other users', isSystem: true, createdAt: new Date() },

      // Collaboration
      { id: 'collaboration.join', name: 'Join sessions', resource: 'collaboration', action: 'join', description: 'Join collaboration sessions', isSystem: true, createdAt: new Date() },
      { id: 'collaboration.edit', name: 'Edit collaboratively', resource: 'collaboration', action: 'edit', description: 'Edit files collaboratively', isSystem: true, createdAt: new Date() },
      { id: 'collaboration.chat', name: 'Chat in sessions', resource: 'collaboration', action: 'chat', description: 'Participate in chat', isSystem: true, createdAt: new Date() },
      { id: 'collaboration.manage', name: 'Manage sessions', resource: 'collaboration', action: 'manage', description: 'Manage collaboration sessions', isSystem: true, createdAt: new Date() },

      // System administration
      { id: 'system.monitor', name: 'Monitor system', resource: 'system', action: 'monitor', description: 'View system monitoring data', isSystem: true, createdAt: new Date() },
      { id: 'system.configure', name: 'Configure system', resource: 'system', action: 'configure', description: 'Configure system settings', isSystem: true, createdAt: new Date() },
      { id: 'system.backup', name: 'Backup system', resource: 'system', action: 'backup', description: 'Create system backups', isSystem: true, createdAt: new Date() },
      { id: 'system.restore', name: 'Restore system', resource: 'system', action: 'restore', description: 'Restore system from backup', isSystem: true, createdAt: new Date() }
    ];

    // Register system permissions
    systemPermissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });

    // System roles
    const systemRoles: Role[] = [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: systemPermissions,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Administrative access to most system features',
        permissions: systemPermissions.filter(p => !p.id.includes('system.restore')),
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'project_manager',
        name: 'Project Manager',
        description: 'Can manage projects and team members',
        permissions: systemPermissions.filter(p => 
          p.resource === 'project' || 
          p.resource === 'user' && ['user.read'].includes(p.id) ||
          p.resource === 'runtime' && !['runtime.exec'].includes(p.id) ||
          p.resource === 'file' ||
          p.resource === 'collaboration'
        ),
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'developer',
        name: 'Developer',
        description: 'Can develop and collaborate on projects',
        permissions: systemPermissions.filter(p => 
          p.resource === 'project' && ['project.read'].includes(p.id) ||
          p.resource === 'runtime' && ['runtime.start', 'runtime.stop', 'runtime.exec', 'runtime.logs', 'runtime.metrics'].includes(p.id) ||
          p.resource === 'file' ||
          p.resource === 'collaboration'
        ),
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access to projects',
        permissions: systemPermissions.filter(p => 
          p.resource === 'project' && ['project.read'].includes(p.id) ||
          p.resource === 'runtime' && ['runtime.logs', 'runtime.metrics'].includes(p.id) ||
          p.resource === 'file' && ['file.read'].includes(p.id) ||
          p.resource === 'collaboration' && ['collaboration.join'].includes(p.id)
        ),
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Register system roles
    systemRoles.forEach(role => {
      this.roles.set(role.id, role);
    });
  }

  /**
   * Initialize resource hierarchy
   */
  private initializeResourceHierarchy() {
    this.resourceHierarchy.set('project', ['runtime', 'file', 'collaboration']);
    this.resourceHierarchy.set('runtime', ['file']);
    this.resourceHierarchy.set('file', []);
    this.resourceHierarchy.set('collaboration', ['file']);
    this.resourceHierarchy.set('user', []);
    this.resourceHierarchy.set('role', []);
    this.resourceHierarchy.set('system', ['project', 'user', 'role', 'runtime', 'file', 'collaboration']);
  }

  /**
   * Check if user has permission for a specific action
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const cacheKey = `${userId}:${resource}:${action}:${resourceId || ''}`;
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!.has(action);
    }

    const userRoles = this.getUserRoles(userId);
    const permissions = new Set<string>();

    // Collect all permissions from user's roles
    for (const userRole of userRoles) {
      // Check if role is expired
      if (userRole.expiresAt && userRole.expiresAt < new Date()) {
        continue;
      }

      // Check role conditions
      if (!(await this.checkRoleConditions(userRole, context))) {
        continue;
      }

      const role = this.roles.get(userRole.roleId);
      if (role) {
        role.permissions.forEach(permission => {
          // Check if permission applies to the resource
          if (this.permissionApplies(permission, resource, resourceId, userRole.projectId)) {
            permissions.add(permission.action);
          }
        });
      }
    }

    // Cache the result
    this.permissionCache.set(cacheKey, permissions);

    // Schedule cache cleanup
    setTimeout(() => {
      this.permissionCache.delete(cacheKey);
    }, this.CACHE_TTL);

    return permissions.has(action);
  }

  /**
   * Check if permission applies to the specific resource
   */
  private permissionApplies(
    permission: Permission,
    resource: string,
    resourceId?: string,
    projectId?: string
  ): boolean {
    // Direct match
    if (permission.resource === resource) {
      return true;
    }

    // Hierarchical permissions
    const children = this.resourceHierarchy.get(resource) || [];
    if (children.includes(permission.resource)) {
      return true;
    }

    // Parent permissions
    for (const [parent, parentChildren] of this.resourceHierarchy.entries()) {
      if (parentChildren.includes(resource) && permission.resource === parent) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check role conditions
   */
  private async checkRoleConditions(
    userRole: UserRole,
    context?: Record<string, any>
  ): Promise<boolean> {
    if (!userRole.conditions || userRole.conditions.length === 0) {
      return true;
    }

    for (const condition of userRole.conditions) {
      if (!(await this.evaluateCondition(condition, context))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate individual condition
   */
  private async evaluateCondition(
    condition: RoleCondition,
    context?: Record<string, any>
  ): Promise<boolean> {
    if (!context) return true;

    let actualValue: any;

    switch (condition.type) {
      case 'time':
        actualValue = new Date();
        break;
      case 'ip':
        actualValue = context.ip;
        break;
      case 'environment':
        actualValue = context.environment;
        break;
      case 'custom':
        actualValue = context[condition.value.field];
        break;
      default:
        return true;
    }

    switch (condition.operator) {
      case 'equals':
        return actualValue === condition.value;
      case 'contains':
        return String(actualValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(actualValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(actualValue);
      case 'greater_than':
        return actualValue > condition.value;
      case 'less_than':
        return actualValue < condition.value;
      default:
        return true;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    grantedBy: string,
    projectId?: string,
    expiresAt?: Date,
    conditions?: RoleCondition[]
  ): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    const userRole: UserRole = {
      userId,
      roleId,
      projectId,
      grantedBy,
      grantedAt: new Date(),
      expiresAt,
      conditions
    };

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }

    this.userRoles.get(userId)!.push(userRole);

    // Clear cache for this user
    this.clearUserPermissionCache(userId);

    this.emit('roleAssigned', { userId, roleId, projectId, grantedBy });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string, projectId?: string): Promise<void> {
    const userRoles = this.userRoles.get(userId) || [];
    const filteredRoles = userRoles.filter(ur => 
      !(ur.roleId === roleId && ur.projectId === projectId)
    );

    if (filteredRoles.length === userRoles.length) {
      throw new Error('Role assignment not found');
    }

    this.userRoles.set(userId, filteredRoles);

    // Clear cache for this user
    this.clearUserPermissionCache(userId);

    this.emit('roleRemoved', { userId, roleId, projectId });
  }

  /**
   * Get user roles
   */
  getUserRoles(userId: string): UserRole[] {
    return this.userRoles.get(userId) || [];
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): Role | null {
    return this.roles.get(roleId) || null;
  }

  /**
   * Create custom role
   */
  async createRole(
    name: string,
    description: string,
    permissionIds: string[],
    createdBy: string
  ): Promise<Role> {
    const role: Role = {
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      permissions: permissionIds.map(id => this.permissions.get(id)).filter(Boolean) as Permission[],
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(role.id, role);

    this.emit('roleCreated', { role, createdBy });
    return role;
  }

  /**
   * Update role
   */
  async updateRole(
    roleId: string,
    updates: Partial<Pick<Role, 'name' | 'description' | 'permissions'>>,
    updatedBy: string
  ): Promise<Role> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot modify system roles');
    }

    const updatedRole = {
      ...role,
      ...updates,
      updatedAt: new Date()
    };

    this.roles.set(roleId, updatedRole);

    // Clear all permission cache since role permissions changed
    this.permissionCache.clear();

    this.emit('roleUpdated', { role: updatedRole, updatedBy });
    return updatedRole;
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    // Remove role from all users
    for (const [userId, userRoles] of this.userRoles.entries()) {
      const filteredRoles = userRoles.filter(ur => ur.roleId !== roleId);
      this.userRoles.set(userId, filteredRoles);
    }

    this.roles.delete(roleId);

    // Clear all permission cache
    this.permissionCache.clear();

    this.emit('roleDeleted', { roleId, deletedBy });
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string, projectId?: string): Promise<Permission[]> {
    const userRoles = this.getUserRoles(userId);
    const permissions = new Set<Permission>();

    for (const userRole of userRoles) {
      if (projectId && userRole.projectId && userRole.projectId !== projectId) {
        continue;
      }

      const role = this.roles.get(userRole.roleId);
      if (role) {
        role.permissions.forEach(permission => {
          permissions.add(permission);
        });
      }
    }

    return Array.from(permissions);
  }

  /**
   * Clear user permission cache
   */
  private clearUserPermissionCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      // This would be enhanced with a more sophisticated cleanup strategy
      if (this.permissionCache.size > 10000) {
        // Clear oldest entries if cache gets too large
        const keys = Array.from(this.permissionCache.keys());
        const toDelete = keys.slice(0, 5000);
        toDelete.forEach(key => this.permissionCache.delete(key));
      }
    }, 60000); // Check every minute
  }

  /**
   * Get role assignments for user
   */
  getUserRoleAssignments(userId: string): UserRole[] {
    return this.getUserRoles(userId);
  }

  /**
   * Get users with specific role
   */
  getUsersWithRole(roleId: string): string[] {
    const users: string[] = [];
    
    for (const [userId, userRoles] of this.userRoles.entries()) {
      if (userRoles.some(ur => ur.roleId === roleId)) {
        users.push(userId);
      }
    }

    return users;
  }

  /**
   * Check if user has any role in project
   */
  async hasProjectRole(userId: string, projectId: string): Promise<boolean> {
    const userRoles = this.getUserRoles(userId);
    return userRoles.some(ur => ur.projectId === projectId);
  }

  /**
   * Get effective permissions for resource
   */
  async getEffectivePermissions(
    userId: string,
    resource: string,
    resourceId?: string,
    projectId?: string
  ): Promise<string[]> {
    const userRoles = this.getUserRoles(userId);
    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      if (projectId && userRole.projectId && userRole.projectId !== projectId) {
        continue;
      }

      const role = this.roles.get(userRole.roleId);
      if (role) {
        role.permissions.forEach(permission => {
          if (this.permissionApplies(permission, resource, resourceId, userRole.projectId)) {
            permissions.add(permission.action);
          }
        });
      }
    }

    return Array.from(permissions);
  }
}

// Singleton instance
export const rbacSystem = new RBACSystem();

export default RBACSystem;