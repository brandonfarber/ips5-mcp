# ips5-mcp

[MCP](https://modelcontextprotocol.io/) server for **Invision Community 5** [REST API](https://invisioncommunity.com/__old/buy/developers/rest-api/index/). Exposes **229 endpoint-specific tools** (from the `invision5` codebase) plus discovery and generic call helpers.

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

## MCP tools

| Tool | Purpose |
| ---- | ------- |
| `core_hello` | Backward-compatible alias for GET `/core/hello` |
| `ips_get_core_hello` | Same as above (catalog name) |
| `ips_list_endpoints` | Search/filter the endpoint catalog |
| `ips_api_call` | Arbitrary REST call (`method`, `path`, `query`, `body`) |
| `ips_{method}_{app}_...` | One tool per documented endpoint (229 total) |

Example tool names: `ips_get_forums_topics`, `ips_post_core_members`, `ips_delete_blog_comments_id`.

Path parameters are tool arguments (e.g. `id` for `/forums/topics/{id}`). Optional `query` and `body` objects map to query string and form body (IPS uses `application/x-www-form-urlencoded` for POST/PUT).

## Cursor configuration

Project config: **`.cursor/mcp.json`** (stdio + `envFile` → `.env`). Enable **ips5-mcp** under Settings → Tools & MCP, then reload after `npm run build`.

## Layout

```
src/
  index.ts, server.ts, config.ts, env.ts
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
