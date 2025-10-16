import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface TaskOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface TaskResult {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number;
}

export class TaskRunner extends EventEmitter {
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private taskHistory: TaskResult[] = [];

  async executeCommand(command: string, options: TaskOptions = {}): Promise<TaskResult> {
    const startTime = Date.now();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse command into executable and args
    const [executable, ...args] = command.split(' ');
    
    return new Promise((resolve, reject) => {
      const process = spawn(executable, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeProcesses.set(taskId, process);

      let stdout = '';
      let stderr = '';

      // Stream output in real-time
      process.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        this.emit('stdout', { taskId, chunk, command });
      });

      process.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        this.emit('stderr', { taskId, chunk, command });
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          if (process.pid && !process.killed) {
            process.kill('SIGTERM');
            this.emit('timeout', { taskId, command });
          }
        }, options.timeout);
      }

      process.on('close', (exitCode) => {
        this.activeProcesses.delete(taskId);
        
        const result: TaskResult = {
          command,
          exitCode,
          stdout,
          stderr,
          duration: Date.now() - startTime
        };

        this.taskHistory.push(result);
        this.emit('complete', { taskId, result });
        
        if (exitCode === 0) {
          resolve(result);
        } else {
          reject(new Error(`Command failed with exit code ${exitCode}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        this.activeProcesses.delete(taskId);
        this.emit('error', { taskId, error, command });
        reject(error);
      });
    });
  }

  killTask(taskId: string): boolean {
    const process = this.activeProcesses.get(taskId);
    if (process && process.pid) {
      process.kill('SIGTERM');
      return true;
    }
    return false;
  }

  killAllTasks(): void {
    this.activeProcesses.forEach((process, taskId) => {
      if (process.pid) {
        process.kill('SIGTERM');
      }
    });
    this.activeProcesses.clear();
  }

  getActiveTasks(): string[] {
    return Array.from(this.activeProcesses.keys());
  }

  getTaskHistory(): TaskResult[] {
    return [...this.taskHistory];
  }

  clearHistory(): void {
    this.taskHistory = [];
  }

  // Common development tasks
  async runDev(port = 3000): Promise<TaskResult> {
    return this.executeCommand(`npm run dev -- --port ${port}`, {
      timeout: 30000 // 30 seconds timeout
    });
  }

  async runBuild(): Promise<TaskResult> {
    return this.executeCommand('npm run build');
  }

  async runTest(): Promise<TaskResult> {
    return this.executeCommand('npm test');
  }

  async runLint(): Promise<TaskResult> {
    return this.executeCommand('npm run lint');
  }

  async installDependencies(): Promise<TaskResult> {
    return this.executeCommand('npm install');
  }

  async gitCommit(message: string): Promise<TaskResult> {
    return this.executeCommand(`git add . && git commit -m "${message}"`);
  }

  async gitPush(): Promise<TaskResult> {
    return this.executeCommand('git push');
  }
}

// Singleton instance
export const taskRunner = new TaskRunner();