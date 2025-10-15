import { db } from '@/lib/db';
import { ProjectMemory, MemoryType, DevelopmentPlan, PlanStatus, TaskExecution, TaskStatus, FileContext } from '@prisma/client';

export interface MemoryItem {
  id: string;
  type: MemoryType;
  key: string;
  value: any;
  embedding?: number[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextualMemory {
  projectGoals: MemoryItem[];
  fileRelations: MemoryItem[];
  codePatterns: MemoryItem[];
  architecture: MemoryItem[];
  dependencies: MemoryItem[];
  context: MemoryItem[];
  history: MemoryItem[];
}

export class MemoryManager {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  // Store memory item
  async storeMemory(
    type: MemoryType,
    key: string,
    value: any,
    embedding?: number[],
    metadata?: any
  ): Promise<ProjectMemory> {
    return await db.projectMemory.upsert({
      where: {
        projectId_type_key: {
          projectId: this.projectId,
          type,
          key
        }
      },
      update: {
        value,
        embedding: embedding ? JSON.stringify(embedding) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        updatedAt: new Date()
      },
      create: {
        projectId: this.projectId,
        type,
        key,
        value,
        embedding: embedding ? JSON.stringify(embedding) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  }

  // Retrieve memory item
  async getMemory(type: MemoryType, key: string): Promise<ProjectMemory | null> {
    const memory = await db.projectMemory.findUnique({
      where: {
        projectId_type_key: {
          projectId: this.projectId,
          type,
          key
        }
      }
    });

    if (memory) {
      return {
        ...memory,
        value: typeof memory.value === 'string' ? JSON.parse(memory.value) : memory.value,
        embedding: memory.embedding ? JSON.parse(memory.embedding) : undefined,
        metadata: memory.metadata ? JSON.parse(memory.metadata) : undefined
      } as any;
    }

    return memory;
  }

  // Get all memory of a specific type
  async getMemoryByType(type: MemoryType): Promise<MemoryItem[]> {
    const memories = await db.projectMemory.findMany({
      where: {
        projectId: this.projectId,
        type
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return memories.map(memory => ({
      id: memory.id,
      type: memory.type,
      key: memory.key,
      value: typeof memory.value === 'string' ? JSON.parse(memory.value) : memory.value,
      embedding: memory.embedding ? JSON.parse(memory.embedding) : undefined,
      metadata: memory.metadata ? JSON.parse(memory.metadata) : undefined,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt
    }));
  }

  // Get all contextual memory
  async getAllContextualMemory(): Promise<ContextualMemory> {
    const [
      projectGoals,
      fileRelations,
      codePatterns,
      architecture,
      dependencies,
      context,
      history
    ] = await Promise.all([
      this.getMemoryByType('PROJECT_GOAL'),
      this.getMemoryByType('FILE_RELATION'),
      this.getMemoryByType('CODE_PATTERN'),
      this.getMemoryByType('ARCHITECTURE'),
      this.getMemoryByType('DEPENDENCY'),
      this.getMemoryByType('CONTEXT'),
      this.getMemoryByType('HISTORY')
    ]);

    return {
      projectGoals,
      fileRelations,
      codePatterns,
      architecture,
      dependencies,
      context,
      history
    };
  }

  // Search memory by content (semantic search would go here)
  async searchMemory(query: string, type?: MemoryType): Promise<MemoryItem[]> {
    const where: any = {
      projectId: this.projectId,
      OR: [
        {
          key: {
            contains: query,
            mode: 'insensitive'
          }
        },
        // For JSON search, we'd need to use raw SQL in a real implementation
        // This is a simplified version
      ]
    };

    if (type) {
      where.type = type;
    }

    const memories = await db.projectMemory.findMany({
      where,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return memories.map(memory => ({
      id: memory.id,
      type: memory.type,
      key: memory.key,
      value: typeof memory.value === 'string' ? JSON.parse(memory.value) : memory.value,
      embedding: memory.embedding ? JSON.parse(memory.embedding) : undefined,
      metadata: memory.metadata ? JSON.parse(memory.metadata) : undefined,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt
    }));
  }

  // Delete memory item
  async deleteMemory(type: MemoryType, key: string): Promise<void> {
    await db.projectMemory.delete({
      where: {
        projectId_type_key: {
          projectId: this.projectId,
          type,
          key
        }
      }
    });
  }

  // Store development plan
  async storeDevelopmentPlan(
    goal: string,
    plan: any,
    status: PlanStatus = PlanStatus.PLANNING
  ): Promise<DevelopmentPlan> {
    return await db.developmentPlan.create({
      data: {
        projectId: this.projectId,
        goal,
        plan,
        status
      }
    });
  }

  // Update development plan
  async updateDevelopmentPlan(
    planId: string,
    updates: {
      status?: PlanStatus;
      result?: any;
    }
  ): Promise<DevelopmentPlan> {
    return await db.developmentPlan.update({
      where: { id: planId },
      data: updates
    });
  }

  // Get development plans
  async getDevelopmentPlans(limit = 10): Promise<DevelopmentPlan[]> {
    return await db.developmentPlan.findMany({
      where: { projectId: this.projectId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // Store task execution
  async storeTaskExecution(
    planId: string,
    stepId: string,
    command?: string,
    filePath?: string,
    content?: string
  ): Promise<TaskExecution> {
    return await db.taskExecution.create({
      data: {
        planId,
        stepId,
        command,
        filePath,
        content,
        status: TaskStatus.PENDING,
        startTime: new Date()
      }
    });
  }

  // Update task execution
  async updateTaskExecution(
    executionId: string,
    updates: {
      status?: TaskStatus;
      output?: string;
      error?: string;
      endTime?: Date;
    }
  ): Promise<TaskExecution> {
    return await db.taskExecution.update({
      where: { id: executionId },
      data: updates
    });
  }

  // Get task executions for a plan
  async getTaskExecutions(planId: string): Promise<TaskExecution[]> {
    return await db.taskExecution.findMany({
      where: { planId },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Store file context
  async storeFileContext(
    filePath: string,
    content: string,
    hash: string,
    ast?: any,
    embeddings?: any,
    metadata?: any
  ): Promise<FileContext> {
    return await db.fileContext.upsert({
      where: {
        projectId_filePath: {
          projectId: this.projectId,
          filePath
        }
      },
      update: {
        content,
        hash,
        ast: ast ? JSON.stringify(ast) : null,
        embeddings: embeddings ? JSON.stringify(embeddings) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        updatedAt: new Date()
      },
      create: {
        projectId: this.projectId,
        filePath,
        content,
        hash,
        ast: ast ? JSON.stringify(ast) : null,
        embeddings: embeddings ? JSON.stringify(embeddings) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  }

  // Get file context
  async getFileContext(filePath: string): Promise<FileContext | null> {
    const context = await db.fileContext.findUnique({
      where: {
        projectId_filePath: {
          projectId: this.projectId,
          filePath
        }
      }
    });

    if (context) {
      return {
        ...context,
        ast: context.ast ? JSON.parse(context.ast) : undefined,
        embeddings: context.embeddings ? JSON.parse(context.embeddings) : undefined,
        metadata: context.metadata ? JSON.parse(context.metadata) : undefined
      } as any;
    }

    return context;
  }

  // Get all file contexts
  async getAllFileContexts(): Promise<FileContext[]> {
    const contexts = await db.fileContext.findMany({
      where: { projectId: this.projectId },
      orderBy: { updatedAt: 'desc' }
    });

    return contexts.map(context => ({
      ...context,
      ast: context.ast ? JSON.parse(context.ast) : undefined,
      embeddings: context.embeddings ? JSON.parse(context.embeddings) : undefined,
      metadata: context.metadata ? JSON.parse(context.metadata) : undefined
    })) as any[];
  }

  // Analyze project structure and store insights
  async analyzeAndStoreProjectStructure(): Promise<void> {
    // This would analyze the project and store insights
    // For now, we'll store some basic information
    await this.storeMemory(
      'CONTEXT',
      'project_structure',
      {
        type: 'next.js',
        features: ['ai-completion', 'collaboration', 'agentic-developer'],
        lastAnalyzed: new Date().toISOString()
      }
    );

    await this.storeMemory(
      'ARCHITECTURE',
      'main_components',
      {
        pages: ['src/app/page.tsx'],
        components: [
          'src/components/EditorCollab.tsx',
          'src/components/AgenticDeveloper.tsx'
        ],
        api_routes: [
          'src/api/completion/route.ts',
          'src/api/collab/route.ts',
          'src/api/tasks/route.ts'
        ]
      }
    );
  }

  // Remember user interaction
  async rememberInteraction(
    action: string,
    details: any,
    category: MemoryType = 'HISTORY'
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.storeMemory(
      category,
      `${action}_${timestamp}`,
      {
        action,
        details,
        timestamp
      }
    );
  }
}

// Default project ID for demo
export const defaultMemoryManager = new MemoryManager('default-project');