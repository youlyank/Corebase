"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Play, Users, Terminal, Settings } from "lucide-react";

interface TerminalMessage {
  id: string;
  userId: string;
  userName: string;
  type: 'input' | 'output' | 'system';
  content: string;
  timestamp: Date;
  color?: string;
}

interface SharedTerminalProps {
  sessionId: string;
  userId: string;
  projectId: string;
  token: string;
  containerId: string;
}

export default function SharedTerminal({ 
  sessionId, 
  userId, 
  projectId, 
  token, 
  containerId 
}: SharedTerminalProps) {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [command, setCommand] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Array<{ userId: string; userName: string; color: string }>>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalSettings, setTerminalSettings] = useState({
    allowInput: true,
    showUserColors: true,
    autoScroll: true
  });

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Socket.IO connection for shared terminal
    socketRef.current = io('/api/socket/io', {
      auth: { token },
      transports: ['websocket']
    });

    const socket = socketRef.current;

    // Connect to collaboration session
    socket.emit('session:join', { sessionId, role: 'editor' });

    // Listen for connection events
    socket.on('connect', () => {
      setIsConnected(true);
      addSystemMessage('Connected to shared terminal');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      addSystemMessage('Disconnected from shared terminal');
    });

    // Listen for terminal input from other users
    socket.on('terminal:input', (data: { userId: string; command: string; timestamp: string }) => {
      if (data.userId !== userId) {
        const userName = getUserName(data.userId);
        const color = getUserColor(data.userId);
        
        addMessage({
          id: `input-${data.userId}-${Date.now()}`,
          userId: data.userId,
          userName,
          type: 'input',
          content: data.command,
          timestamp: new Date(data.timestamp),
          color
        });
      }
    });

    // Listen for terminal output
    socket.on('terminal:output', (data: { userId: string; output: string; timestamp: string }) => {
      const userName = getUserName(data.userId);
      const color = getUserColor(data.userId);
      
      addMessage({
        id: `output-${data.userId}-${Date.now()}`,
        userId: data.userId,
        userName,
        type: 'output',
        content: data.output,
        timestamp: new Date(data.timestamp),
        color
      });
    });

    // Listen for user events
    socket.on('user:joined', (data: { user: any }) => {
      const userName = getUserName(data.user.userId);
      const color = getUserColor(data.user.userId);
      
      setActiveUsers(prev => [...prev, { 
        userId: data.user.userId, 
        userName, 
        color 
      }]);
      
      addSystemMessage(`${userName} joined the terminal`);
    });

    socket.on('user:left', (data: { userId: string }) => {
      const userName = getUserName(data.userId);
      setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
      addSystemMessage(`${userName} left the terminal`);
    });

    // Listen for session info
    socket.on('session:joined', (data: { activeUsers: any[] }) => {
      const users = data.activeUsers.map(user => ({
        userId: user.userId,
        userName: getUserName(user.userId),
        color: getUserColor(user.userId)
      }));
      setActiveUsers(users);
    });

    return () => {
      socket.emit('session:leave');
      socket.disconnect();
    };
  }, [sessionId, userId, token]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (terminalSettings.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, terminalSettings.autoScroll]);

  const addMessage = useCallback((message: TerminalMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    addMessage({
      id: `system-${Date.now()}`,
      userId: 'system',
      userName: 'System',
      type: 'system',
      content,
      timestamp: new Date(),
      color: '#6B7280'
    });
  }, [addMessage]);

  const executeCommand = useCallback(async () => {
    if (!command.trim() || !terminalSettings.allowInput) return;

    setIsExecuting(true);
    
    // Emit command to all users
    if (socketRef.current) {
      socketRef.current.emit('terminal:input', { command });
    }

    // Add own command to messages
    addMessage({
      id: `input-${userId}-${Date.now()}`,
      userId,
      userName: getUserName(userId),
      type: 'input',
      content: command,
      timestamp: new Date(),
      color: getUserColor(userId)
    });

    try {
      // Simulate command execution (replace with actual terminal logic)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const output = generateCommandOutput(command);
      
      // Emit output to all users
      if (socketRef.current) {
        socketRef.current.emit('terminal:output', { output });
      }

    } catch (error) {
      const errorMsg = `Error: ${error}`;
      
      if (socketRef.current) {
        socketRef.current.emit('terminal:output', { output: errorMsg });
      }
    } finally {
      setIsExecuting(false);
      setCommand("");
    }
  }, [command, terminalSettings.allowInput, userId, addMessage]);

  const generateCommandOutput = (cmd: string): string => {
    // Simulate different command outputs
    const commands = cmd.split(' ');
    const mainCommand = commands[0];

    switch (mainCommand) {
      case 'ls':
        return `file1.js\nfile2.py\ndirectory/\nREADME.md`;
      case 'pwd':
        return '/workspace/project';
      case 'whoami':
        return getUserName(userId);
      case 'date':
        return new Date().toString();
      case 'help':
        return 'Available commands: ls, pwd, whoami, date, help, echo';
      case 'echo':
        return commands.slice(1).join(' ');
      default:
        return `Command not found: ${mainCommand}. Type 'help' for available commands.`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  const clearTerminal = () => {
    setMessages([]);
    addSystemMessage('Terminal cleared');
  };

  const renderMessage = (message: TerminalMessage) => {
    const isOwnMessage = message.userId === userId;
    const showUser = terminalSettings.showUserColors && message.type !== 'system';

    return (
      <div key={message.id} className="flex flex-col space-y-1">
        {showUser && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: message.color }}
            />
            <span>{message.userName}</span>
            <span>{message.timestamp.toLocaleTimeString()}</span>
          </div>
        )}
        <div className={`font-mono text-sm ${
          message.type === 'input' ? 'text-blue-400' : 
          message.type === 'system' ? 'text-gray-500 italic' : 
          'text-green-400'
        }`}>
          {message.type === 'input' && <span>$ </span>}
          {message.content}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Terminal className="h-4 w-4" />
            Shared Terminal
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="text-xs text-muted-foreground">
                {activeUsers.length + 1} users
              </span>
            </div>
            <Button
              onClick={clearTerminal}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          </div>
        </div>
        
        {/* Active Users */}
        {activeUsers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeUsers.map(user => (
              <Badge key={user.userId} variant="secondary" className="text-xs">
                <div 
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: user.color }}
                />
                {user.userName}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-3 space-y-3">
        <ScrollArea 
          ref={terminalRef}
          className="h-64 w-full rounded-md border bg-black p-3 font-mono text-sm"
        >
          <div className="space-y-2">
            {messages.map(renderMessage)}
            {isExecuting && (
              <div className="flex items-center gap-2 text-green-400">
                <div className="animate-pulse">Executing...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="space-y-2">
          <Textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={terminalSettings.allowInput ? "Enter command..." : "Terminal input is disabled"}
            disabled={!terminalSettings.allowInput || isExecuting}
            className="min-h-[60px] font-mono text-sm"
          />
          
          <div className="flex items-center justify-between">
            <Button
              onClick={executeCommand}
              disabled={!terminalSettings.allowInput || isExecuting || !command.trim()}
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="h-3 w-3" />
              {isExecuting ? "Executing..." : "Run"}
            </Button>
            
            <Button
              onClick={() => setTerminalSettings(prev => ({ ...prev, showUserColors: !prev.showUserColors }))}
              variant="outline"
              size="sm"
            >
              <Settings className="h-3 w-3" />
              {terminalSettings.showUserColors ? "Hide" : "Show"} Colors
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function getUserName(userId: string): string {
  return userId.split('-')[0] || 'Anonymous';
}