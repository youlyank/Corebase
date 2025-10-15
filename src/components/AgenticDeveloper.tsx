'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Square,
  Terminal,
  Code,
  GitBranch,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Brain,
  Target,
  Loader2,
  FileText,
  CommandLine,
  Search,
  CheckCircle2
} from 'lucide-react';
import { agenticPlanner, DevelopmentPlan, TaskStep } from '@/lib/agentic-planner';

interface Task {
  id: string;
  command: string;
  status: 'running' | 'completed' | 'failed';
  output: string;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

export default function AgenticDeveloper() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activePlan, setActivePlan] = useState<DevelopmentPlan | null>(null);
  const [command, setCommand] = useState('');
  const [goal, setGoal] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const executeCommand = async (cmd: string) => {
    const taskId = `task_${Date.now()}`;
    const newTask: Task = {
      id: taskId,
      command: cmd,
      status: 'running',
      output: '',
      startTime: new Date()
    };

    setTasks(prev => [...prev, newTask]);
    setIsExecuting(true);
    setOutput(prev => [...prev, `$ ${cmd}`, '']);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });

      const result = await response.json();

      if (result.success) {
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'completed', output: result.result.stdout, endTime: new Date() }
            : t
        ));
        
        setOutput(prev => [...prev.slice(0, -1), result.result.stdout]);
      } else {
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'failed', error: result.error, endTime: new Date() }
            : t
        ));
        
        setOutput(prev => [...prev.slice(0, -1), `Error: ${result.error}`]);
      }
    } catch (error) {
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error', endTime: new Date() }
          : t
      ));
      
      setOutput(prev => [...prev.slice(0, -1), `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  const executeGoal = async () => {
    if (!goal.trim()) return;

    setIsPlanning(true);
    setOutput(prev => [...prev, `🎯 Goal: ${goal}`, '', '🤖 AI Agent is planning...', '']);

    try {
      // Initialize project memory if needed
      await agenticPlanner.initializeProjectMemory();
      
      const plan = await agenticPlanner.createPlan(goal);
      setActivePlan(plan);
      setIsPlanning(false);
      
      setOutput(prev => [...prev.slice(0, -1), `📋 Plan created with ${plan.steps.length} steps:`, '']);
      
      plan.steps.forEach((step, index) => {
        const icon = getStepIcon(step.type);
        setOutput(prev => [...prev, `${index + 1}. ${icon} ${step.description}`]);
      });
      
      setOutput(prev => [...prev, '', '🚀 Starting execution...', '']);

      // Execute the plan
      await executePlan(plan);
      
    } catch (error) {
      setIsPlanning(false);
      setOutput(prev => [...prev.slice(0, -1), `❌ Planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`, '']);
    }
  };

  const executePlan = async (plan: DevelopmentPlan) => {
    setActivePlan(prev => prev ? { ...prev, status: 'executing' } : null);
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      // Check if dependencies are met
      if (step.dependencies && step.dependencies.length > 0) {
        const depsMet = step.dependencies.every(depId => {
          const depStep = plan.steps.find(s => s.id === depId);
          return depStep?.status === 'completed';
        });
        
        if (!depsMet) {
          setOutput(prev => [...prev, `⏭️  Skipping step ${i + 1}: Dependencies not met`]);
          continue;
        }
      }
      
      setActivePlan(prev => prev ? { ...prev, currentStep: i, progress: (i / plan.steps.length) * 100 } : null);
      
      setOutput(prev => [...prev, `🚀 Step ${i + 1}/${plan.steps.length}: ${step.description}`, '']);
      
      // Update step status to running
      step.status = 'running';
      setActivePlan(prev => prev ? { ...prev } : null);
      
      const result = await agenticPlanner.executeStep(step);
      
      if (result.success) {
        step.status = 'completed';
        step.result = result.result;
        setOutput(prev => [...prev.slice(0, -1), `✅ Step completed successfully`]);
        
        if (result.result) {
          if (typeof result.result === 'string') {
            setOutput(prev => [...prev, result.result]);
          } else if (result.result.stdout) {
            setOutput(prev => [...prev, result.result.stdout]);
          }
        }
      } else {
        step.status = 'failed';
        step.error = result.error;
        setOutput(prev => [...prev.slice(0, -1), `❌ Step failed: ${result.error}`]);
        
        // Stop execution on failure
        setActivePlan(prev => prev ? { ...prev, status: 'failed' } : null);
        setOutput(prev => [...prev, '', '🛑 Execution stopped due to failure', '']);
        return;
      }
      
      setOutput(prev => [...prev, '']);
      setActivePlan(prev => prev ? { ...prev } : null);
      
      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setActivePlan(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
    setOutput(prev => [...prev, '🎉 All steps completed successfully!', '']);
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'command': return '💻';
      case 'file_edit': return '📝';
      case 'analysis': return '🔍';
      case 'verification': return '✅';
      default: return '📋';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const quickActions = [
    { icon: Play, label: 'Run Dev', command: 'npm run dev' },
    { icon: Code, label: 'Build', command: 'npm run build' },
    { icon: Terminal, label: 'Test', command: 'npm test' },
    { icon: GitBranch, label: 'Git Commit', command: 'git add . && git commit -m "Update project"' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Panel - Control */}
      <div className="lg:col-span-1 space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => executeCommand(action.command)}
                disabled={isExecuting || isPlanning}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Command Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Execute Command
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter command..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && command.trim() && executeCommand(command)}
                disabled={isExecuting || isPlanning}
              />
              <Button
                size="sm"
                onClick={() => command.trim() && executeCommand(command)}
                disabled={isExecuting || isPlanning || !command.trim()}
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Describe your goal (e.g., 'Add authentication system', 'Create a new component', 'Fix the build error')..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                disabled={isExecuting || isPlanning}
              />
              <Button
                className="w-full"
                onClick={executeGoal}
                disabled={isExecuting || isPlanning || !goal.trim()}
              >
                {isPlanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Planning...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Execute Goal
                  </>
                )}
              </Button>
            </div>

            {activePlan && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={
                    activePlan.status === 'completed' ? 'default' :
                    activePlan.status === 'failed' ? 'destructive' :
                    activePlan.status === 'executing' ? 'secondary' : 'outline'
                  }>
                    {activePlan.status}
                  </Badge>
                </div>
                
                {activePlan.status === 'executing' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(activePlan.progress)}%</span>
                    </div>
                    <Progress value={activePlan.progress} className="h-2" />
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-sm font-medium">Execution Plan</span>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {activePlan.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className={`flex items-start gap-2 p-2 rounded text-xs ${
                            index === activePlan.currentStep ? 'bg-blue-50 border border-blue-200' :
                            step.status === 'completed' ? 'bg-green-50' :
                            step.status === 'failed' ? 'bg-red-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getStepStatusIcon(step.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="font-medium">Step {index + 1}</span>
                              <span className="text-gray-400">{getStepIcon(step.type)}</span>
                            </div>
                            <div className="text-gray-600 break-words">{step.description}</div>
                            {step.command && (
                              <div className="text-gray-400 font-mono mt-1">{step.command}</div>
                            )}
                            {step.error && (
                              <div className="text-red-600 text-xs mt-1">{step.error}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <div>Estimated time: {activePlan.estimatedTime}min</div>
                  <div>Complexity: {activePlan.complexity}</div>
                  <div>Total steps: {activePlan.steps.length}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Output */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Output
              </span>
              <div className="flex items-center gap-2">
                {(isExecuting || isPlanning) && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {isPlanning ? 'Planning' : 'Running'}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOutput([])}
                >
                  Clear
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full">
              <div 
                ref={outputRef}
                className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm whitespace-pre-wrap"
              >
                {output.length === 0 ? (
                  <div className="text-gray-500">No output yet. Run a command or set a goal to begin...</div>
                ) : (
                  output.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}