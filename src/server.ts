import { config as loadDotenv } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { getServerInfo } from './config.js';
import { getIpsCredentials } from './env.js';
import { IpsRestClient } from './ips/client.js';

/**
 * Starts the MCP server over stdio and registers IPS-related tools.
 */
export async function runMcpServer(): Promise<void> {
  loadDotenv();

  const { name, version } = getServerInfo();
  const server = new McpServer({ name, version });

  server.registerTool(
    'core_hello',
    {
      description:
        'Calls Invision Community GET /api/core/hello (community name, URL, IPS version). Requires IPS5_BASE_URL and IPS5_API_KEY.',
    },
    async () => {
      const creds = getIpsCredentials();
      if (!creds) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text:
                'Missing IPS5_BASE_URL or IPS5_API_KEY. Copy .env.example to .env, set both values, then restart this MCP server (or set them in your MCP client env block).',
            },
          ],
        };
      }
      try {
        const client = new IpsRestClient(creds);
        const data = await client.getCoreHello();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
