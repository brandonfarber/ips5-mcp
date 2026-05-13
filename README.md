# ips5-mcp

Stub [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for **Invision Community 5** via its [REST API](https://invisioncommunity.com/developers/). This repository is scaffolded for a future layer of MCP tools that call your community endpoints.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
cp .env.example .env
# Set IPS5_BASE_URL (community root, with optional subpath) and IPS5_API_KEY.
```

Environment variables are read when the process starts (`dotenv` loads `.env` from the project directory). **After you create or change `.env`, restart the MCP server** (stop and run `npm start` again, or reload the MCP entry in Cursor). If you inject `IPS5_*` in your MCP client `env` block instead, you do not need a `.env` file; still restart after changing those values.

## Scripts

| Script   | Description                                      |
| -------- | ------------------------------------------------ |
| `npm run build` | Compile TypeScript to `dist/`               |
| `npm start`     | Run compiled server (stdio MCP transport) |
| `npm run dev`   | Run from `src/` with `tsx` watch            |
| `npm test`      | Jest unit tests                             |

## MCP client configuration (Cursor)

This repo includes **`.cursor/mcp.json`**, which Cursor loads automatically for this workspace (merged with your user `~/.cursor/mcp.json` if you have one). After `npm run build`, open **Settings → Tools & MCP** and ensure **ips5-mcp** is enabled.

Secrets stay in **`.env`** (gitignored); the MCP entry uses `envFile` so you do not paste keys into `mcp.json`.

To configure manually or for another client, use the same shape:

```json
{
  "mcpServers": {
    "ips5-mcp": {
      "command": "node",
      "args": ["c:/wamp/www/ips5-mcp/dist/index.js"],
      "env": {
        "IPS5_BASE_URL": "https://your-community.example.com",
        "IPS5_API_KEY": "your-api-key"
      }
    }
  }
}
```

Adjust the path for your machine. Ensure the API key is allowed to access **GET /core/hello** in ACP → REST & OAuth → API Keys.

### Tool: `core_hello`

Calls `GET /api/core/hello` and returns JSON (`communityName`, `communityUrl`, `ipsVersion`).

## Layout

- `src/index.ts` — process entry (`bin` target)
- `src/server.ts` — MCP stdio server and tool registration
- `src/env.ts` — reads `IPS5_*` from `process.env`
- `src/config.ts` — server name/version and REST `User-Agent`
- `src/ips/client.ts` — IPS REST client (`getCoreHello`, generic `request`)

## Issue log

See [ISSUES.md](./ISSUES.md).
