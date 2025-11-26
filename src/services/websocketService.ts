/**
 * WebSocket Service
 *
 * Handles real-time communication with mobile app clients using Socket.io
 *
 * Features:
 * - JWT authentication for WebSocket connections
 * - Real-time alert broadcasting
 * - Device status updates
 * - Auto-reconnect support
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JWTPayload } from '../types';

let io: SocketIOServer;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.wsCorsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id} (User: ${socket.data.user.email})`);

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[WebSocket] Server initialized');
  console.log(`[WebSocket] CORS origins: ${config.wsCorsOrigins.join(', ')}`);

  return io;
}

/**
 * Broadcast new alert to all connected clients
 */
export function broadcastAlert(alert: any): void {
  if (io) {
    io.emit('alert', alert);
    console.log(`[WebSocket] Broadcasted alert: ${alert.id} (${alert.threatLevel})`);
  } else {
    console.warn('[WebSocket] Cannot broadcast alert - WebSocket server not initialized');
  }
}

/**
 * Broadcast device status update to all connected clients
 */
export function broadcastDeviceStatus(deviceId: string, status: any): void {
  if (io) {
    io.emit('device-status', { id: deviceId, ...status });
    console.log(`[WebSocket] Broadcasted device status: ${deviceId}`);
  } else {
    console.warn('[WebSocket] Cannot broadcast device status - WebSocket server not initialized');
  }
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): SocketIOServer | undefined {
  return io;
}
