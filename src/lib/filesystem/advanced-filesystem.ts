/**
 * Advanced File System Architecture
 * Provides true file sync with versioning, locking, and efficient operations
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Client as MinioClient } from 'minio';
import crypto from 'crypto';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  parentId: string | null;
  projectId: string;
  userId: string;
  size: number;
  hash: string;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  metadata: Record<string, any>;
  children?: FileNode[];
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  hash: string;
  size: number;
  createdAt: Date;
  createdBy: string;
  message?: string;
  storageKey: string;
  metadata: Record<string, any>;
}

export interface FileOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move' | 'rename';
  fileId: string;
  projectId: string;
  userId: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  details: Record<string, any>;
}

export interface FileLock {
  id: string;
  fileId: string;
  userId: string;
  acquiredAt: Date;
  expiresAt: Date;
  type: 'read' | 'write';
}

export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'delete';
  fileId: string;
  projectId: string;
  userId: string;
  priority: number;
  retryCount: number;
  maxRetries: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
}

class AdvancedFileSystem extends EventEmitter {
  private minioClient: MinioClient;
  private fileCache: Map<string, FileNode> = new Map();
  private versionCache: Map<string, FileVersion[]> = new Map();
  private lockCache: Map<string, FileLock> = new Map();
  private syncQueue: SyncOperation[] = [];
  private processingSync = false;
  private readonly MAX_RETRIES = 3;
  private readonly LOCK_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly SYNC_BATCH_SIZE = 10;

  constructor() {
    super();
    this.initializeMinIO();
    this.startSyncProcessor();
    this.startLockCleanup();
  }

  private async initializeMinIO() {
    this.minioClient = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    });

    // Ensure bucket exists
    const bucketName = 'corebase-files';
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(bucketName);
    }
  }

  /**
   * Create a new file or directory
   */
  async createFile(
    name: string,
    type: 'file' | 'directory',
    parentId: string | null,
    projectId: string,
    userId: string,
    content?: Buffer,
    mimeType?: string
  ): Promise<FileNode> {
    const path = this.buildPath(name, parentId);
    const hash = content ? this.calculateHash(content) : '';
    const now = new Date();

    const fileNode: FileNode = {
      id: uuidv4(),
      name,
      type,
      path,
      parentId,
      projectId,
      userId,
      size: content?.length || 0,
      hash,
      mimeType: mimeType || this.getMimeType(name),
      createdAt: now,
      updatedAt: now,
      version: 1,
      isLocked: false,
      metadata: {}
    };

    // Cache the file
    this.fileCache.set(fileNode.id, fileNode);

    // If it's a file with content, store it
    if (type === 'file' && content) {
      await this.storeFileContent(fileNode, content, userId);
    }

    // Update parent directory
    if (parentId) {
      const parent = this.fileCache.get(parentId);
      if (parent && parent.type === 'directory') {
        parent.children = parent.children || [];
        parent.children.push(fileNode);
        parent.updatedAt = now;
      }
    }

    // Record operation
    await this.recordOperation({
      id: uuidv4(),
      type: 'create',
      fileId: fileNode.id,
      projectId,
      userId,
      timestamp: now,
      status: 'completed',
      details: { name, type, parentId }
    });

    this.emit('fileCreated', fileNode);
    return fileNode;
  }

  /**
   * Update file content
   */
  async updateFile(
    fileId: string,
    content: Buffer,
    userId: string,
    message?: string
  ): Promise<FileNode> {
    const fileNode = this.fileCache.get(fileId);
    if (!fileNode) {
      throw new Error('File not found');
    }

    if (fileNode.type !== 'file') {
      throw new Error('Cannot update directory');
    }

    // Check write lock
    if (fileNode.isLocked && fileNode.lockedBy !== userId) {
      throw new Error('File is locked by another user');
    }

    const newHash = this.calculateHash(content);
    const now = new Date();

    // Create new version if content changed
    if (newHash !== fileNode.hash) {
      const version: FileVersion = {
        id: uuidv4(),
        fileId,
        version: fileNode.version + 1,
        hash: newHash,
        size: content.length,
        createdAt: now,
        createdBy: userId,
        message,
        storageKey: `files/${fileId}/v${fileNode.version + 1}`,
        metadata: {}
      };

      // Store version info
      const versions = this.versionCache.get(fileId) || [];
      versions.push(version);
      this.versionCache.set(fileId, versions);

      // Store file content
      await this.storeFileContent(fileNode, content, userId, version.storageKey);

      // Update file node
      fileNode.hash = newHash;
      fileNode.size = content.length;
      fileNode.version = version.version;
      fileNode.updatedAt = now;
    }

    // Record operation
    await this.recordOperation({
      id: uuidv4(),
      type: 'update',
      fileId: fileId,
      projectId: fileNode.projectId,
      userId,
      timestamp: now,
      status: 'completed',
      details: { version: fileNode.version, size: content.length }
    });

    this.emit('fileUpdated', fileNode);
    return fileNode;
  }

  /**
   * Delete file or directory
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const fileNode = this.fileCache.get(fileId);
    if (!fileNode) {
      throw new Error('File not found');
    }

    // Check lock
    if (fileNode.isLocked && fileNode.lockedBy !== userId) {
      throw new Error('File is locked by another user');
    }

    // Recursively delete children if directory
    if (fileNode.type === 'directory' && fileNode.children) {
      for (const child of fileNode.children) {
        await this.deleteFile(child.id, userId);
      }
    }

    // Remove from parent
    if (fileNode.parentId) {
      const parent = this.fileCache.get(fileNode.parentId);
      if (parent && parent.children) {
        parent.children = parent.children.filter(c => c.id !== fileId);
        parent.updatedAt = new Date();
      }
    }

    // Remove from cache
    this.fileCache.delete(fileId);

    // Record operation
    await this.recordOperation({
      id: uuidv4(),
      type: 'delete',
      fileId,
      projectId: fileNode.projectId,
      userId,
      timestamp: new Date(),
      status: 'completed',
      details: { name: fileNode.name, path: fileNode.path }
    });

    this.emit('fileDeleted', fileNode);
  }

  /**
   * Move or rename file
   */
  async moveFile(
    fileId: string,
    newParentId: string | null,
    newName?: string,
    userId: string
  ): Promise<FileNode> {
    const fileNode = this.fileCache.get(fileId);
    if (!fileNode) {
      throw new Error('File not found');
    }

    // Check lock
    if (fileNode.isLocked && fileNode.lockedBy !== userId) {
      throw new Error('File is locked by another user');
    }

    const oldParentId = fileNode.parentId;
    const oldName = fileNode.name;
    const oldPath = fileNode.path;

    // Update file node
    if (newName) {
      fileNode.name = newName;
    }
    fileNode.parentId = newParentId;
    fileNode.path = this.buildPath(fileNode.name, newParentId);
    fileNode.updatedAt = new Date();

    // Remove from old parent
    if (oldParentId) {
      const oldParent = this.fileCache.get(oldParentId);
      if (oldParent && oldParent.children) {
        oldParent.children = oldParent.children.filter(c => c.id !== fileId);
        oldParent.updatedAt = new Date();
      }
    }

    // Add to new parent
    if (newParentId) {
      const newParent = this.fileCache.get(newParentId);
      if (newParent && newParent.type === 'directory') {
        newParent.children = newParent.children || [];
        newParent.children.push(fileNode);
        newParent.updatedAt = new Date();
      }
    }

    // Record operation
    await this.recordOperation({
      id: uuidv4(),
      type: 'move',
      fileId,
      projectId: fileNode.projectId,
      userId,
      timestamp: new Date(),
      status: 'completed',
      details: { oldPath, newPath: fileNode.path, oldName, newName: fileNode.name }
    });

    this.emit('fileMoved', { fileNode, oldPath });
    return fileNode;
  }

  /**
   * Get file content
   */
  async getFileContent(fileId: string, version?: number): Promise<Buffer> {
    const fileNode = this.fileCache.get(fileId);
    if (!fileNode) {
      throw new Error('File not found');
    }

    if (fileNode.type !== 'file') {
      throw new Error('Cannot read directory content');
    }

    let storageKey: string;
    if (version) {
      const versions = this.versionCache.get(fileId) || [];
      const targetVersion = versions.find(v => v.version === version);
      if (!targetVersion) {
        throw new Error('Version not found');
      }
      storageKey = targetVersion.storageKey;
    } else {
      storageKey = `files/${fileId}/current`;
    }

    try {
      const stream = await this.minioClient.getObject('corebase-files', storageKey);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      throw new Error('Failed to retrieve file content');
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(fileId: string): Promise<FileVersion[]> {
    return this.versionCache.get(fileId) || [];
  }

  /**
   * Lock file for editing
   */
  async lockFile(fileId: string, userId: string, type: 'read' | 'write' = 'write'): Promise<FileLock> {
    const fileNode = this.fileCache.get(fileId);
    if (!fileNode) {
      throw new Error('File not found');
    }

    // Check existing lock
    if (fileNode.isLocked && fileNode.lockedBy !== userId) {
      throw new Error('File is already locked');
    }

    const lock: FileLock = {
      id: uuidv4(),
      fileId,
      userId,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + this.LOCK_TIMEOUT),
      type
    };

    // Update file lock status
    fileNode.isLocked = true;
    fileNode.lockedBy = userId;
    fileNode.lockedAt = lock.acquiredAt;

    // Cache lock
    this.lockCache.set(fileId, lock);

    this.emit('fileLocked', { fileNode, lock });
    return lock;
  }

  /**
   * Unlock file
   */
  async unlockFile(fileId: string, userId: string): Promise<void> {
    const fileNode = this.fileCache.get(fileId);
    if (!fileNode) {
      throw new Error('File not found');
    }

    // Check ownership
    if (fileNode.lockedBy !== userId) {
      throw new Error('Only the lock owner can unlock');
    }

    // Clear lock
    fileNode.isLocked = false;
    delete fileNode.lockedBy;
    delete fileNode.lockedAt;

    // Remove from cache
    this.lockCache.delete(fileId);

    this.emit('fileUnlocked', fileNode);
  }

  /**
   * Get directory tree
   */
  async getDirectoryTree(projectId: string, parentId: string | null = null): Promise<FileNode[]> {
    const files = Array.from(this.fileCache.values())
      .filter(f => f.projectId === projectId && f.parentId === parentId);

    // Recursively load children
    for (const file of files) {
      if (file.type === 'directory') {
        file.children = await this.getDirectoryTree(projectId, file.id);
      }
    }

    return files;
  }

  /**
   * Search files
   */
  async searchFiles(
    projectId: string,
    query: string,
    type?: 'file' | 'directory'
  ): Promise<FileNode[]> {
    const files = Array.from(this.fileCache.values())
      .filter(f => 
        f.projectId === projectId &&
        (!type || f.type === type) &&
        f.name.toLowerCase().includes(query.toLowerCase())
      );

    return files;
  }

  /**
   * Get file sync status
   */
  async getSyncStatus(projectId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const operations = this.syncQueue.filter(op => op.projectId === projectId);
    
    return {
      pending: operations.filter(op => op.status === 'queued').length,
      processing: operations.filter(op => op.status === 'processing').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length
    };
  }

  // Private helper methods
  private buildPath(name: string, parentId: string | null): string {
    if (!parentId) return name;
    
    const parent = this.fileCache.get(parentId);
    if (!parent) return name;
    
    return `${parent.path}/${name}`;
  }

  private calculateHash(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private async storeFileContent(
    fileNode: FileNode,
    content: Buffer,
    userId: string,
    storageKey?: string
  ): Promise<void> {
    const key = storageKey || `files/${fileNode.id}/current`;
    
    try {
      await this.minioClient.putObject('corebase-files', key, content, {
        'Content-Type': fileNode.mimeType,
        'X-File-Id': fileNode.id,
        'X-User-Id': userId,
        'X-Project-Id': fileNode.projectId
      });
    } catch (error) {
      throw new Error('Failed to store file content');
    }
  }

  private async recordOperation(operation: FileOperation): Promise<void> {
    // In a real implementation, this would be stored in a database
    this.emit('operationRecorded', operation);
  }

  private startSyncProcessor(): void {
    setInterval(async () => {
      if (!this.processingSync && this.syncQueue.length > 0) {
        await this.processSyncQueue();
      }
    }, 1000);
  }

  private async processSyncQueue(): Promise<void> {
    this.processingSync = true;
    
    try {
      const batch = this.syncQueue
        .filter(op => op.status === 'queued')
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.SYNC_BATCH_SIZE);

      for (const operation of batch) {
        operation.status = 'processing';
        
        try {
          await this.processSyncOperation(operation);
          operation.status = 'completed';
        } catch (error) {
          operation.retryCount++;
          if (operation.retryCount >= operation.maxRetries) {
            operation.status = 'failed';
            operation.error = error instanceof Error ? error.message : 'Unknown error';
          } else {
            operation.status = 'queued';
          }
        }
      }

      // Remove completed operations
      this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
      
    } finally {
      this.processingSync = false;
    }
  }

  private async processSyncOperation(operation: SyncOperation): Promise<void> {
    // Implementation depends on operation type
    switch (operation.type) {
      case 'upload':
        // Handle file upload
        break;
      case 'download':
        // Handle file download
        break;
      case 'delete':
        // Handle file deletion
        break;
    }
  }

  private startLockCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [fileId, lock] of this.lockCache.entries()) {
        if (lock.expiresAt.getTime() < now) {
          const fileNode = this.fileCache.get(fileId);
          if (fileNode) {
            fileNode.isLocked = false;
            delete fileNode.lockedBy;
            delete fileNode.lockedAt;
          }
          this.lockCache.delete(fileId);
          this.emit('lockExpired', { fileId, lock });
        }
      }
    }, 60000); // Check every minute
  }
}

// Singleton instance
export const advancedFileSystem = new AdvancedFileSystem();

export default AdvancedFileSystem;