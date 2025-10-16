"use client";
import React, { useEffect, useState } from "react";
import { useRuntimeSocket } from "@/hooks/useRuntimeSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Cpu, HardDrive, Network, AlertTriangle } from "lucide-react";

interface Metrics {
  cpu: number;
  mem: number;
  net: number;
  disk?: number;
  status?: 'healthy' | 'warning' | 'critical';
}

interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'network';
  level: 'warning' | 'critical';
  message: string;
  timestamp: Date;
}

export default function HUD({ projectId }: { projectId: string }) {
  const [metrics, setMetrics] = useState<Metrics>({ cpu: 0, mem: 0, net: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socket = useRuntimeSocket(projectId);

  useEffect(() => {
    // Connection status
    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to runtime socket");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from runtime socket");
    });

    // Health updates
    socket.on("health.update", (data) => {
      setMetrics(data.data);
      
      // Check for alerts based on thresholds
      checkAndCreateAlerts(data.data);
    });

    // Container status updates
    socket.on("container.status", (data) => {
      console.log("Container status:", data);
      
      // Create alert for container issues
      if (data.data.status === 'error') {
        createAlert({
          id: `container-${Date.now()}`,
          type: 'cpu',
          level: 'critical',
          message: `Container error: ${data.data.error || 'Unknown error'}`,
          timestamp: new Date()
        });
      }
    });

    // Monitoring alerts
    socket.on("monitoring.alert", (alert) => {
      createAlert({
        ...alert,
        timestamp: new Date(alert.timestamp)
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("health.update");
      socket.off("container.status");
      socket.off("monitoring.alert");
    };
  }, [socket]);

  const checkAndCreateAlerts = (data: Metrics) => {
    const newAlerts: Alert[] = [];

    // CPU alerts
    if (data.cpu > 90) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: 'cpu',
        level: 'critical',
        message: `CPU usage critically high: ${data.cpu}%`,
        timestamp: new Date()
      });
    } else if (data.cpu > 75) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: 'cpu',
        level: 'warning',
        message: `CPU usage high: ${data.cpu}%`,
        timestamp: new Date()
      });
    }

    // Memory alerts
    if (data.mem > 90) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory',
        level: 'critical',
        message: `Memory usage critically high: ${data.mem}%`,
        timestamp: new Date()
      });
    } else if (data.mem > 75) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory',
        level: 'warning',
        message: `Memory usage high: ${data.mem}%`,
        timestamp: new Date()
      });
    }

    // Network alerts
    if (data.net > 1000) { // 1GB/s
      newAlerts.push({
        id: `network-${Date.now()}`,
        type: 'network',
        level: 'warning',
        message: `High network traffic: ${data.net} Mbps`,
        timestamp: new Date()
      });
    }

    newAlerts.forEach(alert => createAlert(alert));
  };

  const createAlert = (alert: Alert) => {
    setAlerts(prev => {
      // Remove duplicate alerts of same type
      const filtered = prev.filter(a => a.type !== alert.type);
      // Add new alert and keep only last 5
      return [alert, ...filtered].slice(0, 5);
    });

    // Auto-remove alert after 10 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 10000);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getMetricColor = (value: number, type: string) => {
    if (value > 90) return 'text-red-500';
    if (value > 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="bg-slate-900 text-white border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Metrics
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-800 rounded-lg">
              <Cpu className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <div className={`text-2xl font-bold ${getMetricColor(metrics.cpu, 'cpu')}`}>
                {metrics.cpu.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">CPU</div>
            </div>
            
            <div className="text-center p-3 bg-slate-800 rounded-lg">
              <HardDrive className="h-6 w-6 mx-auto mb-2 text-green-400" />
              <div className={`text-2xl font-bold ${getMetricColor(metrics.mem, 'memory')}`}>
                {metrics.mem.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Memory</div>
            </div>
            
            <div className="text-center p-3 bg-slate-800 rounded-lg">
              <Network className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <div className={`text-2xl font-bold ${getMetricColor(metrics.net, 'network')}`}>
                {metrics.net.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Network (Mbps)</div>
            </div>
            
            <div className="text-center p-3 bg-slate-800 rounded-lg">
              <Activity className="h-6 w-6 mx-auto mb-2 text-orange-400" />
              <div className={`text-2xl font-bold ${getStatusColor(metrics.status)}`}>
                {metrics.status || 'Unknown'}
              </div>
              <div className="text-xs text-muted-foreground">Status</div>
            </div>
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                Active Alerts
              </h4>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <Alert 
                    key={alert.id} 
                    className={`border-l-4 ${
                      alert.level === 'critical' 
                        ? 'border-red-500 bg-red-950 text-red-200' 
                        : 'border-yellow-500 bg-yellow-950 text-yellow-200'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {alert.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}