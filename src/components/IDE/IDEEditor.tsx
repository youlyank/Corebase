"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Save, FileText, FolderOpen } from "lucide-react";

interface IDEEditorProps {
  projectId: string;
  userId: string;
}

export default function IDEEditor({ projectId, userId }: IDEEditorProps) {
  const [content, setContent] = useState("// Welcome to CoreBase IDE\n// Start coding here...\n");
  const [filePath, setFilePath] = useState("untitled.js");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    // Auto-save every 30 seconds
    const interval = setInterval(() => {
      if (content.trim()) {
        handleSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [content, filePath]);

  const handleSave = async () => {
    if (!content.trim() || !filePath.trim()) return;

    setIsSaving(true);
    try {
      // Emit file save event to runtime bus
      if ((window as any).ideEvents) {
        (window as any).ideEvents.emitFileSave(filePath, content);
      }

      // Simulate file save (replace with actual file system logic)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLastSaved(new Date());
      
      // Show success feedback
      console.log(`File saved: ${filePath}`);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Emit code edit event for real-time collaboration
    if ((window as any).ideEvents) {
      (window as any).ideEvents.emitCodeEdit(filePath, {
        content: newContent,
        timestamp: new Date().toISOString()
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            Code Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-3 w-3" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <Input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="File path..."
            className="flex-1 font-mono text-sm"
          />
        </div>
        
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start coding..."
          className="flex-1 min-h-[400px] font-mono text-sm resize-none"
          spellCheck={false}
        />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{content.length} characters</span>
          <span>{content.split('\n').length} lines</span>
        </div>
      </CardContent>
    </Card>
  );
}