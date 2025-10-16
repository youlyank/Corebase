'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Plus, Trash2, Edit3, FilePlus, FolderPlus } from 'lucide-react';
import { useIDEStore } from '@/lib/ide/store';
import { ideAPIManager } from '@/lib/ide/api';
import { ideSyncManager } from '@/lib/ide/sync';

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  language?: string;
  size?: number;
  modifiedAt?: string;
  children?: FileNode[];
  isExpanded?: boolean;
}

interface FileExplorerProps {
  projectId: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectId }) => {
  const [files, setLocalFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileNode | null;
  } | null>(null);
  const [newItemDialog, setNewItemDialog] = useState<{
    type: 'file' | 'folder';
    parentId: string;
    name: string;
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    nodeId: string;
    name: string;
  } | null>(null);

  const {
    openTab,
    currentFile,
    setFiles,
    projectId: storeProjectId
  } = useIDEStore();

  // Load files when project changes
  useEffect(() => {
    if (projectId) {
      loadFiles();
    }
  }, [projectId]);

  const loadFiles = async () => {
    try {
      const response = await ideAPIManager.loadFiles(projectId);
      const fileTree = buildFileTree(response);
      setLocalFiles(fileTree);
      setFiles(response);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const buildFileTree = (flatFiles: any[]): FileNode[] => {
    const tree: FileNode[] = [];
    const map = new Map<string, FileNode>();

    // Create nodes
    flatFiles.forEach(file => {
      const node: FileNode = {
        id: file.id,
        name: file.name,
        path: file.path,
        type: file.isDirectory ? 'directory' : 'file',
        content: file.content,
        language: file.language,
        size: file.size,
        modifiedAt: file.modifiedAt,
        children: []
      };
      map.set(file.id, node);
    });

    // Build tree structure
    flatFiles.forEach(file => {
      const node = map.get(file.id);
      if (node && file.parentId) {
        const parent = map.get(file.parentId);
        if (parent && parent.type === 'directory') {
          parent.children!.push(node);
        }
      } else if (node) {
        tree.push(node);
      }
    });

    // Sort files and folders
    const sortNodes = (nodes: FileNode[]) => {
      return nodes.sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });
    };

    return sortNodes(tree.map(node => {
      if (node.children) {
        node.children = sortNodes(node.children);
      }
      return node;
    }));
  };

  const toggleFolder = useCallback((nodeId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const handleFileClick = useCallback(async (node: FileNode) => {
    if (node.type === 'file') {
      try {
        // Load file content if not already loaded
        if (!node.content) {
          const content = await ideAPIManager.loadFileContent(node.id);
          node.content = content;
        }
        
        openTab(node);
      } catch (error) {
        console.error('Error loading file:', error);
      }
    } else {
      toggleFolder(node.id);
    }
  }, [openTab, toggleFolder]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const createNewItem = useCallback(async (type: 'file' | 'folder', parentId: string, name: string) => {
    try {
      if (type === 'file') {
        await ideAPIManager.createFile(projectId, '', name, '');
      } else {
        // For folders, we'd need a specific API endpoint
        console.log('Creating folder:', name);
      }
      
      await loadFiles();
      setNewItemDialog(null);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  }, [projectId]);

  const deleteItem = useCallback(async (nodeId: string) => {
    try {
      await ideAPIManager.deleteFile(nodeId);
      await loadFiles();
      closeContextMenu();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }, [loadFiles, closeContextMenu]);

  const renameItem = useCallback(async (nodeId: string, newName: string) => {
    try {
      await ideAPIManager.renameFile(nodeId, newName);
      await loadFiles();
      setRenameDialog(null);
      closeContextMenu();
    } catch (error) {
      console.error('Error renaming item:', error);
    }
  }, [loadFiles, closeContextMenu]);

  const renderFileNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = currentFile?.id === node.id;
    const isDirectory = node.type === 'directory';

    return (
      <div key={node.id}>
        <div
          className={`flex items-center px-2 py-1 hover:bg-gray-800 cursor-pointer group ${
            isSelected ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {isDirectory && (
            <span className="mr-1">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              )}
            </span>
          )}
          
          <span className="mr-2">
            {isDirectory ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 text-blue-400" />
              )
            ) : (
              <File className="w-4 h-4 text-gray-400" />
            )}
          </span>
          
          <span className={`text-sm truncate flex-1 ${
            isSelected ? 'text-blue-400' : 'text-gray-300'
          }`}>
            {node.name}
          </span>
          
          {!isDirectory && node.size && (
            <span className="text-xs text-gray-500 ml-2">
              {formatFileSize(node.size)}
            </span>
          )}
        </div>
        
        {isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [closeContextMenu]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-300">Explorer</span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setNewItemDialog({ type: 'file', parentId: 'root', name: '' })}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="New File"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setNewItemDialog({ type: 'folder', parentId: 'root', name: '' })}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={loadFiles}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-4xl mb-2">📁</div>
            <div className="text-sm">No files yet</div>
            <div className="text-xs mt-1">Create your first file to get started</div>
          </div>
        ) : (
          <div className="py-2">
            {files.map(node => renderFileNode(node))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node && (
            <>
              <button
                onClick={() => {
                  setRenameDialog({ nodeId: contextMenu.node!.id, name: contextMenu.node!.name });
                  closeContextMenu();
                }}
                className="flex items-center px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 w-full text-left"
              >
                <Edit3 className="w-3 h-3 mr-2" />
                Rename
              </button>
              <button
                onClick={() => deleteItem(contextMenu.node!.id)}
                className="flex items-center px-3 py-1 text-sm text-red-400 hover:bg-gray-700 w-full text-left"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </button>
              <div className="border-t border-gray-700 my-1" />
            </>
          )}
          <button
            onClick={() => {
              setNewItemDialog({ 
                type: 'file', 
                parentId: contextMenu.node?.id || 'root', 
                name: '' 
              });
              closeContextMenu();
            }}
            className="flex items-center px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 w-full text-left"
          >
            <FilePlus className="w-3 h-3 mr-2" />
            New File
          </button>
          <button
            onClick={() => {
              setNewItemDialog({ 
                type: 'folder', 
                parentId: contextMenu.node?.id || 'root', 
                name: '' 
              });
              closeContextMenu();
            }}
            className="flex items-center px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 w-full text-left"
          >
            <FolderPlus className="w-3 h-3 mr-2" />
            New Folder
          </button>
        </div>
      )}

      {/* New Item Dialog */}
      {newItemDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-md p-4 w-80">
            <h3 className="text-lg font-medium text-gray-200 mb-3">
              Create New {newItemDialog.type === 'file' ? 'File' : 'Folder'}
            </h3>
            <input
              type="text"
              placeholder={`Enter ${newItemDialog.type} name...`}
              value={newItemDialog.name}
              onChange={(e) => setNewItemDialog({ ...newItemDialog, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createNewItem(newItemDialog.type, newItemDialog.parentId, newItemDialog.name);
                } else if (e.key === 'Escape') {
                  setNewItemDialog(null);
                }
              }}
            />
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => setNewItemDialog(null)}
                className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => createNewItem(newItemDialog.type, newItemDialog.parentId, newItemDialog.name)}
                disabled={!newItemDialog.name.trim()}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {renameDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-md p-4 w-80">
            <h3 className="text-lg font-medium text-gray-200 mb-3">Rename</h3>
            <input
              type="text"
              value={renameDialog.name}
              onChange={(e) => setRenameDialog({ ...renameDialog, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameItem(renameDialog.nodeId, renameDialog.name);
                } else if (e.key === 'Escape') {
                  setRenameDialog(null);
                }
              }}
            />
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => setRenameDialog(null)}
                className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => renameItem(renameDialog.nodeId, renameDialog.name)}
                disabled={!renameDialog.name.trim()}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};