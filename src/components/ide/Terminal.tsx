'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useIDEStore } from '@/lib/ide/store';
import { ideSyncManager } from '@/lib/ide/sync';
import { ideAPIManager } from '@/lib/ide/api';

interface XTermTerminalProps {
  containerId?: string;
  height?: string | number;
}

export const XTermTerminal: React.FC<XTermTerminalProps> = ({
  containerId,
  height = '100%'
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const {
    addTerminalOutput,
    createTerminalSession,
    closeTerminalSession,
    activeTerminalId,
    container
  } = useIDEStore();

  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#e1e4e8',
        cursor: '#58a6ff',
        selection: '#264f78',
        black: '#0d1117',
        red: '#f85149',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#e1e4e8',
        brightBlack: '#484f58',
        brightRed: '#ff7b72',
        brightGreen: '#3fb950',
        brightYellow: '#d29922',
        brightBlue: '#58a6ff',
        brightMagenta: '#bc8cff',
        brightCyan: '#39c5cf',
        brightWhite: '#e1e4e8'
      },
      fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      tabStopWidth: 4
    });

    // Create and load addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    
    // Store references
    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Mount terminal
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Handle terminal input
    terminal.onData((data) => {
      handleTerminalInput(data);
    });

    // Handle terminal resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, []);

  const handleTerminalInput = useCallback(async (data: string) => {
    if (!sessionId || !containerId) return;

    try {
      // Send input to container via WebSocket
      if (container?.status === 'running') {
        ideSyncManager.sendTerminalInput(sessionId, data);
      } else {
        // Show error if container is not running
        const terminal = terminalInstanceRef.current;
        if (terminal) {
          terminal.write('\r\n\x1b[31m[ERROR]\x1b[0m Container is not running. Start the container to execute commands.\r\n');
        }
      }
    } catch (error) {
      console.error('Error sending terminal input:', error);
    }
  }, [sessionId, containerId, container]);

  const connectToContainer = useCallback(async () => {
    if (!containerId || !container) return;

    try {
      setIsConnected(true);
      
      // Create terminal session
      const session = createTerminalSession(containerId);
      setSessionId(session.id);
      
      // Show welcome message
      const terminal = terminalInstanceRef.current;
      if (terminal) {
        terminal.writeln('\x1b[32m[CoreBase IDE]\x1b[0m Terminal connected');
        terminal.writeln(`Container: ${container.name}`);
        terminal.writeln(`Status: ${container.status}`);
        terminal.writeln('');
        terminal.write('\x1b[36m$\x1b[0m ');
      }

      // Start listening for terminal output via WebSocket
      if (container.status === 'running') {
        ideSyncManager.createTerminalSession(containerId);
      }

    } catch (error) {
      console.error('Error connecting to container:', error);
      setIsConnected(false);
      
      const terminal = terminalInstanceRef.current;
      if (terminal) {
        terminal.writeln('\x1b[31m[ERROR]\x1b[0m Failed to connect to container');
        terminal.writeln('');
        terminal.write('\x1b[36m$\x1b[0m ');
      }
    }
  }, [containerId, container, createTerminalSession]);

  const disconnectFromContainer = useCallback(() => {
    if (sessionId) {
      closeTerminalSession(sessionId);
      setSessionId(null);
    }
    setIsConnected(false);
    
    const terminal = terminalInstanceRef.current;
    if (terminal) {
      terminal.writeln('\x1b[33m[INFO]\x1b[0m Terminal disconnected');
      terminal.writeln('');
      terminal.write('\x1b[36m$\x1b[0m ');
    }
  }, [sessionId, closeTerminalSession]);

  // Initialize terminal on mount
  useEffect(() => {
    const cleanup = initializeTerminal();
    return cleanup;
  }, [initializeTerminal]);

  // Connect/disconnect when container changes
  useEffect(() => {
    if (containerId && container) {
      connectToContainer();
    } else {
      disconnectFromContainer();
    }
  }, [containerId, container, connectToContainer, disconnectFromContainer]);

  // Handle WebSocket messages for terminal output
  useEffect(() => {
    if (!sessionId) return;

    const handleTerminalOutput = (data: { sessionId: string; output: string }) => {
      if (data.sessionId === sessionId) {
        const terminal = terminalInstanceRef.current;
        if (terminal) {
          terminal.write(data.output);
        }
        addTerminalOutput(sessionId, data.output);
      }
    };

    // Listen for terminal output events
    // This would be handled by the WebSocket connection in the sync manager
    // For now, we'll simulate it with the store
    
    return () => {
      // Cleanup listeners
    };
  }, [sessionId, addTerminalOutput]);

  // Fit terminal when container resizes
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, []);

  const clearTerminal = useCallback(() => {
    const terminal = terminalInstanceRef.current;
    if (terminal) {
      terminal.clear();
      terminal.write('\x1b[36m$\x1b[0m ');
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    const terminal = terminalInstanceRef.current;
    if (terminal) {
      const selection = terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-gray-300">
            Terminal {sessionId && `(${sessionId.slice(-8)})`}
          </span>
          {container && (
            <span className="text-xs text-gray-500">
              • {container.name} • {container.status}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearTerminal}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={copyToClipboard}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Copy
          </button>
          {isConnected ? (
            <button
              onClick={disconnectFromContainer}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectToContainer}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              disabled={!container || container.status !== 'running'}
            >
              Connect
            </button>
          )}
        </div>
      </div>
      
      {/* Terminal */}
      <div className="flex-1 p-2">
        <div 
          ref={terminalRef} 
          className="h-full"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        />
      </div>
    </div>
  );
};