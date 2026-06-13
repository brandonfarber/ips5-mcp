# OAuth for ChatGPT MCP (IPS-backed, admin-only)

ChatGPT and other MCP clients that require [OAuth 2.1](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization.md) can connect to **ips5-mcp** while **Cursor** continues to use the static `MCP_AUTH_TOKEN`.

## How it works

1. **ips5-mcp** is the MCP authorization server (DCR, `/authorize`, `/token`) and resource server (`/mcp`).
2. Member login is **brokered through IPS OAuth** — admins already have accounts on your community.
3. After IPS login, the server calls `GET /api/core/me` and checks `primaryGroup.id` against `MCP_ADMIN_GROUP_IDS`.
4. **IPS REST calls still use `IPS5_API_KEY`** — OAuth only gates who may use MCP, not per-user API delegation.

See the architecture diagram in the implementation plan for the full redirect chain.

## Prerequisites (IPS ACP)

### 1. Gateway OAuth client

ACP → **System → REST & OAuth → OAuth Clients** → create a **Confidential** client (e.g. `ips5-mcp-gateway`):

| Setting | Value |
|---------|--------|
| Grant type | `authorization_code` |
| PKCE | **S256** (required) |
| Redirect URI | `https://mcp.yourdomain.com/oauth/ips/callback` |
| REST scopes | At least permission for **`GET /core/me`** |

Save the **client ID** and **client secret** for Bunny secrets (`IPS_OAUTH_CLIENT_ID`, `IPS_OAUTH_CLIENT_SECRET`).

### 2. Administrator group ID(s)

ACP → **Members → Groups** → open your administrator group → note the **group ID** from the URL or group settings.

Set `MCP_ADMIN_GROUP_IDS` to that ID (comma-separated for multiple groups).

Optional: `MCP_ALLOWED_MEMBER_IDS` — explicit member ID allowlist that overrides the group check when set.

### 3. REST API key (unchanged)

`IPS5_API_KEY` remains the shared key for all MCP tool calls after OAuth succeeds.

## Bunny secrets

Add alongside existing hosted vars (see [hosted-deployment.md](hosted-deployment.md)):

| Variable | Example |
|----------|---------|
| `MCP_AUTH_MODE` | `both` (Cursor token + ChatGPT OAuth) |
| `MCP_OAUTH_ISSUER_URL` | `https://mcp.kopywriting.com` |
| `MCP_RESOURCE_URL` | `https://mcp.kopywriting.com/mcp` |
| `IPS_OAUTH_CLIENT_ID` | From ACP gateway client |
| `IPS_OAUTH_CLIENT_SECRET` | From ACP gateway client |
| `IPS_OAUTH_SCOPES` | `profile` (or scopes covering `/core/me`) |
| `MCP_ADMIN_GROUP_IDS` | `4` |
| `MCP_AUTH_TOKEN` | Keep for Cursor |
| `MCP_OAUTH_STORE_PATH` | Optional file path for OAuth state persistence |

### Multi-pod / autoscaling

OAuth state (pending authorizations, DCR clients, access tokens) defaults to **in-memory**. With Bunny autoscaling **max > 1**, pods do not share state and OAuth flows can fail mid-redirect.

**v1 options:**

- Set autoscaling **min=1 max=1** until shared storage is configured.
- Set `MCP_OAUTH_STORE_PATH` to a path on a **persistent volume** (file-backed store writes JSON on each change).

A shared database backend is a follow-up for higher scale.

## ChatGPT connector setup

1. Deploy with OAuth env vars and confirm metadata:
   ```bash
   curl https://mcp.yourdomain.com/.well-known/oauth-protected-resource/mcp
   curl https://mcp.yourdomain.com/.well-known/oauth-authorization-server
   ```
2. In ChatGPT → **Settings → Connectors** (or Apps SDK flow), add MCP server URL:
   ```text
   https://mcp.yourdomain.com/mcp
   ```
3. OAuth discovery should resolve automatically. If ChatGPT reports “Failed to resolve OAuth client”, verify both well-known URLs above return JSON.
4. Complete login at IPS. Only members in `MCP_ADMIN_GROUP_IDS` receive an MCP access token; others get `access_denied`.

## Cursor (unchanged)

Keep static bearer in `~/.cursor/mcp.json` when `MCP_AUTH_MODE` is `token` or `both`:

```json
{
  "mcpServers": {
    "ip-remote": {
      "url": "https://mcp.yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer ${env:IPS5_MCP_TOKEN}"
      }
    }
  }
}
```

## Auth mode reference

| `MCP_AUTH_MODE` | Cursor (`MCP_AUTH_TOKEN`) | ChatGPT OAuth |
|-----------------|---------------------------|---------------|
| `token` | Yes | No |
| `oauth` | No | Yes |
| `both` | Yes | Yes |

## Endpoints added

| Path | Purpose |
|------|---------|
| `/.well-known/oauth-protected-resource/mcp` | RFC 9728 protected resource metadata |
| `/.well-known/oauth-authorization-server` | RFC 8414 authorization server metadata |
| `/authorize` | Start ChatGPT OAuth flow |
| `/token` | Issue MCP access tokens |
| `/register` | Dynamic client registration (DCR) |
| `/oauth/ips/callback` | IPS OAuth callback (gateway client) |

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `access_denied` after IPS login | Member’s `primaryGroup.id` not in `MCP_ADMIN_GROUP_IDS` |
| OAuth works once, fails on retry | Multiple pods without shared `MCP_OAUTH_STORE_PATH` |
| IPS callback error | Gateway redirect URI must match exactly; PKCE S256 enabled |
| `IPS /core/me failed` | Gateway client REST scopes include `/core/me` |
| Cursor 401 with `both` mode | `MCP_AUTH_TOKEN` must still be set and match client header |
