export type RuntimeEvent =
  | { type: "container.status"; projectId: string; data: any }
  | { type: "file.saved"; projectId: string; userId: string; path: string }
  | { type: "terminal.output"; projectId: string; data: string }
  | { type: "health.update"; projectId: string; data: any }
  | { type: "activity.log"; projectId: string; data: any };

// Collaboration Events
export type CollaborationEvent =
  | { type: "collaboration.user_joined"; projectId: string; data: { sessionId: string; userId: string; role: string; activeUsers: number } }
  | { type: "collaboration.user_left"; projectId: string; data: { sessionId: string; userId: string; activeUsers: number } }
  | { type: "collaboration.user_disconnected"; projectId: string; data: { sessionId: string; userId: string; activeUsers: number } }
  | { type: "collaboration.cursor_updated"; projectId: string; data: { sessionId: string; userId: string; cursor: { line: number; column: number; filePath: string } } }
  | { type: "collaboration.file_changed"; projectId: string; data: { sessionId: string; userId: string; filePath: string; content: string; changes: any } }
  | { type: "collaboration.terminal_input"; projectId: string; data: { sessionId: string; userId: string; command: string } }
  | { type: "collaboration.terminal_output"; projectId: string; data: { sessionId: string; userId: string; output: string } }
  | { type: "collaboration.user_typing"; projectId: string; data: { sessionId: string; userId: string; filePath: string; isTyping: boolean } }
  | { type: "collaboration.user_presence"; projectId: string; data: { sessionId: string; userId: string; status: 'online' | 'away' | 'offline' } }
  | { type: "collaboration.session_created"; projectId: string; data: { sessionId: string; name: string; containerId: string; settings: any } }
  | { type: "collaboration.session_ended"; projectId: string; data: { sessionId: string; reason: string } };

// IDE Events
export type IDEEvent =
  | { type: "ide.file_opened"; projectId: string; userId: string; data: { filePath: string; content: string } }
  | { type: "ide.file_closed"; projectId: string; userId: string; data: { filePath: string } }
  | { type: "ide.file_modified"; projectId: string; userId: string; data: { filePath: string; changes: any } }
  | { type: "ide.cursor_moved"; projectId: string; userId: string; data: { filePath: string; line: number; column: number } }
  | { type: "ide.selection_changed"; projectId: string; userId: string; data: { filePath: string; selection: { start: any; end: any } } }
  | { type: "ide.error_occurred"; projectId: string; userId: string; data: { error: string; filePath?: string; line?: number } }
  | { type: "ide.completion_triggered"; projectId: string; userId: string; data: { filePath: string; position: any; context: string } };

// Workspace Events
export type WorkspaceEvent =
  | { type: "workspace.snapshot_created"; projectId: string; data: { snapshotId: string; name: string; description: string } }
  | { type: "workspace.snapshot_restored"; projectId: string; data: { snapshotId: string; restoredBy: string } }
  | { type: "workspace.settings_changed"; projectId: string; data: { settings: any; changedBy: string } }
  | { type: "workspace.container_started"; projectId: string; data: { containerId: string; image: string; startedBy: string } }
  | { type: "workspace.container_stopped"; projectId: string; data: { containerId: string; stoppedBy: string } };

// Combined Event Type
export type ProjectEvent = RuntimeEvent | CollaborationEvent | IDEEvent | WorkspaceEvent;