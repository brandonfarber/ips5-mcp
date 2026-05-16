import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { getIpsCredentials } from '../env.js';
import { filterEndpoints, getAllEndpoints, getEndpointCatalog } from '../ips/catalog.js';
import { registerEndpointTool, withIpsClient } from './factory.js';
import { jsonResult, missingCredentialsResult } from './results.js';

/**
 * Registers meta tools plus one MCP tool per IPS REST endpoint in the catalog.
 */
export function registerAllIpsTools(server: McpServer): void {
  registerMetaTools(server);

  for (const endpoint of getAllEndpoints()) {
    registerEndpointTool(server, endpoint);
  }
}

function registerMetaTools(server: McpServer): void {
  const catalog = getEndpointCatalog();

  server.registerTool(
    'ips_list_endpoints',
    {
      description:
        'Discover IPS REST tools: filter by app (core, forums, nexus), HTTP method, or search text. Use after ips_read_agent_guide when the user uses site-specific terms. Returns toolName to call next.',
      inputSchema: z.object({
        app: z
          .string()
          .optional()
          .describe('Application key, e.g. core, forums, blog, nexus'),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
        search: z
          .string()
          .optional()
          .describe('Search path, description, controller, or tool name'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe('Max results (default 50)'),
      }),
    },
    async (args) => {
      const list = filterEndpoints({
        app: args.app,
        method: args.method,
        search: args.search,
        limit: args.limit,
      });
      return jsonResult({
        catalogGeneratedAt: catalog.generatedAt,
        totalInCatalog: catalog.count,
        returned: list.length,
        endpoints: list.map((e) => ({
          toolName: e.toolName,
          method: e.method,
          path: e.path,
          description: e.description,
          pathParams: e.pathParams,
          memberOnly: e.memberOnly,
          clientOnly: e.clientOnly,
        })),
      });
    },
  );

  server.registerTool(
    'ips_api_call',
    {
      description:
        'Fallback: call any IPS REST path under /api (method, path, query, body). Prefer ips_read_agent_guide + ips_list_endpoints + a named ips_* tool when possible. POST/PUT use form-urlencoded body.',
      inputSchema: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
        path: z
          .string()
          .describe('API path under /api, e.g. /core/hello or /forums/topics/42'),
        query: z
          .record(z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe('Query string parameters'),
        body: z.record(z.unknown()).optional().describe('Form body for POST/PUT/DELETE'),
      }),
    },
    async (args) => {
      const outcome = await withIpsClient((client) =>
        client.requestJson({
          method: args.method,
          path: args.path,
          query: args.query,
          body: args.body,
        }),
      );
      if (!outcome.ok) {
        return outcome.result;
      }
      return jsonResult(outcome.data);
    },
  );

  server.registerTool(
    'core_hello',
    {
      description:
        'Calls Invision Community GET /api/core/hello (community name, URL, IPS version). Alias for ips_get_core_hello.',
    },
    async () => {
      const creds = getIpsCredentials();
      if (!creds) {
        return missingCredentialsResult();
      }
      const outcome = await withIpsClient((client) => client.getCoreHello());
      if (!outcome.ok) {
        return outcome.result;
      }
      return jsonResult(outcome.data);
    },
  );
}
