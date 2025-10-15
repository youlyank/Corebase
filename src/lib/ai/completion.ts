import ZAI from 'z-ai-web-dev-sdk';

export interface CompletionContext {
  filePath: string;
  language: string;
  position: {
    line: number;
    column: number;
  };
  prefix: string;
  suffix: string;
  entireContent: string;
}

export interface CompletionItem {
  label: string;
  kind: 'function' | 'variable' | 'class' | 'method' | 'property' | 'keyword' | 'snippet';
  detail?: string;
  documentation?: string;
  insertText: string;
  priority: number;
  source: 'ai' | 'local' | 'cache';
}

export interface CompletionResult {
  items: CompletionItem[];
  context: CompletionContext;
  timestamp: Date;
  processingTime: number;
}

export class AICompletionService {
  private zai: ZAI | null = null;
  private cache = new Map<string, CompletionResult>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeZAI();
  }

  private async initializeZAI(): Promise<void> {
    try {
      this.zai = await ZAI.create();
      console.log('AI completion service initialized');
    } catch (error) {
      console.error('Failed to initialize AI completion service:', error);
    }
  }

  async getCompletions(context: CompletionContext): Promise<CompletionResult> {
    const startTime = Date.now();
    
    // Get local completions
    const localCompletions = this.getLocalCompletions(context);
    
    // Get AI completions if available
    let aiCompletions: CompletionItem[] = [];
    if (this.zai) {
      try {
        aiCompletions = await this.getAICompletions(context);
      } catch (error) {
        console.error('AI completion failed:', error);
      }
    }

    // Merge and rank completions
    const allCompletions = this.mergeCompletions(localCompletions, aiCompletions);
    
    return {
      items: allCompletions,
      context,
      timestamp: new Date(),
      processingTime: Date.now() - startTime
    };
  }

  private getLocalCompletions(context: CompletionContext): CompletionItem[] {
    const completions: CompletionItem[] = [];
    const { language, prefix } = context;

    switch (language) {
      case 'javascript':
      case 'typescript':
        completions.push(...this.getJavaScriptCompletions(prefix));
        break;
      case 'python':
        completions.push(...this.getPythonCompletions(prefix));
        break;
    }

    return completions;
  }

  private async getAICompletions(context: CompletionContext): Promise<CompletionItem[]> {
    if (!this.zai) return [];

    try {
      const prompt = this.buildCompletionPrompt(context);
      
      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Provide relevant code completions based on the context. Return suggestions one per line.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const suggestions = completion.choices[0]?.message?.content?.split('\n') || [];
      
      return suggestions
        .filter(s => s.trim())
        .map((suggestion, index) => ({
          label: suggestion.trim(),
          kind: 'variable' as const,
          insertText: suggestion.trim(),
          priority: 100 - index,
          source: 'ai' as const
        }));

    } catch (error) {
      console.error('AI completion error:', error);
      return [];
    }
  }

  private buildCompletionPrompt(context: CompletionContext): string {
    const { filePath, language, position, prefix } = context;
    
    return `
File: ${filePath}
Language: ${language}
Position: Line ${position.line + 1}, Column ${position.column + 1}
Prefix: ${prefix}

Provide relevant code completions.
`;
  }

  private getJavaScriptCompletions(prefix: string): CompletionItem[] {
    const patterns = [
      { label: 'console.log()', insertText: 'console.log()', kind: 'method' as const },
      { label: 'const ', insertText: 'const ', kind: 'keyword' as const },
      { label: 'let ', insertText: 'let ', kind: 'keyword' as const },
      { label: 'function ', insertText: 'function ', kind: 'keyword' as const },
      { label: 'async function ', insertText: 'async function ', kind: 'keyword' as const },
      { label: 'await ', insertText: 'await ', kind: 'keyword' as const },
      { label: 'return ', insertText: 'return ', kind: 'keyword' as const },
      { label: 'if ()', insertText: 'if ()', kind: 'snippet' as const },
      { label: 'for ()', insertText: 'for ()', kind: 'snippet' as const }
    ];

    return patterns.map(pattern => ({
      ...pattern,
      priority: 70,
      source: 'local' as const
    }));
  }

  private getPythonCompletions(prefix: string): CompletionItem[] {
    const patterns = [
      { label: 'def ', insertText: 'def ', kind: 'keyword' as const },
      { label: 'class ', insertText: 'class ', kind: 'keyword' as const },
      { label: 'import ', insertText: 'import ', kind: 'keyword' as const },
      { label: 'print()', insertText: 'print()', kind: 'function' as const },
      { label: 'self', insertText: 'self', kind: 'variable' as const }
    ];

    return patterns.map(pattern => ({
      ...pattern,
      priority: 70,
      source: 'local' as const
    }));
  }

  private mergeCompletions(local: CompletionItem[], ai: CompletionItem[]): CompletionItem[] {
    const all = [...local, ...ai];
    
    // Remove duplicates
    const unique = new Map<string, CompletionItem>();
    all.forEach(item => {
      const existing = unique.get(item.label);
      if (!existing || item.priority > existing.priority) {
        unique.set(item.label, item);
      }
    });

    return Array.from(unique.values()).sort((a, b) => b.priority - a.priority);
  }
}

export const aiCompletionService = new AICompletionService();