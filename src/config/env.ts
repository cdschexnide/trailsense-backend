import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',

  // Golioth
  goliothWebhookSecret: process.env.GOLIOTH_WEBHOOK_SECRET || '',

  // Firebase (optional for push notifications)
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:19006',
  wsCorsOrigins: process.env.WS_CORS_ORIGINS?.split(',') || ['http://localhost:19006', 'http://localhost:8081'],
};

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

console.log('[Config] Environment variables loaded successfully');
console.log(`[Config] Node environment: ${config.nodeEnv}`);
console.log(`[Config] Server port: ${config.port}`);
console.log(`[Config] Database: ${config.databaseUrl.includes('postgresql') ? 'PostgreSQL' : 'SQLite'}`);
