#!/usr/bin/env tsx
/**
 * Register Somnia Data Streams Event Schema
 * 
 * This script registers the event schema on-chain for Vidrune events.
 * Run this ONCE when deploying the backend for the first time.
 * 
 * Usage:
 *   npm run register-sds-schema
 * 
 * Or via API:
 *   curl -X POST http://localhost:3001/api/admin/register-sds-schema
 */

import 'dotenv/config';
import { getStreamsService } from '../src/services/streams';

async function main() {
  console.log('🔧 Registering Somnia Data Streams event schema...\n');

  try {
    const streamsService = getStreamsService();

    // Check connection status
    const status = streamsService.getConnectionStatus();
    console.log('Connection Status:');
    console.log(`  - SDK initialized: ${status.sdk}`);
    console.log(`  - Connected: ${status.connected}\n`);

    if (!status.connected) {
      console.error('❌ SDS SDK is not connected. Check your BACKEND_WALLET_PRIVATE_KEY and SOMNIA_RPC_URL');
      process.exit(1);
    }

    // Register schema
    console.log('Registering event schema on-chain...');
    await streamsService.registerEventSchema();

    console.log('\n✅ Event schema registered successfully!');
    console.log('   Events can now be emitted to Somnia Data Streams.');
    console.log('\nNext steps:');
    console.log('  1. Start the backend: npm run dev');
    console.log('  2. Events will be automatically emitted when markets are created/resolved');
    console.log('  3. Frontend can subscribe to these events via SDS');

  } catch (error) {
    console.error('\n❌ Failed to register schema:', error);
    process.exit(1);
  }
}

main();
