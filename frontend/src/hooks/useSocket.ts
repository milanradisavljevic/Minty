import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDashboardStore } from '../stores/dashboardStore';
import type { SystemMetrics } from '../types';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const setMetrics = useDashboardStore((state) => state.setMetrics);
  const setConnected = useDashboardStore((state) => state.setConnected);

  useEffect(() => {
    // Connect to the backend WebSocket server
    const socket = io('/', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      socket.emit('metrics:subscribe');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    socket.on('metrics:update', (data: SystemMetrics) => {
      setMetrics(data);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnected(false);
    });

    return () => {
      socket.emit('metrics:unsubscribe');
      socket.disconnect();
    };
  }, [setMetrics, setConnected]);

  return socketRef.current;
}
