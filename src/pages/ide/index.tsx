"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IDEEventEmitter from "@/components/IDE/IDEEventEmitter";
import IDEEditor from "@/components/IDE/IDEEditor";
import IDETerminal from "@/components/IDE/IDETerminal";
import HUD from "@/components/HUD";
import { Code, Terminal, Activity, Settings } from "lucide-react";

export default function IDEPage() {
  const [projectId, setProjectId] = useState("demo-project");
  const [userId, setUserId] = useState("demo-user");

  useEffect(() => {
    // In a real app, these would come from authentication/routing
    setProjectId("project-" + Math.random().toString(36).substr(2, 9));
    setUserId("user-" + Math.random().toString(36).substr(2, 9));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Event Emitter - invisible component that handles event publishing */}
      <IDEEventEmitter projectId={projectId} userId={userId} />
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code className="h-6 w-6" />
              <h1 className="text-xl font-semibold">CoreBase IDE</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Project: {projectId}</span>
              <span>•</span>
              <span>User: {userId}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - IDE */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Editor
                </TabsTrigger>
                <TabsTrigger value="terminal" className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Terminal
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="editor" className="mt-4">
                <IDEEditor projectId={projectId} userId={userId} />
              </TabsContent>
              
              <TabsContent value="terminal" className="mt-4">
                <IDETerminal projectId={projectId} userId={userId} />
              </TabsContent>
              
              <TabsContent value="settings" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>IDE Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Runtime Events</h4>
                        <p className="text-sm text-muted-foreground">
                          All IDE events are automatically published to the runtime bus for real-time monitoring and collaboration.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Monitoring</h4>
                        <p className="text-sm text-muted-foreground">
                          System metrics and alerts are displayed in the HUD panel on the right.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Event Persistence</h4>
                        <p className="text-sm text-muted-foreground">
                          Critical events are automatically saved to the database for auditing and debugging.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Monitoring */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5" />
              <h2 className="text-lg font-semibold">System Monitoring</h2>
            </div>
            <HUD projectId={projectId} />
          </div>
        </div>
      </main>
    </div>
  );
}