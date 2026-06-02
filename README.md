# ips5-mcp

[MCP](https://modelcontextprotocol.io/) server for **Invision Community 5** [REST API](https://invisioncommunity.com/__old/buy/developers/rest-api/index/). Exposes **234 endpoint-specific tools** (from the `invision5` codebase) plus discovery and generic call helpers.

## Prerequisites

- Node.js 18+
- npm
- IPS5 community with REST API key (ACP → System → REST & OAuth)

## Setup

```bash
npm install
cp .env.example .env
# Set IPS5_BASE_URL (community root, optional subpath) and IPS5_API_KEY
npm run build
```

Environment variables load at process start via `dotenv` (`.env` in project root) or Cursor `envFile` in `.cursor/mcp.json`. **Restart the MCP server after changing `.env`.**

### Regenerate endpoint catalog

When IPS adds or changes API controllers, re-scan `invision5`:

```bash
npm run extract-endpoints
# or: node scripts/extract-endpoints.mjs c:/wamp/www/invision5
npm run build
```

This updates `src/ips/endpoints.json` from `applications/*/api/*.php` docblocks.

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run MCP server (stdio) |
| `npm run dev` | Watch `src/` with tsx |
| `npm test` | Jest tests |
| `npm run extract-endpoints` | Regenerate `endpoints.json` from invision5 |

## Agent documentation

Teach AI clients your community’s language (forum names, “wins”, packages, etc.):

| File | Who edits it |
|------|----------------|
| **[`docs/agent-guide.md`](docs/agent-guide.md)** | **You** — glossary, forum map, recipes (`<!-- TODO -->` sections) |
| [`docs/recipes.md`](docs/recipes.md) | Optional extra examples |
| [`docs/mcp-instructions.md`](docs/mcp-instructions.md) | Short MCP-wide instructions (usually leave as-is) |
| [`AGENTS.md`](AGENTS.md) | Index for agents working in this repo |

Exposed to MCP clients as:

- Server **`instructions`** (from `docs/mcp-instructions.md`)
- Tool **`ips_read_agent_guide`**
- Resource **`ips5://docs/agent-guide`**

Restart MCP after editing docs.

## MCP tools

| Tool | Purpose |
| ---- | ------- |
| `ips_read_agent_guide` | Site glossary + recipes (`docs/agent-guide.md`) |
| `core_hello` | Backward-compatible alias for GET `/core/hello` |
| `g_core_hello` | Same as above (catalog name) |
| `ips_list_endpoints` | Search/filter the endpoint catalog |
| `ips_api_call` | Arbitrary REST call (`method`, `path`, `query`, `body`) |
| `g_` / `p_` / `u_` / `d_` + path | One tool per documented endpoint (234 total) |

Tool names are kept short for **Cursor’s 60-character combined server+tool limit**: use a short MCP server key in `.cursor/mcp.json` (e.g. `"ip"`), single-letter HTTP prefixes (`g_` GET, `p_` POST, `u_` PUT, `d_` DELETE), segment abbreviations, and duplicate collapse. Logic: `src/ips/tool-name.ts`; run `npm run refresh-tool-names` after edits.

Example tool names: `g_forums_topics`, `p_core_members`, `d_blog_cmt_id`, `p_cwc_pages`.

Path parameters are tool arguments (e.g. `id` for `/forums/topics/{id}`). Optional `query` and `body` objects map to query string and form body (IPS uses `application/x-www-form-urlencoded` for POST/PUT).

## Cursor configuration

Project config: **`.cursor/mcp.json`** (stdio + `envFile` → `.env`). Enable **ips5-mcp** under Settings → Tools & MCP, then reload after `npm run build`.

## Layout

```
docs/
  agent-guide.md      # site glossary + recipes (maintainer-edited)
  mcp-instructions.md # MCP server instructions
  recipes.md          # optional extra recipes
src/
  index.ts, server.ts, config.ts, env.ts
  docs/               # loads docs/*.md at runtime
  ips/
    client.ts       # HTTP client (Basic auth, form bodies)
    catalog.ts      # loads endpoints.json
    path.ts         # path/query helpers
    endpoints.json  # generated catalog
  tools/
    factory.ts      # per-endpoint tool registration
    register.ts     # meta tools + register all endpoints
scripts/
  extract-endpoints.mjs
```

## Issue log

See [ISSUES.md](./ISSUES.md).
