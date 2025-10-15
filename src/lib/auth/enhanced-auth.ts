/**
 * Enhanced Authentication Middleware with RBAC Integration
 * Provides comprehensive authentication and authorization for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, generateJWT } from './jwt';
import { rbacSystem } from './rbac/rbac-system';
import { ZAI } from 'z-ai-web-dev-sdk';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  lastLogin: Date;
  isActive: boolean;
}

export interface AuthContext {
  user: AuthenticatedUser;
  sessionId: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface AuthOptions {
  requiredPermissions?: Array<{
    resource: string;
    action: string;
    resourceId?: string;
  }>;
  requireProjectRole?: boolean;
  allowedRoles?: string[];
  skipAuth?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface RateLimitInfo {
  requests: number;
  windowStart: number;
  resetTime: number;
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitInfo>();

/**
 * Enhanced authentication middleware
 */
export async function authenticate(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{ user: AuthenticatedUser; context: AuthContext } | NextResponse> {
  // Skip authentication if explicitly disabled
  if (options.skipAuth) {
    const mockUser: AuthenticatedUser = {
      id: 'anonymous',
      email: 'anonymous@example.com',
      name: 'Anonymous User',
      roles: ['viewer'],
      permissions: ['project.read', 'file.read'],
      lastLogin: new Date(),
      isActive: true
    };

    return {
      user: mockUser,
      context: {
        user: mockUser,
        sessionId: 'anonymous',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
        timestamp: new Date()
      }
    };
  }

  // Check rate limiting
  if (options.rateLimit) {
    const rateLimitResult = await checkRateLimit(request, options.rateLimit);
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  // Extract token from headers
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  try {
    // Verify JWT token
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    // Get user information
    const user = await getUserFromPayload(payload);
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive', code: 'USER_INACTIVE' },
        { status: 401 }
      );
    }

    // Create auth context
    const context: AuthContext = {
      user,
      sessionId: payload.sessionId || generateSessionId(),
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      timestamp: new Date()
    };

    // Check role-based permissions
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      const hasRole = user.roles.some(role => options.allowedRoles!.includes(role));
      if (!hasRole) {
        return NextResponse.json(
          { error: 'Insufficient role permissions', code: 'INSUFFICIENT_ROLE' },
          { status: 403 }
        );
      }
    }

    // Check specific permissions
    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      for (const permission of options.requiredPermissions) {
        const hasPermission = await rbacSystem.hasPermission(
          user.id,
          permission.resource,
          permission.action,
          permission.resourceId,
          { ip: context.ip, userAgent: context.userAgent }
        );

        if (!hasPermission) {
          return NextResponse.json(
            { 
              error: 'Insufficient permissions', 
              code: 'INSUFFICIENT_PERMISSIONS',
              required: permission
            },
            { status: 403 }
          );
        }
      }
    }

    // Update last login
    await updateLastLogin(user.id);

    return { user, context };

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', code: 'AUTH_FAILED' },
      { status: 401 }
    );
  }
}

/**
 * Middleware factory for API routes
 */
export function withAuth(options: AuthOptions = {}) {
  return async (request: NextRequest, ...args: any[]) => {
    const authResult = await authenticate(request, options);
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Add auth context to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', authResult.user.id);
    requestHeaders.set('x-user-email', authResult.user.email);
    requestHeaders.set('x-session-id', authResult.context.sessionId);
    requestHeaders.set('x-user-roles', JSON.stringify(authResult.user.roles));
    requestHeaders.set('x-user-permissions', JSON.stringify(authResult.user.permissions));

    // Create new request with auth headers
    const authRequest = new Request(request.url, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
    });

    // Call the original handler with auth context
    return args[0](authRequest, authResult.context);
  };
}

/**
 * Get user from JWT payload
 */
async function getUserFromPayload(payload: any): Promise<AuthenticatedUser | null> {
  try {
    // In a real implementation, this would fetch from database
    // For now, we'll create a user object from the payload
    const userRoles = await rbacSystem.getUserRoles(payload.userId);
    const userPermissions = await rbacSystem.getUserPermissions(payload.userId);

    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatar: payload.avatar,
      roles: userRoles.map(ur => ur.roleId),
      permissions: userPermissions.map(p => p.id),
      lastLogin: new Date(payload.lastLogin || Date.now()),
      isActive: payload.isActive !== false
    };
  } catch (error) {
    console.error('Error getting user from payload:', error);
    return null;
  }
}

/**
 * Update user last login
 */
