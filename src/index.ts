/**
 * TrailSense Backend Server
 *
 * Main entry point for the backend API
 * Handles:
 * - HTTP REST API (Express)
 * - WebSocket server (Socket.io)
 * - Golioth webhook integration
 * - JWT authentication
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config/env';
import routes from './routes';
import { initializeWebSocket } from './services/websocketService';

// Create Express app
const app = express();

// Create HTTP server
const httpServer = http.createServer(app);

// ============================================
// Middleware
// ============================================

// CORS configuration
app.use(cors({
  origin: config.wsCorsOrigins,
  credentials: true,
}));

// JSON body parser
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Routes
// ============================================

app.use('/', routes);

// ============================================
// WebSocket Initialization
// ============================================

initializeWebSocket(httpServer);

// ============================================
// Start Server
// ============================================

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  🚀 TrailSense Backend Server');
  console.log('═══════════════════════════════════════════');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  URL: http://localhost:${config.port}`);
  console.log(`  Network: http://192.168.12.63:${config.port}`);
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('📡 API Endpoints:');
  console.log('');
  console.log('Public Routes:');
  console.log(`  POST   /webhook/golioth        - Golioth webhook`);
  console.log(`  POST   /auth/register          - User registration`);
  console.log(`  POST   /auth/login             - User login`);
  console.log(`  GET    /health                 - Health check`);
  console.log('');
  console.log('Protected Routes (require JWT token):');
  console.log(`  GET    /api/alerts             - List alerts`);
  console.log(`  GET    /api/alerts/:id         - Get alert`);
  console.log(`  PATCH  /api/alerts/:id/reviewed - Mark reviewed`);
  console.log(`  DELETE /api/alerts/:id         - Delete alert`);
  console.log('');
  console.log('🔌 WebSocket:');
  console.log(`  ws://localhost:${config.port}`);
  console.log('  Events: alert, device-status');
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('✅ Server is running!');
  console.log('═══════════════════════════════════════════');
  console.log('');
});

// ============================================
// Error Handling
// ============================================

process.on('uncaughtException', (error) => {
  console.error('[Fatal] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
