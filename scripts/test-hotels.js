#!/usr/bin/env node

/**
 * Hotel API Integration Test Runner
 * 
 * This script runs hotel-specific integration tests and provides
 * detailed output for debugging hotel API integration issues.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

console.log('🏨 Amadeus Hotel API Integration Test Runner');
console.log('==========================================');

// Check for environment variables
if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
  console.log('❌ Missing Amadeus API credentials');
  console.log('Please set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in your .env file');
  process.exit(1);
}

console.log('✅ Amadeus API credentials found');
console.log('🧪 Running hotel integration tests...\n');

// Run hotel search tests
const hotelSearchTest = spawn('npx', [
  'jest',
  '__tests__/integration/hotel-search.test.js',
  '--verbose',
  '--detectOpenHandles',
  '--forceExit'
], {
  stdio: 'inherit',
  shell: true
});

hotelSearchTest.on('close', (code) => {
  console.log(`\n📊 Hotel search tests completed with code ${code}`);
  
  if (code === 0) {
    console.log('🧪 Running hotel booking tests...\n');
    
    // Run hotel booking tests
    const hotelBookingTest = spawn('npx', [
      'jest',
      '__tests__/integration/hotel-booking.test.js',
      '--verbose',
      '--detectOpenHandles',
      '--forceExit'
    ], {
      stdio: 'inherit',
      shell: true
    });

    hotelBookingTest.on('close', (bookingCode) => {
      console.log(`\n📊 Hotel booking tests completed with code ${bookingCode}`);
      
      if (bookingCode === 0) {
        console.log('\n🎉 All hotel integration tests passed!');
        console.log('\nNext steps:');
        console.log('1. Implement the hotel tools in src/tools.ts');
        console.log('2. Add hotel tools to the MCP server');
        console.log('3. Test with the MCP inspector: npm run mcp:test');
      } else {
        console.log('\n❌ Some hotel booking tests failed');
        console.log('Check the output above for details');
      }
      
      process.exit(Math.max(code, bookingCode));
    });

    hotelBookingTest.on('error', (error) => {
      console.error('❌ Error running hotel booking tests:', error);
      process.exit(1);
    });
    
  } else {
    console.log('\n❌ Hotel search tests failed');
    console.log('Check the output above for details');
    process.exit(code);
  }
});

hotelSearchTest.on('error', (error) => {
  console.error('❌ Error running hotel search tests:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Test execution interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test execution terminated');
  process.exit(143);
});
