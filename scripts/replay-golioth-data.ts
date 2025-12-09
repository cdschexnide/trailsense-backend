#!/usr/bin/env npx ts-node
/**
 * Golioth Historical Data Replay Script
 *
 * Fetches all historical LightDB Stream data from Golioth and replays it
 * to the TrailSense backend webhook endpoint.
 *
 * Usage:
 *   npx ts-node scripts/replay-golioth-data.ts
 *
 * Environment variables (or edit the config below):
 *   GOLIOTH_API_KEY - Golioth API key with stream:read permission
 *   GOLIOTH_PROJECT_ID - Golioth project ID
 *   BACKEND_URL - TrailSense backend URL
 *   BACKEND_WEBHOOK_SECRET - Webhook API key
 */

const CONFIG = {
  // Golioth Configuration
  goliothApiKey: process.env.GOLIOTH_API_KEY || '5KaVQJmDZXmkvB0ysj8xDx08r5oooHH2',
  goliothProjectId: process.env.GOLIOTH_PROJECT_ID || 'trailsense',
  goliothApiUrl: 'https://api.golioth.io/v2',

  // Backend Configuration
  backendUrl: process.env.BACKEND_URL || 'https://trailsense-production.up.railway.app',
  webhookSecret: process.env.BACKEND_WEBHOOK_SECRET || 'dev-webhook-secret',

  // Query Configuration
  startDate: '2025-12-01T00:00:00Z', // Adjust to your data range
  endDate: new Date().toISOString(),
  perPage: 100,

  // Replay Configuration
  delayBetweenRequests: 100, // ms between webhook calls to avoid overwhelming backend
  dryRun: false, // Set to true to see what would be sent without actually sending
};

interface GoliothStreamRecord {
  time: string;
  deviceId: string;
  data: {
    det?: {
      dist: number;
      mac: string;
      r?: number;
      t: string;
      zone: number;
      name?: string;
      ch?: number;
      avg?: number;
      peak?: number;
      delta?: number;
    };
    health?: {
      bat: number;
      rssi?: number;
    };
    did: string;
    ts: number;
  };
}

interface GoliothStreamResponse {
  list: GoliothStreamRecord[];
  page: number;
  perPage: number;
  total: number;
}

async function fetchGoliothStreamData(): Promise<GoliothStreamRecord[]> {
  const allRecords: GoliothStreamRecord[] = [];
  let page = 0;
  let hasMore = true;

  console.log('📡 Fetching data from Golioth LightDB Stream...');
  console.log(`   Project: ${CONFIG.goliothProjectId}`);
  console.log(`   Date range: ${CONFIG.startDate} to ${CONFIG.endDate}`);

  while (hasMore) {
    const url = `${CONFIG.goliothApiUrl}/projects/${CONFIG.goliothProjectId}/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': CONFIG.goliothApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: CONFIG.startDate,
        end: CONFIG.endDate,
        page,
        perPage: CONFIG.perPage,
        query: {
          fields: [
            { path: 'time' },
            { path: 'deviceId' },
            { path: '*' },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Golioth API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as GoliothStreamResponse;

    if (data.list && data.list.length > 0) {
      allRecords.push(...data.list);
      console.log(`   Page ${page + 1}: fetched ${data.list.length} records (total: ${allRecords.length})`);
      page++;
      hasMore = data.list.length === CONFIG.perPage;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allRecords.length} total records from Golioth\n`);
  return allRecords;
}

async function replayToBackend(records: GoliothStreamRecord[]): Promise<void> {
  console.log('🔄 Replaying data to TrailSense backend...');
  console.log(`   Backend: ${CONFIG.backendUrl}`);
  console.log(`   Dry run: ${CONFIG.dryRun}`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Determine path based on data content
    const path = record.data.det ? '/detections' : record.data.health ? '/heartbeat' : '/unknown';

    // Build webhook payload matching Golioth Pipeline format
    const webhookPayload = {
      path,
      data: record.data,
      // Include original timestamp from Golioth
      timestamp: record.time,
    };

    if (CONFIG.dryRun) {
      console.log(`   [DRY RUN] Would send: ${JSON.stringify(webhookPayload).substring(0, 100)}...`);
      successCount++;
      continue;
    }

    try {
      const response = await fetch(`${CONFIG.backendUrl}/webhook/golioth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.webhookSecret,
        },
        body: JSON.stringify(webhookPayload),
      });

      if (response.ok) {
        successCount++;
        if ((i + 1) % 50 === 0) {
          console.log(`   Progress: ${i + 1}/${records.length} (${successCount} success, ${errorCount} errors)`);
        }
      } else {
        errorCount++;
        const errorText = await response.text();
        console.error(`   ❌ Error for record ${i + 1}: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`   ❌ Network error for record ${i + 1}:`, error);
    }

    // Small delay to avoid overwhelming the backend
    if (CONFIG.delayBetweenRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));
    }
  }

  console.log(`\n✅ Replay complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Golioth → TrailSense Historical Data Replay');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Fetch all historical data from Golioth
    const records = await fetchGoliothStreamData();

    if (records.length === 0) {
      console.log('⚠️  No records found in the specified date range.');
      return;
    }

    // Sort by timestamp to replay in chronological order
    records.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Replay to backend
    await replayToBackend(records);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
