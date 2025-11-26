/**
 * Alerts Controller
 *
 * Handles REST API requests for alert management
 * - List alerts with filters
 * - Get single alert
 * - Mark alert as reviewed
 * - Delete alert
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/alerts
 * List alerts with optional filters
 */
export const getAlerts = async (req: Request, res: Response) => {
  try {
    const {
      deviceId,
      threatLevel,
      detectionType,
      startDate,
      endDate,
      isReviewed,
      limit = 50,
      offset = 0,
    } = req.query;

    // Build where clause dynamically
    const alerts = await prisma.alert.findMany({
      where: {
        ...(deviceId && { deviceId: deviceId as string }),
        ...(threatLevel && {
          threatLevel: {
            in: Array.isArray(threatLevel) ? threatLevel as string[] : [threatLevel as string],
          },
        }),
        ...(detectionType && {
          detectionType: {
            in: Array.isArray(detectionType) ? detectionType as string[] : [detectionType as string],
          },
        }),
        ...(startDate && endDate && {
          timestamp: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        }),
        ...(isReviewed !== undefined && { isReviewed: isReviewed === 'true' }),
      },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    console.log(`[Alerts] Retrieved ${alerts.length} alerts`);
    res.json(alerts);
  } catch (error) {
    console.error('[Alerts] Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/alerts/:id
 * Get single alert by ID
 */
export const getAlertById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    console.log(`[Alerts] Retrieved alert: ${id}`);
    return res.json(alert);
  } catch (error) {
    console.error('[Alerts] Error fetching alert:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/alerts/:id/reviewed
 * Mark alert as reviewed (or unreviewed)
 */
export const markAlertReviewed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isReviewed } = req.body;

    const alert = await prisma.alert.update({
      where: { id },
      data: { isReviewed: isReviewed ?? true },
    });

    console.log(`[Alerts] Marked alert ${id} as ${isReviewed ? 'reviewed' : 'unreviewed'}`);
    return res.json(alert);
  } catch (error) {
    console.error('[Alerts] Error updating alert:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/alerts/:id
 * Delete alert
 */
export const deleteAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.alert.delete({
      where: { id },
    });

    console.log(`[Alerts] Deleted alert: ${id}`);
    res.status(204).send();
  } catch (error) {
    console.error('[Alerts] Error deleting alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
