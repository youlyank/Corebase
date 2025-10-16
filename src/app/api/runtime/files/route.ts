import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authMiddleware } from '@/lib/auth/middleware';

// GET /api/runtime/files - List files in a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get files for this project
    const files = await db.file.findMany({
      where: {
        projectId: projectId
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform to include directory structure
    const fileTree = buildFileTree(files);
    
    return NextResponse.json(fileTree);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}

// POST /api/runtime/files - Create a new file
export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, path, name, content = '' } = await request.json();
    
    if (!projectId || !name) {
      return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 });
    }

    // Create file record
    const file = await db.file.create({
      data: {
        name,
        path: path || '',
        content,
        mimeType: getMimeType(name),
        size: Buffer.byteLength(content, 'utf8'),
        userId: user.id,
        projectId
      }
    });

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error creating file:', error);
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 });
  }
}

function buildFileTree(files: any[]): any[] {
  const tree: any[] = [];
  const map = new Map();

  // Create file nodes
  files.forEach(file => {
    const node = {
      id: file.id,
      name: file.name,
      path: file.path,
      type: 'file',
      content: file.content,
      language: getLanguageFromExtension(file.name),
      size: file.size,
      modifiedAt: file.updatedAt,
      children: []
    };
    map.set(file.id, node);
  });

  // Build tree structure (simplified - in production, handle directories properly)
  files.forEach(file => {
    const node = map.get(file.id);
    if (node) {
      tree.push(node);
    }
  });

  return tree.sort((a, b) => a.name.localeCompare(b.name));
}

function getMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'md': 'text/markdown',
    'py': 'text/x-python',
    'java': 'text/x-java-source',
    'cpp': 'text/x-c++src',
    'c': 'text/x-csrc',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'php': 'application/x-httpd-php',
    'rb': 'text/x-ruby',
    'swift': 'text/x-swift',
    'kt': 'text/x-kotlin',
    'scala': 'text/x-scala',
    'sh': 'application/x-sh',
    'bash': 'application/x-sh',
    'zsh': 'application/x-sh',
    'fish': 'application/x-fish',
    'sql': 'application/sql',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    'toml': 'application/x-toml',
    'ini': 'text/plain',
    'xml': 'application/xml',
    'vue': 'text/x-vue',
    'svelte': 'text/x-svelte'
  };
  
  return mimeTypes[extension || ''] || 'text/plain';
}

function getLanguageFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'dockerfile': 'dockerfile',
    'docker': 'dockerfile',
    'vue': 'vue',
    'svelte': 'svelte'
  };
  
  return languageMap[extension || ''] || 'plaintext';
}