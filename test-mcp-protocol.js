#!/usr/bin/env node

// Simple test to verify server starts and can connect
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('Testing MCP server startup and basic functionality...');

// Start the server
const serverProcess = spawn('node', ['dist/cli.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'test' }
});

let receivedData = '';

serverProcess.stdout.on('data', (data) => {
  const message = data.toString();
  receivedData += message;
  console.log('STDOUT:', message.trim());
});

serverProcess.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString().trim());
});

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

console.log('Sending initialize request...');
serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// Wait for response
await setTimeout(2000);

// Send tools/list request
const toolsRequest = {
  jsonrpc: '2.0', 
  id: 2,
  method: 'tools/list',
  params: {}
};

console.log('Sending tools/list request...');
serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');

// Wait for response
await setTimeout(2000);

console.log('Killing server process...');
serverProcess.kill();

console.log('Test completed.');
process.exit(0);
