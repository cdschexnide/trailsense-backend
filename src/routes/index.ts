/**
 * API Routes
 *
 * Defines all HTTP endpoints for the TrailSense backend
 */

import express from 'express';
import { handleGoliothWebhook } from '../controllers/goliothWebhookController';
import { getAlerts, getAlertById, markAlertReviewed, deleteAlert } from '../controllers/alertsController';
import { register, login } from '../controllers/authController';
import { getDevices, getDeviceById, updateDevice, deleteDevice } from '../controllers/devicesController';
import { getAnalytics } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// ============================================
// Public Routes (no authentication required)
// ============================================

/**
 * POST /webhook/golioth
 * Receive webhooks from Golioth IoT platform
 */
router.post('/webhook/golioth', handleGoliothWebhook);

/**
 * POST /auth/register
 * Register new user account
 */
router.post('/auth/register', register);

/**
 * POST /auth/login
 * Login and receive JWT token
 */
router.post('/auth/login', login);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ============================================
// Protected Routes (JWT authentication required)
// ============================================

/**
 * GET /api/alerts
 * List alerts with optional filters
 * Query params: deviceId, threatLevel[], detectionType[], startDate, endDate, isReviewed, limit, offset
 */
router.get('/api/alerts', authenticate, getAlerts);

/**
 * GET /api/alerts/:id
 * Get single alert by ID
 */
router.get('/api/alerts/:id', authenticate, getAlertById);

/**
 * PATCH /api/alerts/:id/reviewed
 * Mark alert as reviewed
 * Body: { isReviewed: boolean }
 */
router.patch('/api/alerts/:id/reviewed', authenticate, markAlertReviewed);

/**
 * DELETE /api/alerts/:id
 * Delete alert
 */
router.delete('/api/alerts/:id', authenticate, deleteAlert);

/**
 * GET /api/devices
 * List all devices
 */
router.get('/api/devices', authenticate, getDevices);

/**
 * GET /api/devices/:id
 * Get single device by ID
 */
router.get('/api/devices/:id', authenticate, getDeviceById);

/**
 * PATCH /api/devices/:id
 * Update device
 */
router.patch('/api/devices/:id', authenticate, updateDevice);

/**
 * DELETE /api/devices/:id
 * Delete device
 */
router.delete('/api/devices/:id', authenticate, deleteDevice);

/**
 * GET /api/analytics
 * Get analytics data
 * Query params: period, startDate, endDate
 */
router.get('/api/analytics', authenticate, getAnalytics);

export default router;
