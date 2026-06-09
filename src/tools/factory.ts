import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { getIpsCredentials } from '../env.js';
import type { IpsEndpoint } from '../ips/catalog.js';
import { IpsRestClient } from '../ips/client.js';
import { errorResult, jsonResult, missingCredentialsResult } from './results.js';

const querySchema = z
  .record(z.union([z.string(), z.number(), z.boolean()]))
  .optional()
  .describe('Query string parameters (@apiparam from IPS docs)');

const bodySchema = z
  .record(z.unknown())
  .optional()
  .describe('Form body for POST/PUT (application/x-www-form-urlencoded)');

export function buildEndpointInputSchema(endpoint: IpsEndpoint): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const param of endpoint.pathParams) {
    shape[param] = z
      .union([z.string(), z.number()])
      .describe(`Path parameter {${param}}`);
  }
  shape.query = querySchema;
  if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'DELETE') {
    shape.body = bodySchema;
  }
  return z.object(shape);
}

function endpointDescription(endpoint: IpsEndpoint): string {
  const flags: string[] = [];
  if (endpoint.memberOnly) {
    flags.push('OAuth/member only (@apimemberonly)');
  }
  if (endpoint.clientOnly) {
    flags.push('API key only (@apiclientonly)');
  }
  const flagText = flags.length ? ` [${flags.join('; ')}]` : '';
  const params =
    endpoint.queryParams.length > 0
      ? ` API params: ${endpoint.queryParams
          .map((p) => (p.required ? `${p.name} (required)` : p.name))
          .join(', ')}.`
      : '';
  let extra = '';
  if (endpoint.path === '/core/search') {
    extra =
      ' Date filters start_after/start_before/updated_after/updated_before: Unix timestamp in seconds (e.g. "1780521600"), not ISO datetime or P5D.';
  }
  return `${endpoint.method} ${endpoint.path} — ${endpoint.description}.${params}${extra}${flagText} Requires IPS5_BASE_URL and IPS5_API_KEY with permission for this endpoint.`;
}

export function registerEndpointTool(server: McpServer, endpoint: IpsEndpoint): void {
  const inputSchema = buildEndpointInputSchema(endpoint);

  server.registerTool(
    endpoint.toolName,
    {
      description: endpointDescription(endpoint),
      inputSchema,
    },
    async (args: Record<string, unknown>) => {
      const creds = getIpsCredentials();
      if (!creds) {
        return missingCredentialsResult();
      }

      const pathParams: Record<string, string | number> = {};
      for (const key of endpoint.pathParams) {
        const value = args[key];
        if (value === undefined || value === null) {
          return errorResult(new Error(`Missing path parameter: ${key}`));
        }
        pathParams[key] = value as string | number;
      }

      try {
        const client = new IpsRestClient(creds);
        const data = await client.callEndpoint(endpoint, {
          pathParams,
          query: args.query as Record<string, string | number | boolean> | undefined,
          body: args.body as Record<string, unknown> | undefined,
        });
        return jsonResult(data);
      } catch (err: unknown) {
        return errorResult(err);
      }
    },
  );
}

export function withIpsClient<T>(
  run: (client: IpsRestClient) => Promise<T>,
): Promise<
  | { ok: true; data: T }
  | { ok: false; result: ReturnType<typeof missingCredentialsResult | typeof errorResult> }
> {
  const creds = getIpsCredentials();
  if (!creds) {
    return Promise.resolve({ ok: false, result: missingCredentialsResult() });
  }
  const client = new IpsRestClient(creds);
  return run(client)
    .then((data) => ({ ok: true as const, data }))
    .catch((err: unknown) => ({ ok: false as const, result: errorResult(err) }));
}
