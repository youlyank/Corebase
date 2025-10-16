import { NextResponse } from 'next/server';
import { AgenticPlanner } from '@/lib/agentic/planner';
import { MemoryManager } from '@/lib/memory-manager';

export async function POST(req: Request) {
  try {
    const { goal } = await req.json();

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Goal is required and must be a string' },
        { status: 400 }
      );
    }

    const memory = new MemoryManager('default-project');
    const planner = new AgenticPlanner('default-project');

    // Initialize project memory
    await planner.initializeProjectMemory();

    const plan = await planner.plan(goal);

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error('Planner API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}