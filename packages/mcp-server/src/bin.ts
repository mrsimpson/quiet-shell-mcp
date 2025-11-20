#!/usr/bin/env node

/**
 * Entry point for quiet-shell MCP server
 */

import { startServer } from './server.js';

startServer().catch((error) => {
  process.stderr.write(`[quiet-shell] Fatal error: ${error.message}\n`);
  process.exit(1);
});
