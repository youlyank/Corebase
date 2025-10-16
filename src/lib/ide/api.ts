import { useIDEStore } from './store';

export class IDEAPIManager {
  private baseURL = '/api';
  
  // File operations
  async loadFiles(projectId: string) {
    try {
      const response = await fetch(`${this.baseURL}/storage/files?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to load files');
      
      const files = await response.json();
      return files;
    } catch (error) {
      console.error('Error loading files:', error);
      throw error;
    }
  }
  
  async loadFileContent(fileId: string) {
    try {
      const response = await fetch(`${this.baseURL}/storage/files/${fileId}/content`);
      if (!response.ok) throw new Error('Failed to load file content');
      
      const content = await response.text();
      return content;
    } catch (error) {
      console.error('Error loading file content:', error);
      throw error;
    }
  }
  
  async saveFile(fileId: string, content: string) {
    try {
      const response = await fetch(`${this.baseURL}/storage/files/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) throw new Error('Failed to save file');
      
      return await response.json();
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }
  
  async createFile(projectId: string, path: string, name: string, content: string = '') {
    try {
      const response = await fetch(`${this.baseURL}/storage/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, path, name, content })
      });
      
      if (!response.ok) throw new Error('Failed to create file');
      
      return await response.json();
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }
  
  async deleteFile(fileId: string) {
    try {
      const response = await fetch(`${this.baseURL}/storage/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete file');
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
  
  async renameFile(fileId: string, newName: string) {
    try {
      const response = await fetch(`${this.baseURL}/storage/files/${fileId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName })
      });
      
      if (!response.ok) throw new Error('Failed to rename file');
      
      return await response.json();
    } catch (error) {
      console.error('Error renaming file:', error);
      throw error;
    }
  }
  
  // Container operations
  async getContainer(projectId: string) {
    try {
      const response = await fetch(`${this.baseURL}/runtime/containers?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to load container');
      
      const containers = await response.json();
      return containers[0] || null; // Return first container or null
    } catch (error) {
      console.error('Error loading container:', error);
      throw error;
    }
  }
  
  async startContainer(containerId: string) {
    try {
      const response = await fetch(`${this.baseURL}/runtime/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId })
      });
      
      if (!response.ok) throw new Error('Failed to start container');
      
      return await response.json();
    } catch (error) {
      console.error('Error starting container:', error);
      throw error;
    }
  }
  
  async stopContainer(containerId: string) {
    try {
      const response = await fetch(`${this.baseURL}/runtime/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId })
      });
      
      if (!response.ok) throw new Error('Failed to stop container');
      
      return await response.json();
    } catch (error) {
      console.error('Error stopping container:', error);
      throw error;
    }
  }
  
  async restartContainer(containerId: string) {
    try {
      const response = await fetch(`${this.baseURL}/runtime/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId })
      });
      
      if (!response.ok) throw new Error('Failed to restart container');
      
      return await response.json();
    } catch (error) {
      console.error('Error restarting container:', error);
      throw error;
    }
  }
  
  async getContainerMetrics(containerId: string) {
    try {
      const response = await fetch(`${this.baseURL}/runtime/stats?containerId=${containerId}`);
      if (!response.ok) throw new Error('Failed to load container metrics');
      
      return await response.json();
    } catch (error) {
      console.error('Error loading container metrics:', error);
      throw error;
    }
  }
  
  async executeCommand(containerId: string, command: string) {
    try {
      const response = await fetch(`${this.baseURL}/runtime/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId, command })
      });
      
      if (!response.ok) throw new Error('Failed to execute command');
      
      return await response.json();
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  }
  
  // Project operations
  async getProject(projectId: string) {
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to load project');
      
      return await response.json();
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  }
  
  async createContainer(projectId: string, templateId: string) {
    try {
      const response = await fetch(`${this.baseURL}/runtime/containers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          templateId,
          name: `IDE Container - ${projectId}`
        })
      });
      
      if (!response.ok) throw new Error('Failed to create container');
      
      return await response.json();
    } catch (error) {
      console.error('Error creating container:', error);
      throw error;
    }
  }
  
  // Templates
  async getTemplates() {
    try {
      const response = await fetch(`${this.baseURL}/runtime/templates`);
      if (!response.ok) throw new Error('Failed to load templates');
      
      return await response.json();
    } catch (error) {
      console.error('Error loading templates:', error);
      throw error;
    }
  }
}

export const ideAPIManager = new IDEAPIManager();