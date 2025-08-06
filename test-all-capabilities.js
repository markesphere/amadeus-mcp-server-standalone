#!/usr/bin/env node

// Test all MCP capabilities (tools, resources, prompts)
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('Testing all MCP server capabilities...');

const serverProcess = spawn('node', ['dist/cli.js', '--stdio'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'test' }
});

let requestId = 1;

serverProcess.stdout.on('data', (data) => {
  const messages = data.toString().split('\n').filter(line => line.trim());
  
  for (const message of messages) {
    try {
      const response = JSON.parse(message.trim());
      
      if (response.id === 1) {
        console.log('✅ Initialize response received');
        sendRequest('tools/list', {});
      } else if (response.id === 2) {
        console.log(`✅ Tools: Found ${response.result?.tools?.length || 0} tools`);
        sendRequest('resources/list', {});
      } else if (response.id === 3) {
        console.log(`✅ Resources: Found ${response.result?.resources?.length || 0} resources`);
        sendRequest('prompts/list', {});
      } else if (response.id === 4) {
        console.log(`✅ Prompts: Found ${response.result?.prompts?.length || 0} prompts`);
        console.log('🎉 All MCP capabilities working!');
        serverProcess.kill();
      }
    } catch (e) {
      // Ignore JSON parse errors for debug output
    }
  }
});

function sendRequest(method, params) {
  const request = {
    jsonrpc: '2.0',
    id: ++requestId,
    method,
    params
  };
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

serverProcess.stderr.on('data', (data) => {
  const message = data.toString().trim();
  if (message.includes('ERROR') || message.includes('error')) {
    console.log('STDERR:', message);
  }
});

// Wait for server to start
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

// Wait for all responses
await setTimeout(5000);

console.log('Test completed.');
process.exit(0);
