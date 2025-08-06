#!/usr/bin/env node

// Test MCP server with stdio transport (like Claude Desktop uses)
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('Testing MCP server with stdio transport...');

// Start the server with stdio flag
const serverProcess = spawn('node', ['dist/cli.js', '--stdio'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'test' }
});

let receivedData = '';
let initResponseReceived = false;

serverProcess.stdout.on('data', (data) => {
  const message = data.toString();
  receivedData += message;
  console.log('STDOUT:', message.trim());
  
  try {
    const response = JSON.parse(message.trim());
    if (response.id === 1) {
      console.log('✅ Initialize response received');
      initResponseReceived = true;
    } else if (response.id === 2) {
      console.log('✅ Tools/list response received');
      if (response.result && response.result.tools) {
        console.log(`Found ${response.result.tools.length} tools:`);
        response.result.tools.forEach(tool => {
          console.log(`  - ${tool.name}`);
        });
      }
    }
  } catch (e) {
    // Ignore JSON parse errors for debug output
  }
});

serverProcess.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString().trim());
});

// Wait a moment for server to start
await setTimeout(1000);

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

// Wait for init response
await setTimeout(2000);

if (initResponseReceived) {
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
  await setTimeout(3000);
}

console.log('Killing server process...');
serverProcess.kill();

console.log('Test completed.');
process.exit(0);
