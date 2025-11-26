/**
 * Authentication Controller
 *
 * Handles user authentication:
 * - Registration with password hashing
 * - Login with JWT token generation
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const prisma = new PrismaClient();

/**
 * POST /auth/register
 * Register new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password (bcrypt with 10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // Generate JWT tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email } as object,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: user.id } as object,
      config.refreshTokenSecret,
      { expiresIn: config.refreshTokenExpiresIn } as jwt.SignOptions
    );

    console.log(`[Auth] User registered: ${email}`);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens: {
        accessToken: token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email } as object,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: user.id } as object,
      config.refreshTokenSecret,
      { expiresIn: config.refreshTokenExpiresIn } as jwt.SignOptions
    );

    console.log(`[Auth] User logged in: ${email}`);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens: {
        accessToken: token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
