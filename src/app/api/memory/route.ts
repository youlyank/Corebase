import { NextRequest, NextResponse } from 'next/server';
import { MemoryManager } from '@/lib/memory-manager';
import { MemoryType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default-project';
    const type = searchParams.get('type') as MemoryType;
    const query = searchParams.get('query');

    const memoryManager = new MemoryManager(projectId);

    if (query) {
      // Search memory
      const results = await memoryManager.searchMemory(query, type);
      return NextResponse.json({ success: true, results });
    } else if (type) {
      // Get memory by type
      const memories = await memoryManager.getMemoryByType(type);
      return NextResponse.json({ success: true, memories });
    } else {
      // Get all contextual memory
      const allMemory = await memoryManager.getAllContextualMemory();
      return NextResponse.json({ success: true, memory: allMemory });
    }
  } catch (error) {
    console.error('Memory retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve memory', success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, type, key, value, embedding, metadata } = await request.json();

    if (!type || !key || value === undefined) {
      return NextResponse.json(
        { error: 'Type, key, and value are required', success: false },
        { status: 400 }
      );
    }

    const memoryManager = new MemoryManager(projectId || 'default-project');
    const memory = await memoryManager.storeMemory(
      type as MemoryType,
      key,
      value,
      embedding,
      metadata
    );

    return NextResponse.json({ success: true, memory });
  } catch (error) {
    console.error('Memory storage error:', error);
    return NextResponse.json(
      { error: 'Failed to store memory', success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default-project';
    const type = searchParams.get('type') as MemoryType;
    const key = searchParams.get('key');

    if (!type || !key) {
      return NextResponse.json(
        { error: 'Type and key are required', success: false },
        { status: 400 }
      );
    }

    const memoryManager = new MemoryManager(projectId);
    await memoryManager.deleteMemory(type as MemoryType, key);

    return NextResponse.json({ success: true, message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Memory deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory', success: false },
      { status: 500 }
    );
  }
}