import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { getIpsCredentials } from '../env.js';
import type { IpsEndpoint } from '../ips/catalog.js';
import { IpsRestClient } from '../ips/client.js';
import { errorResult, jsonResult, missingCredentialsResult } from './results.js';

const querySchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional()
  .describe('Query string parameters (@apiparam from IPS docs)');

const bodySchema = z
  .record(z.string(), z.unknown())
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

export function endpointDescription(endpoint: IpsEndpoint): string {
  const flags: string[] = [];
  if (endpoint.memberOnly) {
    flags.push('OAuth/member only (@apimemberonly)');
  }
  if (endpoint.clientOnly) {
    flags.push('API key only (@apiclientonly)');
  }
  const flagText = flags.length ? ` [${flags.join('; ')}]` : '';
  const copywriting = endpoint.path.startsWith('/copywritingcourse');
  const params =
    !copywriting && endpoint.queryParams.length > 0
      ? ` API params: ${endpoint.queryParams
          .map((p) => (p.required ? `${p.name} (required)` : p.name))
          .join(', ')}.`
      : '';
  let extra = '';
  if (endpoint.path === '/core/search') {
    extra =
      ' Date filters start_after/start_before/updated_after/updated_before: Unix timestamp in seconds (e.g. "1780521600"), not ISO datetime or P5D.';
  }
  if (copywriting) {
    extra += copywritingCourseUsage(endpoint);
  }
  const summary = endpoint.description.endsWith('.')
    ? endpoint.description
    : `${endpoint.description}.`;
  return `${endpoint.method} ${endpoint.path} — ${summary}${params}${extra}${flagText} Requires IPS5_BASE_URL and IPS5_API_KEY with permission for this endpoint.`;
}

function copywritingCourseUsage(endpoint: IpsEndpoint): string {
  const notes = [
    'Body fields are form-urlencoded. Objects and arrays are sent as JSON; the API decodes a value that starts with { or [.',
    'Enable this endpoint on the API key in ACP → System → REST & OAuth → API Keys before calling it. Access is not granted automatically.',
  ];
  if (endpoint.queryParams.length > 0) {
    notes.push(
      `Fields: ${endpoint.queryParams
        .map((param) => {
          const label = param.required ? `${param.name} (required)` : param.name;
          return param.description ? `${label}: ${param.description}` : label;
        })
        .join('; ')}.`,
    );
  }

  const { method, path } = endpoint;
  if (method === 'POST' && (path === '/copywritingcourse/pages' || path === '/copywritingcourse/pages/{id}')) {
    notes.push(
      'A block reference is a key, a numeric ID, or {"key":"..."} / {"id":1}. areas replaces the whole layout: send a JSON list of {area, blocks} or a map such as {"col1":["hero","cta"]}. Missing areas are removed, including widgets that are not CMS blocks. blocks is shorthand that replaces only col1. Do not send areas and blocks together. HTML pages reject areas and blocks (1CWC/P13). Builder pages reject content (1CWC/P12). The page type cannot be changed after creation (1CWC/P5). Placements are cms/Blocks widgets with cms_widget_custom_block set to the block key. For a raw HTML page, set ipb_wrapper to true unless the user asks for no wrapper.',
    );
  }
  if (method === 'GET' && (path === '/copywritingcourse/pages' || path === '/copywritingcourse/pages/{id}')) {
    notes.push(
      'Builder pages include areas. HTML pages include embedded_blocks for {block="key"} tags. Creating a page still defaults to type=html.',
    );
  }
  if (method === 'POST' && path === '/copywritingcourse/menu') {
    notes.push(
      'parent of 0 is the root. A dropdown (core_Menu) cannot be nested under another dropdown. permissions is *, inherit, a comma-separated group list, or a JSON array of group IDs. menu_types is * or a JSON array of header, sidebar, and smallscreen. 1CWC/N8 is FIELD_REQUIRED or INVALID_CONFIG:menu_content_page.',
    );
  }
  if (method === 'POST' && path === '/copywritingcourse/menu/{id}') {
    notes.push(
      'Sent config fields merge into the saved config. parent of 0 is the root. A dropdown (core_Menu) cannot be nested under another dropdown. 1CWC/N8 is FIELD_REQUIRED or INVALID_CONFIG:menu_content_page.',
    );
  }
  if (method === 'POST' && path === '/copywritingcourse/blocks') {
    notes.push(
      'type is custom (default) or plugin. editor is html (default) or editor for WYSIWYG. PHP blocks cannot be created (1CWC/B3). A plugin block needs plugin and plugin_app, or a plugin of db_feed_{databaseId} without plugin_app. Content is limited to 1MB.',
    );
  }
  if (method === 'POST' && path === '/copywritingcourse/blocks/{id}') {
    notes.push(
      'The block type cannot be changed (1CWC/B3). PHP blocks cannot be updated. Content is limited to 1MB.',
    );
  }
  if (method === 'GET' && path === '/copywritingcourse/blocks/{id}') {
    notes.push('The response includes content, plugin_config, and used_on_pages.');
  }
  if (method === 'DELETE' && path === '/copywritingcourse/blocks/{id}') {
    notes.push(
      'Returns 409 BLOCK_IN_USE with page IDs unless force=1. force=1 deletes the block record and leaves existing page placements in place; those widgets then render empty.',
    );
  }
  if (path === '/copywritingcourse/theme/{id}' || path === '/copywritingcourse/theme/{id}/variables') {
    notes.push('{id} is a numeric theme ID or default.');
  }
  if (method === 'GET' && path === '/copywritingcourse/theme/{id}/variables') {
    notes.push('Each CSS variable includes default, value, custom, and writable.');
  }
  if (method === 'POST' && path === '/copywritingcourse/theme/{id}') {
    notes.push(
      'Custom CSS is limited to 512KB and must compile. A closing </style tag or <? is rejected (1CWC/T2, 1CWC/T3). An empty css_variables value removes that override. An empty layout value removes that option. Image theme settings are read-only (1CWC/T5).',
    );
  }

  return ` ${notes.join(' ')}`;
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
