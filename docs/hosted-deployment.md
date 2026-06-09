# Hosted deployment (Bunny Magic Containers)

Run **ips5-mcp** as a remote Streamable HTTP MCP server for your team. Each IPS community runs its own container with its own secrets—this guide covers **one site, one container**.

Other communities should fork the repo and deploy separately with their own env vars and `docs/agent-guide.md`.

## Prerequisites

- Bunny.net account with Magic Containers enabled
- Container registry (GitHub Container Registry recommended)
- IPS5 REST API key with required endpoint permissions
- Cursor v0.48+ for Streamable HTTP MCP clients

## Build the Docker image

Magic Containers requires **`linux/amd64`** images:

```bash
docker build --platform linux/amd64 -t ghcr.io/YOUR_ORG/ips5-mcp:latest .
```

Local HTTP smoke test:

```bash
cp .env.example .env
# Set IPS5_BASE_URL, IPS5_API_KEY, MCP_AUTH_TOKEN, MCP_TRANSPORT=http
docker compose up --build
curl http://localhost:8080/health
```

## Bunny dashboard setup

1. **Magic Containers** → Add app → select your registry image.
2. **Add container** — image tag `latest` or commit SHA from CI.
3. **Add endpoint** — container port **80** (matches `PORT` in the image).
4. **Secrets** (never commit these):

   | Variable | Example |
   |----------|---------|
   | `IPS5_BASE_URL` | `https://community.example.com` |
   | `IPS5_API_KEY` | ACP REST key |
   | `MCP_AUTH_TOKEN` | Long random string (team MCP access) |
   | `MCP_TRANSPORT` | `http` |
   | `MCP_ALLOWED_HOSTS` | `mc-xxx.bunny.run` (your Bunny hostname) |

5. Optional: custom hostname + Bunny SSL on the endpoint.

**Outbound:** The container must reach `IPS5_BASE_URL` over HTTPS. Allow Bunny egress IPs if your IPS install restricts REST API access.

## Cursor client configuration

Keep local stdio in project `.cursor/mcp.json` for development. For the hosted server, add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ip-remote": {
      "url": "https://mc-xxx.bunny.run/mcp",
      "headers": {
        "Authorization": "Bearer ${env:IPS5_MCP_TOKEN}"
      }
    }
  }
}
```

Set `IPS5_MCP_TOKEN` in your user environment (same value as `MCP_AUTH_TOKEN` on the server). Remote MCP entries do not support `envFile`.

Use a short server key (e.g. `ip-remote`) to stay within Cursor’s combined server+tool name limits.

## CI/CD

See `.github/workflows/deploy-magic-container.yml`. Configure optional Bunny auto-deploy:

- Repository variable `BUNNY_APP_ID`
- Secret `BUNNYNET_API_KEY`
- Container name in the workflow matches your Bunny app (`ips5-mcp`)

## Self-hosting (other IPS sites)

1. Fork or clone this repository.
2. Customize `docs/agent-guide.md` for your community.
3. Build with `--platform linux/amd64`.
4. Deploy to Bunny (or any Docker host) with **your** `IPS5_BASE_URL` and `IPS5_API_KEY`.
5. Do not share containers or API keys across communities.

## Security notes

- **MCP_AUTH_TOKEN** — who can call your MCP endpoint.
- **IPS5_API_KEY** — what the server can do on the forum (scope in ACP).
- Rotate tokens independently.
- TLS terminates at Bunny; the container listens on HTTP internally.

If clients struggle with 200+ tools, use `ips_list_endpoints` and `ips_api_call` instead of loading every tool.
