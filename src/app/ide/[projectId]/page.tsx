'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useIDEStore } from '@/lib/ide/store';
import { ideSyncManager } from '@/lib/ide/sync';
import { ideAPIManager } from '@/lib/ide/api';
import { MonacoEditor } from '@/components/ide/Editor';
import { XTermTerminal } from '@/components/ide/Terminal';
import { FileExplorer } from '@/components/ide/FileExplorer';
import { MetricsPanel } from '@/components/ide/MetricsPanel';
import { CollaborationPanel } from '@/components/ide/CollaborationPanel';
import { X, Maximize2, Minimize2, Terminal, Folder, Users, Activity } from 'lucide-react';

export default function IDEPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const {
    project,
    container,
    setProject,
    setContainer,
    connectSocket,
    disconnectSocket,
    openTabs,
    activeTabId,
    closeTab,
    setActiveTab,
    showTerminal,
    showExplorer,
    toggleTerminal,
    toggleExplorer,
    sidebarWidth,
    setSidebarWidth,
    terminalHeight,
    setTerminalHeight
  } = useIDEStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load project and container data
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load project
        const projectData = await ideAPIManager.getProject(projectId);
        setProject(projectId, projectData);

        // Load or create container
        let containerData = await ideAPIManager.getContainer(projectId);
        
        if (!containerData) {
          // Create a new container for this project
          const templates = await ideAPIManager.getTemplates();
          const defaultTemplate = templates.find(t => t.category === 'node') || templates[0];
          
          if (defaultTemplate) {
            containerData = await ideAPIManager.createContainer(projectId, defaultTemplate.id);
          }
        }

        setContainer(containerData);

        // Connect WebSocket for real-time collaboration
        connectSocket(projectId);

      } catch (err) {
        console.error('Error loading project data:', err);
        setError('Failed to load project. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadProjectData();
    }

    return () => {
      disconnectSocket();
    };
  }, [projectId, setProject, setContainer, connectSocket, disconnectSocket]);

  // Handle sidebar resize
  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle terminal resize
  const handleTerminalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTerminal(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const terminalElement = document.getElementById('terminal-panel');
      if (terminalElement) {
        const rect = terminalElement.getBoundingClientRect();
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight >= 100 && newHeight <= 500) {
          setTerminalHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingTerminal(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <div className="text-xl text-gray-300">Loading IDE...</div>
          <div className="text-sm text-gray-500 mt-2">Setting up your development environment</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl text-red-400">Error</div>
          <div className="text-sm text-gray-300 mt-2">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-medium">
            {project?.name || 'CoreBase IDE'}
          </h1>
          {container && (
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                container.status === 'running' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-400">
                {container.status}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleExplorer}
            className={`p-2 rounded ${showExplorer ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            title="Toggle Explorer"
          >
            <Folder className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTerminal}
            className={`p-2 rounded ${showTerminal ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            title="Toggle Terminal"
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-gray-700"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showExplorer && (
          <div 
            className="flex-shrink-0 bg-gray-900 border-r border-gray-800"
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <FileExplorer projectId={projectId} />
              </div>
              <div className="border-t border-gray-800">
                <MetricsPanel containerId={container?.id} />
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Resize Handle */}
        {showExplorer && (
          <div
            className="w-1 bg-gray-800 cursor-col-resize hover:bg-blue-600 transition-colors"
            onMouseDown={handleSidebarMouseDown}
          />
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex items-center bg-gray-800 border-b border-gray-700">
            <div className="flex flex-1 overflow-x-auto">
              {openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`flex items-center px-3 py-2 border-r border-gray-700 cursor-pointer group ${
                    activeTabId === tab.id ? 'bg-gray-900' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="text-sm truncate mr-2">{tab.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-gray-600 rounded p-0.5 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1">
            <MonacoEditor />
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div 
              id="terminal-panel"
              className="border-t border-gray-800"
              style={{ height: `${terminalHeight}px` }}
            >
              <XTermTerminal containerId={container?.id} />
              
              {/* Terminal Resize Handle */}
              <div
                className="h-1 bg-gray-800 cursor-row-resize hover:bg-blue-600 transition-colors"
                onMouseDown={handleTerminalMouseDown}
              />
            </div>
          )}
        </div>

        {/* Collaboration Panel */}
        <div className="w-80 border-l border-gray-800">
          <CollaborationPanel projectId={projectId} />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>CoreBase IDE v1.0</span>
          {container && (
            <span className="flex items-center space-x-1">
              <Activity className="w-3 h-3" />
              <span>{container.status}</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>{openTabs.length} tabs</span>
          <span>Ready</span>
        </div>
      </footer>
    </div>
  );
}