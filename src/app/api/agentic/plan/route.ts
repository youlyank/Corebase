import { NextRequest, NextResponse } from 'next/server';
import { AgenticPlanner } from '@/lib/agentic-planner';

export async function POST(request: NextRequest) {
  try {
    const { goal, projectId } = await request.json();

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json(
        { error: 'Goal is required and must be a string' },
        { status: 400 }
      );
    }

    const planner = new AgenticPlanner(projectId || 'default-project');
    
    // Initialize project memory
    await planner.initializeProjectMemory();
    
    // Create plan
    const plan = await planner.createPlan(goal);

    return NextResponse.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Agentic planning error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default-project';

    // Get recent plans and memory context
    const planner = new AgenticPlanner(projectId);
    
    // For now, return a simple status
    return NextResponse.json({
      success: true,
      status: 'ready',
      projectId
    });
  } catch (error) {
    console.error('Agentic status error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}