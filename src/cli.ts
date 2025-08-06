#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server, amadeus } from './index.js';

// Load environment variables
dotenv.config();

// Detect if we should use stdio transport (when called by Claude Desktop via npx)
function shouldUseStdio(): boolean {
  // Check if we're being called by npx or if stdio arguments are present
  const isNpx = process.env.npm_execpath?.includes('npx') || 
                process.argv[0]?.includes('npx') ||
                process.env.npm_command === 'exec';
  
  // Check for explicit stdio flag
  const hasStdioFlag = process.argv.includes('--stdio');
  
  // Check for explicit http flag
  const hasHttpFlag = process.argv.includes('--http');
  
  console.error(`[DEBUG] Transport detection:`, {
    isNpx,
    hasStdioFlag,
    hasHttpFlag,
    npm_execpath: process.env.npm_execpath,
    npm_command: process.env.npm_command,
    argv0: process.argv[0],
    args: process.argv.slice(2)
  });
  
  // If http flag is explicitly set, use HTTP
  if (hasHttpFlag) {
    console.error('[DEBUG] Using HTTP transport (explicit flag)');
    return false;
  }
  
  // If stdio flag is explicitly set, use stdio
  if (hasStdioFlag) {
    console.error('[DEBUG] Using stdio transport (explicit flag)');
    return true;
  }
  
  // If called via npx (like Claude Desktop does), use stdio
  if (isNpx) {
    console.error('[DEBUG] Using stdio transport (detected npx)');
    return true;
  }
  
  // Default to HTTP for direct node calls
  console.error('[DEBUG] Using HTTP transport (default)');
  return false;
}

// Start the server
async function main() {
  console.error('[DEBUG] Starting main function...');
  
  // Check for Amadeus credentials
  if (!amadeus) {
    console.error('Error: Amadeus API client could not be initialized. Check your environment variables.');
    process.exit(1);
  }

  const useStdio = shouldUseStdio();
  
  if (useStdio) {
    // Use stdio transport for Claude Desktop
    console.error('[DEBUG] Starting Amadeus MCP Server with stdio transport...');
    
    // IMPORTANT: Import modules to register tools, resources, and prompts
    console.error('[DEBUG] Importing modules to register MCP methods...');
    await Promise.all([
      import('./tools.js'),
      import('./resources.js'),
      import('./prompt.js')
    ]);
    console.error('[DEBUG] All modules imported successfully');
    
    const transport = new StdioServerTransport();
    
    // Add connection event handlers
    transport.onclose = () => {
      console.error('[DEBUG] Transport closed');
    };
    
    transport.onerror = (error) => {
      console.error('[DEBUG] Transport error:', error);
    };
    
    await server.connect(transport);
    console.error('[DEBUG] Amadeus MCP Server connected via stdio transport');
    
    // Keep the process alive
    console.error('[DEBUG] Keeping process alive...');
    
    // Handle process signals gracefully
    process.on('SIGINT', () => {
      console.error('[DEBUG] Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('[DEBUG] Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
    
    // Add an error handler for uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[DEBUG] Uncaught exception:', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[DEBUG] Unhandled rejection at:', promise, 'reason:', reason);
    });
    
  } else {
    // Use HTTP/SSE transport for web applications
    console.error('[DEBUG] Starting HTTP server...');
    await startHttpServer();
  }
}

async function startHttpServer() {
  // Set up Express app
  const app = express();
  
  // Configure CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from ${origin}`;
        return callback(new Error(msg), false);
      }
      
      return callback(null, true);
    }
  }));
  
  app.use(express.json());

  const PORT = process.env.PORT || 3000;
  
  // Store active transports
  const activeTransports = new Map();

  // SSE endpoint
  app.get('/sse', async (req, res) => {
    console.error('New SSE connection requested');
    
    // Generate a unique ID for this connection
    const connectionId = Date.now().toString();
    
    const transport = new SSEServerTransport('/messages', res);
    activeTransports.set(connectionId, transport);
    
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    
    res.flushHeaders();
    
    // Send the connection ID to the client
    res.write(`data: ${JSON.stringify({ connectionId })}\n\n`);
    
    await server.connect(transport);
    
    req.on('close', () => {
      console.error(`SSE connection ${connectionId} closed`);
      activeTransports.delete(connectionId);
    });
  });

  // Handle client-to-server messages
  app.post('/messages', async (req, res) => {
    const connectionId = req.query.connectionId as string;
    const transport = activeTransports.get(connectionId);
    
    if (!transport) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    await transport.handlePostMessage(req, res);
  });

  // Status endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      connections: activeTransports.size,
      version: process.env.npm_package_version || '1.1.0'
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.error(`Amadeus Flight MCP Server running on port ${PORT}`);
    console.error(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.error(`Amadeus API client initialized: ${!!amadeus}`);
  });
}

main().catch((error: unknown) => {
  console.error('[DEBUG] Fatal error in main:', error);
  process.exit(1);
});
