import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { getServerInfo } from './config.js';
import { loadMcpInstructions } from './docs/loader.js';
import { registerDocumentation } from './docs/register.js';
import { registerAllIpsTools } from './tools/register.js';

/**
 * Builds the MCP server with IPS REST tools from the endpoint catalog.
 */
export function createIpsMcpServer(): McpServer {
  const { name, version } = getServerInfo();
  const server = new McpServer(
    { name, version },
    { instructions: loadMcpInstructions() },
  );

  registerDocumentation(server);
  registerAllIpsTools(server);

  return server;
}

/**
 * Starts the MCP server over stdio (local Cursor / CLI).
 */
export async function runStdioServer(): Promise<void> {
  const server = createIpsMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
