'use client';

import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, UserCircle, Circle } from 'lucide-react';
import { useIDEStore } from '@/lib/ide/store';

interface CollaborationPanelProps {
  projectId: string;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({ projectId }) => {
  const [messages, setMessages] = useState<Array<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: Date;
  }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const { users, socket } = useIDEStore();

  // Handle WebSocket events for collaboration
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (user: { id: string; name: string; avatar?: string }) => {
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        userId: 'system',
        userName: 'System',
        content: `${user.name} joined the workspace`,
        timestamp: new Date()
      }]);
    };

    const handleUserLeft = (userId: string) => {
      const user = users.find(u => u.id === userId);
      if (user) {
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          userId: 'system',
          userName: 'System',
          content: `${user.name} left the workspace`,
          timestamp: new Date()
        }]);
      }
    };

    const handleChatMessage = (message: {
      id: string;
      userId: string;
      userName: string;
      content: string;
      timestamp: string;
    }) => {
      setMessages(prev => [...prev, {
        ...message,
        timestamp: new Date(message.timestamp)
      }]);
    };

    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
      socket.off('chat:message', handleChatMessage);
    };
  }, [socket, users]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const message = {
      id: `msg-${Date.now()}`,
      userId: 'current-user', // Would get from auth context
      userName: 'You', // Would get from auth context
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    socket.emit('chat:message', message);
    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserColor = (userId: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Collaboration</span>
          <span className="text-xs text-gray-500">({users.filter(u => u.isOnline).length})</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Active Users */}
          <div className="px-4 py-3 border-b border-gray-800">
            <h4 className="text-xs font-medium text-gray-400 mb-2">Active Users</h4>
            <div className="space-y-2">
              {users.filter(user => user.isOnline).map(user => (
                <div key={user.id} className="flex items-center space-x-2">
                  <div className="relative">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className={`w-6 h-6 rounded-full ${getUserColor(user.id)} flex items-center justify-center`}>
                        <UserCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <Circle className="absolute -bottom-1 -right-1 w-3 h-3 text-green-500 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{user.name}</p>
                    {user.cursor && (
                      <p className="text-xs text-gray-500">
                        Line {user.cursor.line}, Col {user.cursor.column}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {users.filter(user => user.isOnline).length === 0 && (
                <p className="text-xs text-gray-500">No active users</p>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-800">
              <h4 className="text-xs font-medium text-gray-400 flex items-center space-x-1">
                <MessageSquare className="w-3 h-3" />
                <span>Chat</span>
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p>Start a conversation with your team</p>
                </div>
              ) : (
                messages.map(message => (
                  <div key={message.id} className="space-y-1">
                    {message.userId === 'system' ? (
                      <div className="text-center">
                        <span className="text-xs text-gray-500 italic">
                          {message.content}
                        </span>
                        <span className="text-xs text-gray-600 ml-2">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-2">
                        <div className={`w-6 h-6 rounded-full ${getUserColor(message.userId)} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-xs text-white font-medium">
                            {message.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-300">
                              {message.userName}
                            </span>
                            <span className="text-xs text-gray-600">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-200 break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-gray-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};