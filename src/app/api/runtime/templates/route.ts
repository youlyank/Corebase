import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken, rateLimit } from '@/lib/auth/middleware';
import { db } from '@/lib/db';

// Predefined container templates
const CONTAINER_TEMPLATES = [
  {
    id: 'node-18',
    name: 'Node.js 18',
    description: 'Node.js 18 runtime with npm',
    image: 'node:18-alpine',
    category: 'runtime',
    tags: ['node', 'javascript', 'typescript'],
    config: {
      environment: {
        NODE_ENV: 'development'
      },
      ports: {
        '3000': 3000
      },
      resources: {
        memory: 512 * 1024 * 1024, // 512MB
        cpu: 10 // 10%
      },
      workingDir: '/workspace'
    }
  },
  {
    id: 'python-3.11',
    name: 'Python 3.11',
    description: 'Python 3.11 runtime with pip',
    image: 'python:3.11-alpine',
    category: 'runtime',
    tags: ['python', 'pip'],
    config: {
      environment: {
        PYTHONPATH: '/workspace'
      },
      ports: {
        '8000': 8000
      },
      resources: {
        memory: 512 * 1024 * 1024, // 512MB
        cpu: 10 // 10%
      },
      workingDir: '/workspace'
    }
  },
  {
    id: 'postgres-15',
    name: 'PostgreSQL 15',
    description: 'PostgreSQL 15 database server',
    image: 'postgres:15-alpine',
    category: 'database',
    tags: ['postgres', 'sql', 'database'],
    config: {
      environment: {
        POSTGRES_DB: 'app',
        POSTGRES_USER: 'dev',
        POSTGRES_PASSWORD: 'dev123'
      },
      ports: {
        '5432': 5432
      },
      resources: {
        memory: 256 * 1024 * 1024, // 256MB
        cpu: 5 // 5%
      },
      volumes: {
        'postgres_data': '/var/lib/postgresql/data'
      }
    }
  },
  {
    id: 'redis-7',
    name: 'Redis 7',
    description: 'Redis 7 in-memory database',
    image: 'redis:7-alpine',
    category: 'database',
    tags: ['redis', 'cache', 'nosql'],
    config: {
      ports: {
        '6379': 6379
      },
      resources: {
        memory: 128 * 1024 * 1024, // 128MB
        cpu: 5 // 5%
      }
    }
  },
  {
    id: 'nginx-static',
    name: 'Nginx Static',
    description: 'Nginx server for static files',
    image: 'nginx:alpine',
    category: 'static',
    tags: ['nginx', 'static', 'webserver'],
    config: {
      ports: {
        '80': 8080
      },
      resources: {
        memory: 64 * 1024 * 1024, // 64MB
        cpu: 5 // 5%
      },
      volumes: {
        './public': '/usr/share/nginx/html'
      }
    }
  },
  {
    id: 'ubuntu-22.04',
    name: 'Ubuntu 22.04',
    description: 'Ubuntu 22.04 with basic tools',
    image: 'ubuntu:22.04',
    category: 'system',
    tags: ['ubuntu', 'linux', 'bash'],
    config: {
      environment: {
        DEBIAN_FRONTEND: 'noninteractive'
      },
      resources: {
        memory: 256 * 1024 * 1024, // 256MB
        cpu: 10 // 10%
      },
      workingDir: '/workspace'
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 100, 60); // 100 requests per minute
    if (rateLimitResult) return rateLimitResult;

    // Authenticate user (optional for templates)
    const authResult = await authenticateToken(request);
    const user = authResult ? (request as any).user : null;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let templates = CONTAINER_TEMPLATES;

    // Filter by category
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Search by name or tags
    if (search) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Get user's custom templates if authenticated
    let customTemplates = [];
    if (user) {
      try {
        customTemplates = await db.containerTemplate.findMany({
          where: {
            OR: [
              { createdBy: user.id },
              { isPublic: true }
            ]
          },
          orderBy: { createdAt: 'desc' }
        }) || [];
      } catch (error) {
        console.error('Error fetching custom templates:', error);
      }
    }

    return NextResponse.json({
      success: true,
      templates: {
        builtin: templates,
        custom: customTemplates
      },
      total: templates.length + customTemplates.length,
      filters: { category, search }
    });

  } catch (error) {
    console.error('Error getting templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 10, 60); // 10 requests per minute
    if (rateLimitResult) return rateLimitResult;

    // Authenticate user
    const authResult = await authenticateToken(request);
    if (authResult) return authResult;

    const user = (request as any).user;
    const body = await request.json();

    const { name, description, image, category, tags, config, isPublic } = body;

    if (!name || !image || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, image, category' },
        { status: 400 }
      );
    }

    // Create custom template
    const template = await db.containerTemplate.create({
      data: {
        name,
        description,
        image,
        category,
        tags: JSON.stringify(tags || []),
        config: config || {},
        isPublic: isPublic || false,
        createdBy: user.id
      }
    });

    return NextResponse.json({
      success: true,
      template,
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}