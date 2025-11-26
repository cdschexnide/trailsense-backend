/**
 * Analytics Controller
 *
 * Handles analytics and statistics endpoints
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/analytics
 * Get analytics data
 * Query params: period (day, week, month), startDate, endDate
 */
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;

    // Calculate date range based on period
    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      switch (period) {
        case 'day':
          start = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'week':
        default:
          start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Get total alerts count
    const totalAlerts = await prisma.alert.count({
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get alerts by threat level
    const alertsByThreatLevel = await prisma.alert.groupBy({
      by: ['threatLevel'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: true,
    });

    // Get alerts by detection type
    const alertsByDetectionType = await prisma.alert.groupBy({
      by: ['detectionType'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: true,
    });

    // Get alerts by device
    const alertsByDevice = await prisma.alert.groupBy({
      by: ['deviceId'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: true,
    });

    // Get daily alert counts for trend
    const dailyAlertsRaw: any[] = await prisma.$queryRaw`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM Alert
      WHERE timestamp >= ${start} AND timestamp <= ${end}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;

    // Convert BigInt to Number for JSON serialization
    const dailyAlerts = dailyAlertsRaw.map((row: any) => ({
      date: row.date,
      count: Number(row.count), // Convert BigInt to Number
    }));

    // Get top detected MACs
    const topDevices = await prisma.alert.groupBy({
      by: ['macAddress'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          macAddress: 'desc',
        },
      },
      take: 10,
    });

    const analytics = {
      period,
      startDate: start,
      endDate: end,
      totalAlerts,
      threatLevelDistribution: alertsByThreatLevel.map((item: any) => ({
        level: item.threatLevel,
        count: Number(item._count), // Convert BigInt to Number
      })),
      detectionTypeDistribution: alertsByDetectionType.map((item: any) => ({
        type: item.detectionType,
        count: Number(item._count), // Convert BigInt to Number
      })),
      deviceDistribution: alertsByDevice.map((item: any) => ({
        deviceId: item.deviceId,
        count: Number(item._count), // Convert BigInt to Number
      })),
      dailyTrend: dailyAlerts,
      topDetectedDevices: topDevices.map((item: any) => ({
        macAddress: item.macAddress,
        count: Number(item._count), // Convert BigInt to Number
      })),
    };

    console.log(`[Analytics] Retrieved analytics for period: ${period}`);
    return res.json(analytics);
  } catch (error) {
    console.error('[Analytics] Error fetching analytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
