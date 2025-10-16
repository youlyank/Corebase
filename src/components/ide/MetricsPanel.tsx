'use client';

import React, { useEffect, useState } from 'react';
import { Play, Square, RotateCcw, Trash2, Cpu, HardDrive, Activity, Wifi } from 'lucide-react';
import { useIDEStore } from '@/lib/ide/store';

interface MetricsPanelProps {
  containerId?: string;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ containerId }) => {
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    cpu: 0,
    memory: 0,
    networkIn: 0,
    networkOut: 0,
    disk: 0
  });

  const {
    container,
    metrics,
    startContainer,
    stopContainer,
    restartContainer
  } = useIDEStore();

  // Update metrics from store
  useEffect(() => {
    if (metrics) {
      setRealTimeMetrics({
        cpu: metrics.cpu || 0,
        memory: metrics.memory || 0,
        networkIn: metrics.network?.in || 0,
        networkOut: metrics.network?.out || 0,
        disk: 0 // Would need to add disk metrics to the API
      });
    }
  }, [metrics]);

  // Simulate real-time updates (in production, this would come from WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      if (container?.status === 'running') {
        setRealTimeMetrics(prev => ({
          cpu: Math.max(0, Math.min(100, prev.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(0, Math.min(100, prev.memory + (Math.random() - 0.5) * 5)),
          networkIn: Math.max(0, prev.networkIn + Math.random() * 100),
          networkOut: Math.max(0, prev.networkOut + Math.random() * 100),
          disk: prev.disk
        }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [container?.status]);

  const handleStart = async () => {
    await startContainer();
  };

  const handleStop = async () => {
    await stopContainer();
  };

  const handleRestart = async () => {
    await restartContainer();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-500';
      case 'stopped': return 'text-red-500';
      case 'starting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '🔴';
      case 'starting': return '🟡';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
      {/* Container Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon(container?.status || 'unknown')}</span>
          <div>
            <h3 className="text-sm font-medium text-gray-200">Container Status</h3>
            <p className={`text-xs ${getStatusColor(container?.status || 'unknown')}`}>
              {container?.status || 'Unknown'} • {container?.name || 'No container'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {container?.status === 'running' ? (
            <>
              <button
                onClick={handleStop}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                title="Stop Container"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={handleRestart}
                className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
                title="Restart Container"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleStart}
              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors"
              title="Start Container"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
            title="Remove Container"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resource Metrics */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-200">Resource Usage</h4>
        
        {/* CPU Usage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">CPU</span>
            </div>
            <span className="text-xs text-gray-300">{formatPercentage(realTimeMetrics.cpu)}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${realTimeMetrics.cpu}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Memory</span>
            </div>
            <span className="text-xs text-gray-300">{formatPercentage(realTimeMetrics.memory)}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${realTimeMetrics.memory}%` }}
            />
          </div>
        </div>

        {/* Network I/O */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wifi className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Network</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                ↓ {formatBytes(realTimeMetrics.networkIn)}
              </span>
              <span className="text-xs text-gray-500">
                ↑ {formatBytes(realTimeMetrics.networkOut)}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (realTimeMetrics.networkIn / 1000) * 100)}%` }}
              />
              <div 
                className="bg-pink-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (realTimeMetrics.networkOut / 1000) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Activity Indicator */}
        <div className="flex items-center space-x-2 pt-2 border-t border-gray-800">
          <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span className="text-xs text-gray-400">
            {container?.status === 'running' ? 'Live monitoring' : 'Container stopped'}
          </span>
        </div>
      </div>

      {/* Container Info */}
      {container && (
        <div className="space-y-2 pt-2 border-t border-gray-800">
          <h4 className="text-sm font-medium text-gray-200">Container Info</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Image:</span>
              <span className="text-xs text-gray-300 truncate ml-2">{container.image}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Ports:</span>
              <span className="text-xs text-gray-300">{container.ports || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Created:</span>
              <span className="text-xs text-gray-300">
                {new Date(container.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};