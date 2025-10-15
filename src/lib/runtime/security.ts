import { randomBytes, createHash } from 'crypto';
import { ContainerConfig } from './runtime-service';

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enabled: boolean;
}

export interface SecurityRule {
  type: 'resource_limit' | 'network_access' | 'filesystem_access' | 'capabilities' | 'user_permissions';
  config: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityContext {
  userId: string;
  projectId: string;
  containerId: string;
  policies: string[];
  permissions: string[];
  restrictions: SecurityRestriction[];
}

export interface SecurityRestriction {
  type: 'network' | 'filesystem' | 'process' | 'system';
  rule: string;
  allowed: boolean;
  reason?: string;
}

export class ContainerSecurity {
  private static instance: ContainerSecurity;
  private policies: Map<string, SecurityPolicy> = new Map();
  private contexts: Map<string, SecurityContext> = new Map();

  private constructor() {
    this.initializeDefaultPolicies();
  }

  static getInstance(): ContainerSecurity {
    if (!ContainerSecurity.instance) {
      ContainerSecurity.instance = new ContainerSecurity();
    }
    return ContainerSecurity.instance;
  }

  async createSecurityContext(
    userId: string, 
    projectId: string, 
    containerId: string,
    userRole: string = 'user'
  ): Promise<SecurityContext> {
    const context: SecurityContext = {
      userId,
      projectId,
      containerId,
      policies: this.getApplicablePolicies(userRole),
      permissions: this.getUserPermissions(userRole),
      restrictions: await this.generateRestrictions(userId, projectId)
    };

    this.contexts.set(containerId, context);
    return context;
  }

  async validateContainerConfig(
    config: ContainerConfig, 
    context: SecurityContext
  ): Promise<{ valid: boolean; violations: SecurityViolation[] }> {
    const violations: SecurityViolation[] = [];

    // Validate against security policies
    for (const policyId of context.policies) {
      const policy = this.policies.get(policyId);
      if (policy && policy.enabled) {
        const policyViolations = await this.checkPolicy(config, policy, context);
        violations.push(...policyViolations);
      }
    }

    // Check resource limits
    const resourceViolations = this.validateResourceLimits(config, context);
    violations.push(...resourceViolations);

    // Validate network access
    const networkViolations = this.validateNetworkAccess(config, context);
    violations.push(...networkViolations);

    // Validate filesystem access
    const fsViolations = this.validateFilesystemAccess(config, context);
    violations.push(...fsViolations);

    return {
      valid: violations.length === 0,
      violations
    };
  }

  async applySecurityMeasures(
    config: ContainerConfig, 
    context: SecurityContext
  ): Promise<ContainerConfig> {
    const securedConfig = { ...config };

    // Apply security hardening
    securedConfig.environment = {
      ...securedConfig.environment,
      ...this.getSecureEnvironment(context)
    };

    // Apply resource limits
    securedConfig.resources = this.applyResourceLimits(securedConfig.resources, context);

    // Apply network restrictions
    securedConfig.ports = this.restrictNetworkAccess(securedConfig.ports, context);

    // Apply filesystem restrictions
    securedConfig.volumes = this.restrictFilesystemAccess(securedConfig.volumes, context);

    return securedConfig;
  }

  async auditContainerAccess(
    containerId: string, 
    action: string, 
    metadata?: any
  ): Promise<void> {
    const context = this.contexts.get(containerId);
    if (!context) return;

    const auditEntry = {
      timestamp: new Date(),
      containerId,
      userId: context.userId,
      projectId: context.projectId,
      action,
      metadata,
      allowed: this.isActionAllowed(action, context)
    };

    // Log audit entry
    console.log('Container access audit:', auditEntry);
    
    // In a real implementation, store in audit database
    await this.storeAuditEntry(auditEntry);
  }

  async revokeAccess(containerId: string): Promise<void> {
    const context = this.contexts.get(containerId);
    if (context) {
      // Log access revocation
      await this.auditContainerAccess(containerId, 'access_revoked');
      
      // Remove security context
      this.contexts.delete(containerId);
    }
  }

  getSecurityContext(containerId: string): SecurityContext | undefined {
    return this.contexts.get(containerId);
  }

  async updateSecurityPolicy(policy: SecurityPolicy): Promise<void> {
    this.policies.set(policy.id, policy);
    await this.savePolicy(policy);
  }

