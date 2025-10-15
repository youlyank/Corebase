import ZAI from 'z-ai-web-dev-sdk';
import { MemoryManager } from './memory-manager';

export interface TaskStep {
  id: string;
  description: string;
  type: 'command' | 'file_edit' | 'analysis' | 'verification';
  command?: string;
  filePath?: string;
  content?: string;
  dependencies?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface DevelopmentPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  estimatedTime: number;
  complexity: 'low' | 'medium' | 'high';
  status: 'planning' | 'executing' | 'completed' | 'failed';
  currentStep: number;
  progress: number;
}

export class AgenticPlanner {
  private zai: ZAI;
  private memoryManager: MemoryManager;

  constructor(projectId = 'default-project') {
    this.zai = null as any;
    this.memoryManager = new MemoryManager(projectId);
  }

  private async initializeAI() {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
  }

  async createPlan(goal: string): Promise<DevelopmentPlan> {
    await this.initializeAI();

    // Remember the goal
    await this.memoryManager.rememberInteraction('goal_set', { goal }, 'PROJECT_GOAL');

    // Get contextual memory for better planning
    const memory = await this.memoryManager.getAllContextualMemory();
    const projectContext = this.buildProjectContext(memory);

    const prompt = `You are an expert software development planner. Given a goal and project context, break it down into specific, executable steps for a Next.js project.

Goal: "${goal}"

Project Context:
${projectContext}

Create a detailed plan with steps that can include:
1. Command execution (npm install, npm run build, etc.)
2. File operations (create, edit, delete files)
3. Analysis tasks (check code quality, run tests)
4. Verification steps (ensure functionality works)

Consider the existing project structure and patterns. Learn from previous executions shown in the history.

Respond with a JSON object in this format:
{
  "steps": [
    {
      "description": "Install required dependencies",
      "type": "command",
      "command": "npm install package-name",
      "dependencies": []
    },
    {
      "description": "Create component file",
      "type": "file_edit",
      "filePath": "src/components/NewComponent.tsx",
      "content": "component code here",
      "dependencies": ["install-deps"]
    }
  ],
  "estimatedTime": 30,
  "complexity": "medium"
}

Make sure each step has:
- Clear description
- Appropriate type (command, file_edit, analysis, verification)
- Necessary details (command, filePath, content)
- Dependencies on previous steps (by step index or description)`;

    try {
      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a software development planning assistant. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const messageContent = completion.choices[0]?.message?.content;
      
      if (!messageContent) {
        throw new Error('No response from AI');
      }

      let planData;
      try {
        planData = JSON.parse(messageContent);
      } catch (parseError) {
        // Fallback to simple plan
        planData = this.createFallbackPlan(goal);
      }

      const plan: DevelopmentPlan = {
        id: `plan_${Date.now()}`,
        goal,
        steps: planData.steps.map((step: any, index: number) => ({
          id: `step_${index}`,
          description: step.description,
          type: step.type,
          command: step.command,
          filePath: step.filePath,
          content: step.content,
          dependencies: step.dependencies || [],
          status: 'pending' as const
        })),
        estimatedTime: planData.estimatedTime || 15,
        complexity: planData.complexity || 'medium',
        status: 'planning',
        currentStep: 0,
        progress: 0
      };

      // Store the plan in memory
      await this.memoryManager.storeDevelopmentPlan(goal, planData, plan.status as any);

      return plan;
    } catch (error) {
      console.error('Planning error:', error);
      return this.createFallbackPlan(goal);
    }
  }

  private buildProjectContext(memory: any): string {
    const contextParts: string[] = [];

    // Add project goals
    if (memory.projectGoals.length > 0) {
      contextParts.push('Previous Goals:');
      memory.projectGoals.slice(0, 3).forEach((goal: any) => {
        contextParts.push(`- ${goal.key}: ${JSON.stringify(goal.value)}`);
      });
    }

    // Add architecture info
    if (memory.architecture.length > 0) {
      contextParts.push('\nArchitecture:');
      memory.architecture.forEach((arch: any) => {
        contextParts.push(`- ${arch.key}: ${JSON.stringify(arch.value)}`);
      });
    }

    // Add code patterns
    if (memory.codePatterns.length > 0) {
      contextParts.push('\nCode Patterns:');
      memory.codePatterns.slice(0, 3).forEach((pattern: any) => {
        contextParts.push(`- ${pattern.key}: ${JSON.stringify(pattern.value)}`);
      });
    }

    // Add recent history
    if (memory.history.length > 0) {
      contextParts.push('\nRecent Actions:');
      memory.history.slice(0, 5).forEach((history: any) => {
        contextParts.push(`- ${history.key}: ${JSON.stringify(history.value)}`);
      });
    }

    return contextParts.join('\n');
  }