async function updateLastLogin(userId: string): Promise<void> {
  try {
    // In a real implementation, this would update the database
    console.log(`Updated last login for user: ${userId}`);
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.ip;

  return forwarded?.split(',')[0] || realIP || clientIP || 'unknown';
}

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check rate limiting
 */
async function checkRateLimit(
  request: NextRequest,
  options: { windowMs: number; maxRequests: number }
): Promise<NextResponse | null> {
  const clientId = getClientIP(request);
  const now = Date.now();
  
  let rateLimitInfo = rateLimitStore.get(clientId);
  
  if (!rateLimitInfo || now - rateLimitInfo.windowStart > options.windowMs) {
    // New window
    rateLimitInfo = {
      requests: 1,
      windowStart: now,
      resetTime: now + options.windowMs
    };
    rateLimitStore.set(clientId, rateLimitInfo);
    return null;
  }
  
  rateLimitInfo.requests++;
  
  if (rateLimitInfo.requests > options.maxRequests) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: rateLimitInfo.resetTime
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': options.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitInfo.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitInfo.resetTime - now) / 1000).toString()
        }
      }
    );
  }
  
  return null;
}

/**
 * Enhanced login with AI-powered security analysis
 */
export async function enhancedLogin(
  email: string,
  password: string,
  context: { ip: string; userAgent: string }
): Promise<{ user: AuthenticatedUser; token: string } | { error: string; code: string }> {
  try {
    // Basic authentication (in production, use proper password hashing)
    const user = await authenticateUser(email, password);
    if (!user) {
      return { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
    }

    // AI-powered security analysis
    const securityAnalysis = await analyzeLoginSecurity(context, user);
    if (securityAnalysis.risk > 0.7) {
      return { error: 'Suspicious login detected', code: 'SUSPICIOUS_LOGIN' };
    }

    // Generate JWT token
    const token = await generateJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      sessionId: generateSessionId(),
      lastLogin: new Date(),
      isActive: user.isActive
    });

    // Update user roles and permissions
    const userRoles = await rbacSystem.getUserRoles(user.id);
    const userPermissions = await rbacSystem.getUserPermissions(user.id);

    const authenticatedUser: AuthenticatedUser = {
      ...user,
      roles: userRoles.map(ur => ur.roleId),
      permissions: userPermissions.map(p => p.id),
      lastLogin: new Date()
    };

    return { user: authenticatedUser, token };

  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Login failed', code: 'LOGIN_FAILED' };
  }
}

/**
 * AI-powered security analysis
 */
async function analyzeLoginSecurity(
  context: { ip: string; userAgent: string },
  user: any
): Promise<{ risk: number; factors: string[] }> {
  try {
    const zai = await ZAI.create();
    
    const prompt = `
    Analyze the security risk of this login attempt:
    
    Context:
    - IP Address: ${context.ip}
    - User Agent: ${context.userAgent}
    - User ID: ${user.id}
    - Email: ${user.email}
    - Last Login: ${user.lastLogin}
    
    Consider factors like:
    - IP location changes
    - Unusual user agents
    - Time since last login
    - Multiple failed attempts
    - Known malicious IPs
    
    Return a JSON response with:
    - risk: number between 0 and 1
    - factors: array of risk factors identified
    `;

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a security analysis AI. Analyze login attempts for security risks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return {
      risk: analysis.risk || 0,
      factors: analysis.factors || []
    };

  } catch (error) {
    console.error('Security analysis error:', error);
    return { risk: 0, factors: [] };
  }
}

/**
 * Authenticate user (mock implementation)
 */
async function authenticateUser(email: string, password: string): Promise<any> {
  // In a real implementation, this would check against the database
  // For demo purposes, we'll accept any email/password
  return {
    id: `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email,
    name: email.split('@')[0],
    isActive: true
  };
}

/**
 * Permission checker helper
 */
export function requirePermission(resource: string, action: string, resourceId?: string) {
  return withAuth({
    requiredPermissions: [{ resource, action, resourceId }]
  });
}

/**
 * Role checker helper
 */
export function requireRole(...roles: string[]) {
  return withAuth({
    allowedRoles: roles
  });
}

/**
 * Project role checker helper
 */
export function requireProjectRole() {
  return withAuth({
    requireProjectRole: true
  });
}

/**
 * Public route helper (no auth required)
 */
export function publicRoute() {
  return withAuth({
    skipAuth: true
  });
}

/**
 * Rate limited route helper
 */
export function rateLimited(windowMs: number, maxRequests: number) {
  return withAuth({
    rateLimit: { windowMs, maxRequests }
  });
}