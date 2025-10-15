import { NextRequest } from 'next/server';
import { Socket } from 'net';
import { taskRunner } from '@/lib/task-runner';

export async function GET(request: NextRequest) {
  // This is a placeholder for WebSocket upgrade
  // In a real implementation, you'd use a WebSocket library like ws or socket.io
  return new Response(
    'WebSocket endpoint for task output streaming. Use socket.io client to connect.',
    { status: 200 }
  );
}

// Task output streaming handler
export async function POST(request: NextRequest) {
  try {
    const { command, options, streamId } = await request.json();

    if (!command || typeof command !== 'string') {
      return Response.json(
        { error: 'Command is required and must be a string' },
        { status: 400 }
      );
    }

    // Set up event listeners for streaming output
    const outputs: any[] = [];
    
    taskRunner.on('stdout', (data) => {
      outputs.push({ type: 'stdout', ...data, timestamp: Date.now() });
    });

    taskRunner.on('stderr', (data) => {
      outputs.push({ type: 'stderr', ...data, timestamp: Date.now() });
    });

    taskRunner.on('complete', (data) => {
      outputs.push({ type: 'complete', ...data, timestamp: Date.now() });
    });

    // Execute the command
    const result = await taskRunner.executeCommand(command, options);

    return Response.json({
      success: true,
      result,
      outputs,
      streamId
    });
  } catch (error) {
    console.error('Task streaming error:', error);
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}