  private createFallbackPlan(goal: string): DevelopmentPlan {
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps: [
        {
          id: 'step_0',
          description: 'Analyze project requirements',
          type: 'analysis',
          status: 'pending'
        },
        {
          id: 'step_1',
          description: 'Set up development environment',
          type: 'command',
          command: 'npm install',
          dependencies: ['step_0'],
          status: 'pending'
        },
        {
          id: 'step_2',
          description: 'Implement core functionality',
          type: 'file_edit',
          filePath: 'src/app/page.tsx',
          dependencies: ['step_1'],
          status: 'pending'
        },
        {
          id: 'step_3',
          description: 'Test the implementation',
          type: 'verification',
          command: 'npm test',
          dependencies: ['step_2'],
          status: 'pending'
        }
      ],
      estimatedTime: 20,
      complexity: 'medium',
      status: 'planning',
      currentStep: 0,
      progress: 0
    };
  }

  async executeStep(step: TaskStep): Promise<{ success: boolean; result?: any; error?: string }> {
    // Remember the step execution
    await this.memoryManager.rememberInteraction('step_execution', {
      stepId: step.id,
      description: step.description,
      type: step.type
    }, 'HISTORY');

    try {
      switch (step.type) {
        case 'command':
          return await this.executeCommand(step.command!);
        
        case 'file_edit':
          return await this.executeFileEdit(step.filePath!, step.content);
        
        case 'analysis':
          return await this.executeAnalysis(step.description);
        
        case 'verification':
          return await this.executeVerification(step.description);
        
        default:
          return { success: false, error: `Unknown step type: ${step.type}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async executeCommand(command: string): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      const result = await response.json();
      
      if (result.success) {
        // Store successful command pattern
        await this.memoryManager.storeMemory(
          'CODE_PATTERN',
          `command_${command}`,
          { command, successful: true, timestamp: new Date().toISOString() }
        );
        
        return { success: true, result: result.result };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Command execution failed' 
      };
    }
  }

  private async executeFileEdit(filePath: string, content?: string): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      if (!content) {
        return { success: false, error: 'No content provided for file edit' };
      }

      const response = await fetch('/api/filesystem/v2/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: filePath.split('/').pop(),
          path: filePath,
          content,
          type: 'file'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Store file context
        await this.memoryManager.storeFileContext(filePath, content, this.generateHash(content));
        
        // Store file relationship
        await this.memoryManager.storeMemory(
          'FILE_RELATION',
          filePath,
          { 
            path: filePath, 
            created: true, 
            timestamp: new Date().toISOString(),
            size: content.length 
          }
        );
        
        return { success: true, result: result.file };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'File edit failed' 
      };
    }
  }

  private async executeAnalysis(description: string): Promise<{ success: boolean; result?: any; error?: string }> {
    // Perform analysis based on project context
    const memory = await this.memoryManager.getAllContextualMemory();
    
    const analysis = {
      description,
      projectInsights: {
        totalFiles: memory.fileRelations.length,
        recentGoals: memory.projectGoals.length,
        codePatterns: memory.codePatterns.length,
        architectureDecisions: memory.architecture.length
      },
      recommendations: [
        'Continue with implementation',
        'Follow existing code patterns',
        'Maintain project architecture consistency'
      ]
    };

    // Store analysis result
    await this.memoryManager.storeMemory(
      'CONTEXT',
      `analysis_${Date.now()}`,
      analysis
    );

    return { success: true, result: analysis };
  }

  private async executeVerification(description: string): Promise<{ success: boolean; result?: any; error?: string }> {
    // Run linting as verification
    const lintResult = await this.executeCommand('npm run lint');
    
    // Store verification result
    await this.memoryManager.storeMemory(
      'HISTORY',
      `verification_${Date.now()}`,
      {
        description,
        result: lintResult.success ? 'passed' : 'failed',
        timestamp: new Date().toISOString()
      }
    );

    return lintResult;
  }

  private generateHash(content: string): string {
    // Simple hash function for demo
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  getStepById(plan: DevelopmentPlan, stepId: string): TaskStep | undefined {
    return plan.steps.find(step => step.id === stepId);
  }

  getExecutableSteps(plan: DevelopmentPlan): TaskStep[] {
    return plan.steps.filter(step => {
      if (step.status !== 'pending') return false;
      
      // Check if all dependencies are completed
      if (step.dependencies && step.dependencies.length > 0) {
        return step.dependencies.every(depId => {
          const depStep = this.getStepById(plan, depId);
          return depStep?.status === 'completed';
        });
      }
      
      return true;
    });
  }

  // Initialize project memory
  async initializeProjectMemory(): Promise<void> {
    await this.memoryManager.analyzeAndStoreProjectStructure();
  }
}

// Singleton instance
export const agenticPlanner = new AgenticPlanner();