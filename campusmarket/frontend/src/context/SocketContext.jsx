import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../services/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8080', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinConversation = (conversationId) => {
    socketRef.current?.emit('join_conversation', conversationId);
  };

  const sendMessage = (conversationId, text, type = 'text') => {
    socketRef.current?.emit('send_message', { conversationId, text, type });
  };

  const markRead = (conversationId) => {
    socketRef.current?.emit('message_read', { conversationId });
  };

  const onNewMessage = (callback) => {
    socketRef.current?.on('new_message', callback);
    return () => socketRef.current?.off('new_message', callback);
  };

  const onMessageRead = (callback) => {
    socketRef.current?.on('message_read', callback);
    return () => socketRef.current?.off('message_read', callback);
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      joinConversation,
      sendMessage,
      markRead,
      onNewMessage,
      onMessageRead,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
