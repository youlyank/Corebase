"use client";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Save, Terminal } from "lucide-react";

interface IDETerminalProps {
  projectId: string;
  userId: string;
}

export default function IDETerminal({ projectId, userId }: IDETerminalProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new output is added
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const executeCommand = async () => {
    if (!command.trim()) return;

    setIsRunning(true);
    const commandLine = `$ ${command}`;
    setOutput(prev => [...prev, commandLine]);

    try {
      // Emit terminal event to runtime bus
      if ((window as any).ideEvents) {
        (window as any).ideEvents.emitTerminalCommand(command, "");
      }

      // Simulate command execution (replace with actual terminal logic)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = `Command executed: ${command}`;
      setOutput(prev => [...prev, result]);

      // Emit output event
      if ((window as any).ideEvents) {
        (window as any).ideEvents.emitTerminalCommand(command, result);
      }

    } catch (error) {
      const errorMsg = `Error: ${error}`;
      setOutput(prev => [...prev, errorMsg]);
    } finally {
      setIsRunning(false);
      setCommand("");
    }
  };

  const clearOutput = () => {
    setOutput([]);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Terminal className="h-4 w-4" />
          Terminal
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <ScrollArea className="h-64 w-full rounded-md border bg-black text-green-400 p-3 font-mono text-sm">
          <div ref={outputRef} className="space-y-1">
            {output.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {line}
              </div>
            ))}
            {isRunning && (
              <div className="animate-pulse">Executing...</div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex gap-2">
          <Textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter command..."
            className="flex-1 min-h-[60px] font-mono text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                executeCommand();
              }
            }}
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={executeCommand}
            disabled={isRunning || !command.trim()}
            size="sm"
            className="flex items-center gap-2"
          >
            <Play className="h-3 w-3" />
            Run
          </Button>
          <Button
            onClick={clearOutput}
            variant="outline"
            size="sm"
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}