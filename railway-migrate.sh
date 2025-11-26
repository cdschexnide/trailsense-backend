#!/bin/bash
# Railway migration script
# This runs migrations before starting the server

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting server..."
npm start
