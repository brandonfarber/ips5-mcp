import { config as loadDotenv } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { getServerInfo } from './config.js';
import { registerAllIpsTools } from './tools/register.js';

/**
 * Starts the MCP server over stdio with IPS REST tools from the endpoint catalog.
 */
export async function runMcpServer(): Promise<void> {
  loadDotenv();

  const { name, version } = getServerInfo();
  const server = new McpServer({ name, version });

  registerAllIpsTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
