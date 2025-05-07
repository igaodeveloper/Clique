import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface WebSocketContextType {
  isConnected: boolean;
  joinClique: (cliqueId: number) => void;
  sendTypingStatus: (chainId: number, isTyping: boolean) => void;
  onlineUsers: Map<number, {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  typingUsers: Map<number, number[]>; // chainId -> [userId1, userId2, ...]
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  joinClique: () => {},
  sendTypingStatus: () => {},
  onlineUsers: new Map(),
  typingUsers: new Map()
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentCliqueId, setCurrentCliqueId] = useState<number | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<number, {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<number, number[]>>(new Map());

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (!user) {
      // Close existing socket if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);

    // Handle WebSocket events
    newSocket.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate connection
      newSocket.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id
      }));
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    newSocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (user) {
          console.log('Attempting to reconnect WebSocket...');
          // The effect will run again and reconnect
        }
      }, 3000);
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [user]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'authenticated':
        setIsConnected(true);
        console.log('WebSocket authenticated');
        
        // If we were already in a clique, rejoin it
        if (currentCliqueId !== null) {
          joinClique(currentCliqueId);
        }
        break;
        
      case 'joinedClique':
        console.log(`Joined clique ${data.cliqueId}`);
        // Reset online users for new clique
        setOnlineUsers(new Map());
        break;
        
      case 'userOnline':
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.user.id, data.user);
          return newMap;
        });
        break;
        
      case 'userOffline':
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
        break;
        
      case 'userTyping':
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          
          if (!newMap.has(data.chainId)) {
            newMap.set(data.chainId, []);
          }
          
          const typingList = newMap.get(data.chainId)!;
          
          if (data.isTyping) {
            // Add user to typing list if not already there
            if (!typingList.includes(data.userId)) {
              newMap.set(data.chainId, [...typingList, data.userId]);
            }
          } else {
            // Remove user from typing list
            newMap.set(
              data.chainId, 
              typingList.filter(id => id !== data.userId)
            );
          }
          
          return newMap;
        });
        break;
        
      case 'newContent':
        // Content is automatically updated via React Query invalidation
        // But we can show a toast notification
        toast({
          title: "Nova contribuição",
          description: "Um membro adicionou novo conteúdo à cadeia."
        });
        break;
        
      case 'newReaction':
        // Reactions are automatically updated via React Query invalidation
        break;
        
      case 'notification':
        toast({
          title: "Notificação",
          description: data.message
        });
        break;
        
      case 'error':
        toast({
          title: "Erro",
          description: data.message,
          variant: "destructive"
        });
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  // Join a clique
  const joinClique = (cliqueId: number) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'joinClique',
        cliqueId
      }));
      setCurrentCliqueId(cliqueId);
    }
  };

  // Send typing status
  const sendTypingStatus = (chainId: number, isTyping: boolean) => {
    if (socket && isConnected && currentCliqueId) {
      socket.send(JSON.stringify({
        type: 'typing',
        chainId,
        isTyping
      }));
    }
  };

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      joinClique,
      sendTypingStatus,
      onlineUsers,
      typingUsers
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};