  async listSecurityPolicies(): Promise<SecurityPolicy[]> {
    return Array.from(this.policies.values());
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: SecurityPolicy[] = [
      {
        id: 'basic-isolation',
        name: 'Basic Container Isolation',
        description: 'Essential security measures for all containers',
        enabled: true,
        rules: [
          {
            type: 'user_permissions',
            config: { runAsNonRoot: true, dropCapabilities: ['ALL'] },
            severity: 'high'
          },
          {
            type: 'filesystem_access',
            config: { readOnlyRootFs: true, tmpfsSize: '100m' },
            severity: 'high'
          },
          {
            type: 'network_access',
            config: { allowPrivileged: false, networkMode: 'bridge' },
            severity: 'medium'
          }
        ]
      },
      {
        id: 'resource-limits',
        name: 'Resource Usage Limits',
        description: 'Prevents resource abuse and DoS attacks',
        enabled: true,
        rules: [
          {
            type: 'resource_limit',
            config: { 
              maxMemory: '1g', 
              maxCpu: '50%',
              maxProcesses: 100
            },
            severity: 'medium'
          }
        ]
      },
      {
        id: 'restricted-network',
        name: 'Restricted Network Access',
        description: 'Limits network connectivity for security',
        enabled: true,
        rules: [
          {
            type: 'network_access',
            config: { 
              allowedHosts: ['*.docker.internal', 'localhost'],
              blockedPorts: [22, 23, 25, 53, 135, 139, 445, 993, 995]
            },
            severity: 'medium'
          }
        ]
      }
    ];

    defaultPolicies.forEach(policy => {
      this.policies.set(policy.id, policy);
    });
  }

  private getApplicablePolicies(userRole: string): string[] {
    const basePolicies = ['basic-isolation', 'resource-limits'];
    
    switch (userRole) {
      case 'admin':
      case 'super_admin':
        return basePolicies; // Admins have fewer restrictions
      case 'moderator':
        return [...basePolicies, 'restricted-network'];
      default:
        return [...basePolicies, 'restricted-network'];
    }
  }

  private getUserPermissions(userRole: string): string[] {
    switch (userRole) {
      case 'super_admin':
        return ['container:create', 'container:delete', 'container:exec', 'system:manage'];
      case 'admin':
        return ['container:create', 'container:delete', 'container:exec'];
      case 'moderator':
        return ['container:create', 'container:exec'];
      default:
        return ['container:create'];
    }
  }

  private async generateRestrictions(userId: string, projectId: string): Promise<SecurityRestriction[]> {
    const restrictions: SecurityRestriction[] = [
      {
        type: 'network',
        rule: 'deny_internet_access',
        allowed: false,
        reason: 'Security policy restricts direct internet access'
      },
      {
        type: 'filesystem',
        rule: 'deny_host_mounts',
        allowed: false,
        reason: 'Host filesystem access is prohibited'
      },
      {
        type: 'process',
        rule: 'deny_privileged_processes',
        allowed: false,
        reason: 'Privileged process execution is not allowed'
      }
    ];

    // Add user-specific restrictions based on history
    const userRestrictions = await this.getUserSpecificRestrictions(userId);
    restrictions.push(...userRestrictions);

    return restrictions;
  }

  private async getUserSpecificRestrictions(userId: string): Promise<SecurityRestriction[]> {
    // In a real implementation, check user's security history
    // For now, return empty array
    return [];
  }

  private async checkPolicy(
    config: ContainerConfig, 
    policy: SecurityPolicy, 
    context: SecurityContext
  ): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    for (const rule of policy.rules) {
      const violation = await this.evaluateRule(config, rule, context);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  }

  private async evaluateRule(
    config: ContainerConfig, 
    rule: SecurityRule, 
    context: SecurityContext
  ): Promise<SecurityViolation | null> {
    switch (rule.type) {
      case 'resource_limit':
        return this.checkResourceLimitRule(config, rule);
      case 'network_access':
        return this.checkNetworkAccessRule(config, rule);
      case 'filesystem_access':
        return this.checkFilesystemAccessRule(config, rule);
      case 'capabilities':
        return this.checkCapabilitiesRule(config, rule);
      case 'user_permissions':
        return this.checkUserPermissionsRule(config, rule);
      default:
        return null;
    }
  }

  private checkResourceLimitRule(config: ContainerConfig, rule: SecurityRule): SecurityViolation | null {
    const limits = rule.config;
    
    if (limits.maxMemory && config.resources?.memory) {
      const maxMemoryBytes = this.parseMemorySize(limits.maxMemory);
      if (config.resources.memory > maxMemoryBytes) {
        return {
          type: 'resource_limit',
          rule: rule.type,
          message: `Memory limit exceeded: ${config.resources.memory} > ${maxMemoryBytes}`,
          severity: rule.severity
        };
      }
    }

    return null;
  }

  private checkNetworkAccessRule(config: ContainerConfig, rule: SecurityRule): SecurityViolation | null {
    if (rule.config.allowPrivileged && config.ports && Object.keys(config.ports).length > 0) {
      return {
        type: 'network_access',
        rule: rule.type,
        message: 'Privileged network access not allowed with port mappings',
        severity: rule.severity
      };
    }

    return null;
  }

  private checkFilesystemAccessRule(config: ContainerConfig, rule: SecurityRule): SecurityViolation | null {
    if (rule.config.readOnlyRootFs && config.volumes) {
      const hasWritableMount = Object.values(config.volumes).some(mount => 
        !mount.includes('ro')
      );
      
      if (hasWritableMount) {
        return {
          type: 'filesystem_access',
          rule: rule.type,
          message: 'Writable filesystem mounts not allowed with read-only root filesystem',
          severity: rule.severity
        };
      }
    }

    return null;
  }

