#!/usr/bin/env node

import { BaseMcpServer, StdioServerTransport, debug } from '../shared/api/mcp/index.js';
import { renameSymbolTool } from '../features/rename-symbol/index.js';
import { findReferencesTool } from '../features/find-references/index.js';
import { getSymbolsTool } from '../features/get-symbols/index.js';
import { moveFileTool } from '../features/move-file/index.js';
import { findUnusedTool } from '../features/find-unused/index.js';

/**
 * Main server entry point
 */
async function main() {
  try {
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();

    // Create server instance
    const server = new BaseMcpServer({
      name: 'php-mcp',
      version: '0.1.0',
      description: 'PHP refactoring and analysis tools for MCP',
      capabilities: {
        tools: {},
      },
    });

    // Set default root
    server.setDefaultRoot(projectRoot);

    // Register tools
    const tools = [
      renameSymbolTool,
      findReferencesTool,
      getSymbolsTool,
      moveFileTool,
      findUnusedTool,
    ];

    server.registerTools(tools);

    // Connect transport and start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    debug('PHP MCP Server running on stdio');
    debug(`Project root: ${projectRoot}`);
    debug(`Registered tools: ${tools.map(t => t.name).join(', ')}`);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});