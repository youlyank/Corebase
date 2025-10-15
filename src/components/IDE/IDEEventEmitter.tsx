"use client";
import { useEffect, useRef } from "react";
import { useRuntimeSocket } from "@/hooks/useRuntimeSocket";

interface IDEEventEmitterProps {
  projectId: string;
  userId: string;
}

export default function IDEEventEmitter({ projectId, userId }: IDEEventEmitterProps) {
  const socket = useRuntimeSocket(projectId);
  const eventQueue = useRef<any[]>([]);

  useEffect(() => {
    // Connect to Socket.IO runtime channel
    socket.emit("join", { projectId });

    // Flush queued events when connected
    socket.on("connected", () => {
      eventQueue.current.forEach(event => {
        socket.emit("ide:event", event);
      });
      eventQueue.current = [];
    });

    return () => {
      socket.disconnect();
    };
  }, [socket, projectId]);

  // File save event
  const emitFileSave = (filePath: string, content: string) => {
    const event = {
      type: "file.saved",
      projectId,
      userId,
      path: filePath,
      content,
      timestamp: new Date().toISOString()
    };

    if (socket.connected) {
      socket.emit("ide:event", event);
    } else {
      eventQueue.current.push(event);
    }
  };

  // Terminal command event
  const emitTerminalCommand = (command: string, output: string) => {
    const event = {
      type: "terminal.output",
      projectId,
      data: { command, output, timestamp: new Date().toISOString() }
    };

    if (socket.connected) {
      socket.emit("ide:event", event);
    } else {
      eventQueue.current.push(event);
    }
  };

  // Code edit event
  const emitCodeEdit = (filePath: string, changes: any) => {
    const event = {
      type: "code.edited",
      projectId,
      userId,
      data: { filePath, changes, timestamp: new Date().toISOString() }
    };

    if (socket.connected) {
      socket.emit("ide:event", event);
    } else {
      eventQueue.current.push(event);
    }
  };

  // Expose methods via ref or context
  useEffect(() => {
    // Make these methods available globally for IDE components
    (window as any).ideEvents = {
      emitFileSave,
      emitTerminalCommand,
      emitCodeEdit
    };
  }, []);

  return null; // This component doesn't render anything
}