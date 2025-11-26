/**
 * Devices Controller
 *
 * Handles device management endpoints
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/devices
 * Get all devices
 */
export const getDevices = async (_req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`[Devices] Retrieved ${devices.length} devices`);
    return res.json(devices);
  } catch (error) {
    console.error('[Devices] Error fetching devices:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/devices/:id
 * Get single device by ID
 */
export const getDeviceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    console.log(`[Devices] Retrieved device: ${device.name}`);
    return res.json(device);
  } catch (error) {
    console.error('[Devices] Error fetching device:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/devices/:id
 * Update device
 */
export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const device = await prisma.device.update({
      where: { id },
      data: updates,
    });

    console.log(`[Devices] Updated device: ${device.name}`);
    return res.json(device);
  } catch (error) {
    console.error('[Devices] Error updating device:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/devices/:id
 * Delete device
 */
export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.device.delete({
      where: { id },
    });

    console.log(`[Devices] Deleted device: ${id}`);
    return res.status(204).send();
  } catch (error) {
    console.error('[Devices] Error deleting device:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