  private checkCapabilitiesRule(config: ContainerConfig, rule: SecurityRule): SecurityViolation | null {
    // This would check for Linux capabilities in a real implementation
    return null;
  }

  private checkUserPermissionsRule(config: ContainerConfig, rule: SecurityRule): SecurityViolation | null {
    // This would check user-specific permission rules
    return null;
  }

  private validateResourceLimits(config: ContainerConfig, context: SecurityContext): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    
    // Check memory limits
    if (config.resources?.memory && config.resources.memory > 2 * 1024 * 1024 * 1024) { // 2GB
      violations.push({
        type: 'resource_limit',
        rule: 'memory_limit',
        message: 'Memory limit exceeds maximum allowed (2GB)',
        severity: 'high'
      });
    }

    // Check CPU limits
    if (config.resources?.cpu && config.resources.cpu > 80) { // 80%
      violations.push({
        type: 'resource_limit',
        rule: 'cpu_limit',
        message: 'CPU limit exceeds maximum allowed (80%)',
        severity: 'medium'
      });
    }

    return violations;
  }

  private validateNetworkAccess(config: ContainerConfig, context: SecurityContext): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    
    // Check for privileged ports
    if (config.ports) {
      for (const port of Object.keys(config.ports)) {
        const portNum = parseInt(port);
        if (portNum < 1024) {
          violations.push({
            type: 'network_access',
            rule: 'privileged_port',
            message: `Privileged port ${portNum} requires elevated permissions`,
            severity: 'medium'
          });
        }
      }
    }

    return violations;
  }

  private validateFilesystemAccess(config: ContainerConfig, context: SecurityContext): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    
    // Check for dangerous volume mounts
    if (config.volumes) {
      const dangerousPaths = ['/var/run/docker.sock', '/proc', '/sys', '/dev'];
      
      for (const [host, container] of Object.entries(config.volumes)) {
        if (dangerousPaths.some(path => host.includes(path) || container.includes(path))) {
          violations.push({
            type: 'filesystem_access',
            rule: 'dangerous_mount',
            message: `Dangerous filesystem mount detected: ${host}:${container}`,
            severity: 'critical'
          });
        }
      }
    }

    return violations;
  }

  private getSecureEnvironment(context: SecurityContext): Record<string, string> {
    return {
      'SECURITY_CONTEXT': 'enabled',
      'USER_ID': context.userId,
      'PROJECT_ID': context.projectId,
      'CONTAINER_SANDBOX': 'true'
    };
  }

  private applyResourceLimits(resources?: any, context?: SecurityContext): any {
    const baseLimits = {
      memory: 512 * 1024 * 1024, // 512MB
      cpu: 10 // 10%
    };

    return {
      ...baseLimits,
      ...resources
    };
  }

  private restrictNetworkAccess(ports?: Record<string, number>, context?: SecurityContext): Record<string, number> {
    // Filter out restricted ports
    const restrictedPorts = [22, 23, 25, 53, 135, 139, 445, 993, 995];
    const allowedPorts: Record<string, number> = {};

    if (ports) {
      for (const [containerPort, hostPort] of Object.entries(ports)) {
        const portNum = parseInt(containerPort);
        if (!restrictedPorts.includes(portNum)) {
          allowedPorts[containerPort] = hostPort;
        }
      }
    }

    return allowedPorts;
  }

  private restrictFilesystemAccess(volumes?: Record<string, string>, context?: SecurityContext): Record<string, string> {
    // Only allow safe volume mounts
    const allowedVolumes: Record<string, string> = {};
    
    if (volumes) {
      for (const [host, container] of Object.entries(volumes)) {
        if (this.isSafeVolumeMount(host, container)) {
          allowedVolumes[host] = container;
        }
      }
    }

    return allowedVolumes;
  }

  private isSafeVolumeMount(host: string, container: string): boolean {
    const dangerousPaths = ['/var/run/docker.sock', '/proc', '/sys', '/dev', '/etc', '/usr'];
    
    return !dangerousPaths.some(path => 
      host.startsWith(path) || container.startsWith(path)
    );
  }

  private isActionAllowed(action: string, context: SecurityContext): boolean {
    return context.permissions.includes(action);
  }

  private parseMemorySize(size: string): number {
    const units: Record<string, number> = {
      'b': 1,
      'k': 1024,
      'm': 1024 * 1024,
      'g': 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+)([bkmg]?)$/);
    if (!match) return 0;

    const [, value, unit] = match;
    return parseInt(value) * (units[unit] || 1);
  }

  private async storeAuditEntry(entry: any): Promise<void> {
    // In a real implementation, store in audit database
    console.log('Audit entry stored:', entry);
  }

  private async savePolicy(policy: SecurityPolicy): Promise<void> {
    // In a real implementation, save to database
    console.log('Security policy saved:', policy);
  }
}

export interface SecurityViolation {
  type: string;
  rule: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const containerSecurity = ContainerSecurity.getInstance();
export default containerSecurity;