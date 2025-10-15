import { NextRequest, NextResponse } from 'next/server';
import { taskRunner } from '@/lib/task-runner';

export async function POST(request: NextRequest) {
  try {
    const { command, options } = await request.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'Command is required and must be a string' },
        { status: 400 }
      );
    }

    // Execute the command
    const result = await taskRunner.executeCommand(command, options);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Task execution error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const activeTasks = taskRunner.getActiveTasks();
    const taskHistory = taskRunner.getTaskHistory();

    return NextResponse.json({
      activeTasks,
      taskHistory: taskHistory.slice(-10) // Last 10 tasks
    });
  } catch (error) {
    console.error('Task status error:', error);
    return NextResponse.json(
      { error: 'Failed to get task status' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    taskRunner.killAllTasks();
    taskRunner.clearHistory();
    
    return NextResponse.json({
      success: true,
      message: 'All tasks killed and history cleared'
    });
  } catch (error) {
    console.error('Task cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup tasks' },
      { status: 500 }
    );
  }
}