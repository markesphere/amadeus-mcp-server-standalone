#!/usr/bin/env node

// Test script to verify that tools are properly registered
import { server } from './dist/index.js';

console.log('Testing MCP server tool registration...');

// Import the modules to register tools
await Promise.all([
  import('./dist/tools.js'),
  import('./dist/resources.js'), 
  import('./dist/prompt.js')
]);

console.log('Modules imported. Checking server capabilities...');

// Test if tools are registered
try {
  const tools = await server.list_tools();
  console.log(`✅ Found ${tools.tools?.length || 0} tools registered:`);
  tools.tools?.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
} catch (error) {
  console.log('❌ Error listing tools:', error);
}

// Test if resources are registered  
try {
  const resources = await server.list_resources();
  console.log(`✅ Found ${resources.resources?.length || 0} resources registered:`);
  resources.resources?.forEach(resource => {
    console.log(`  - ${resource.name}: ${resource.uri}`);
  });
} catch (error) {
  console.log('❌ Error listing resources:', error);
}

// Test if prompts are registered
try {
  const prompts = await server.list_prompts();
  console.log(`✅ Found ${prompts.prompts?.length || 0} prompts registered:`);
  prompts.prompts?.forEach(prompt => {
    console.log(`  - ${prompt.name}: ${prompt.description}`);
  });
} catch (error) {
  console.log('❌ Error listing prompts:', error);
}

console.log('Test completed.');
process.exit(0);
