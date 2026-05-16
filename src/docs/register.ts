import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { loadAgentGuide } from './loader.js';
import { jsonResult } from '../tools/results.js';

const AGENT_GUIDE_URI = 'ips5://docs/agent-guide';

/**
 * Exposes maintainer documentation to MCP clients (resource + tool).
 */
export function registerDocumentation(server: McpServer): void {
  server.registerResource(
    'agent_guide',
    AGENT_GUIDE_URI,
    {
      description:
        'Site-specific glossary and recipes for using ips5-mcp (edit docs/agent-guide.md in the repo).',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: AGENT_GUIDE_URI,
          mimeType: 'text/markdown',
          text: loadAgentGuide(),
        },
      ],
    }),
  );

  server.registerTool(
    'ips_read_agent_guide',
    {
      description:
        'Returns the site-specific agent guide (glossary, forum map, recipes). Read this when the user uses internal terms (e.g. "wins", package names) or before guessing which ips_* tool to call.',
    },
    async () => jsonResult({ markdown: loadAgentGuide(), resourceUri: AGENT_GUIDE_URI }),
  );
}
