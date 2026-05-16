# AGENTS.md — ips5-mcp

Guidance for AI agents working in this repository or using the **ips5-mcp** MCP server against an Invision Community 5 site.

## MCP server (any client)

On connect, the server sends **`instructions`** from [`docs/mcp-instructions.md`](docs/mcp-instructions.md).

Agents should also use:

| Capability | Purpose |
|------------|---------|
| **`ips_read_agent_guide`** tool | Returns site glossary + recipes |
| **Resource** `ips5://docs/agent-guide` | Same content as markdown resource |
| **`ips_list_endpoints`** | Find `ips_*` tools by app/search |
| **`ips_api_call`** | Escape hatch for arbitrary REST paths |

## Files you (maintainer) should edit

These files are **not** generated. Customize them for your community:

| File | What to add |
|------|-------------|
| **[`docs/agent-guide.md`](docs/agent-guide.md)** | **Primary.** Glossary (wins, packages, forums), forum ID table, commerce products, recipes |
| [`docs/recipes.md`](docs/recipes.md) | Optional extra/long examples |
| [`docs/mcp-instructions.md`](docs/mcp-instructions.md) | Short global MCP behavior (usually fine as-is; link to agent-guide) |
| [`.env`](.env) | `IPS5_BASE_URL`, `IPS5_API_KEY` (never commit) |

After editing docs, **restart the MCP server** (rebuild if you changed TypeScript: `npm run build`).

## Suggested workflow for agents

1. User asks in natural language (“recent wins on the forums”).
2. Call **`ips_read_agent_guide`** — map terms using the glossary.
3. Call **`ips_list_endpoints`** with `app` / `search` if needed.
4. Call the specific **`ips_get_*`** / **`ips_post_*`** tool with `query` / path params.
5. Paginate with `page` and `perPage` when lists are truncated.

## Development in this repo

- **Build:** `npm run build`
- **Test:** `npm test`
- **Regenerate API catalog:** `npm run extract-endpoints` (requires `invision5` source tree)
- **Cursor MCP config:** [`.cursor/mcp.json`](.cursor/mcp.json)

## API key permissions

Each REST route must be enabled on the API key in ACP. `@apimemberonly` endpoints require OAuth, not API key.

## Issue log

See [ISSUES.md](ISSUES.md).
