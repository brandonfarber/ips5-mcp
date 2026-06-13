# Hosted deployment (Bunny Magic Containers)

Run **ips5-mcp** as a remote Streamable HTTP MCP server for your team. Each IPS community runs its own container with its own secrets—this guide covers **one site, one container**.

Other communities should fork the repo and deploy separately with their own env vars and `docs/agent-guide.md`.

## Prerequisites

- Bunny.net account with Magic Containers enabled
- Container registry (GitHub Container Registry recommended)
- IPS5 REST API key with required endpoint permissions
- Cursor v0.48+ for Streamable HTTP MCP clients

## Publish the image to GHCR

Your image URL will be:

```text
ghcr.io/<GITHUB_OWNER>/<REPO_NAME>:<tag>
```

Example: if the repo is `https://github.com/myorg/ips5-mcp`, the image is `ghcr.io/myorg/ips5-mcp:latest`.

GitHub lowercases the owner name in the registry path (`MyOrg` → `myorg`).

### Option A — GitHub Actions (recommended)

Automatic push on every push to `main` via [`.github/workflows/deploy-magic-container.yml`](../../.github/workflows/deploy-magic-container.yml).

1. **Push this repo to GitHub** (if it is not already there).
2. **Enable Actions** — repo **Settings → Actions → General** → allow actions.
3. **Enable GHCR for the repo** — first workflow run creates the package under your account/org **Packages**.
4. **Push to `main`** — Actions tab should show **Build and Push Docker Image** succeeding.
5. **Open the package** — GitHub profile or org → **Packages** → `ips5-mcp` (or your repo name).
6. **Set package visibility:**
   - **Public** — Bunny can pull without registry credentials (easiest).
   - **Private** — add GHCR credentials in Bunny when adding the container (see below).

Optional auto-deploy to Bunny after each push:

| Setting | Where | Value |
|---------|--------|--------|
| `BUNNY_APP_ID` | Repo **Settings → Secrets and variables → Actions → Variables** | Magic Containers app ID |
| `BUNNYNET_API_KEY` | **Secrets** | Bunny API key |
| Container name | Workflow file | Must match Bunny container name (`ips5-mcp`) |

If `BUNNY_APP_ID` is empty, CI still pushes to GHCR but skips the Bunny update step.

### Option B — Manual push from your machine

Use this for a first publish before CI exists, or to push from a branch.

**1. Install Docker Desktop** (or Docker Engine) and ensure `docker` runs.

**2. Create a GitHub Personal Access Token**

- GitHub → **Settings → Developer settings → Personal access tokens**
- **Fine-grained** or **Classic** token with:
  - `write:packages` (push images)
  - `read:packages` (pull, if you test locally)
  - `repo` (if the repository is private)

**3. Log in to GHCR**

PowerShell:

```powershell
$env:CR_PAT = "your_token_here"
$env:CR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username (not email).

**4. Build for Bunny (`linux/amd64`)**

From the repo root:

```powershell
docker build --platform linux/amd64 -t ghcr.io/YOUR_GITHUB_USERNAME/ips5-mcp:latest .
```

Use your **org name** instead of username if the repo lives under an organization.

**5. Push**

```powershell
docker push ghcr.io/YOUR_GITHUB_USERNAME/ips5-mcp:latest
```

Optional: tag a specific version:

```powershell
docker tag ghcr.io/YOUR_GITHUB_USERNAME/ips5-mcp:latest ghcr.io/YOUR_GITHUB_USERNAME/ips5-mcp:v0.0.1
docker push ghcr.io/YOUR_GITHUB_USERNAME/ips5-mcp:v0.0.1
```

**6. Link package to the repository (first time only)**

Package page → **Package settings** → **Connect repository** → select `ips5-mcp`.

**7. Make the package public (if Bunny should pull without credentials)**

Package → **Package settings** → **Change visibility** → **Public**.

### Bunny: use the GHCR image

In **Magic Containers → Add container**:

| Field | Value |
|-------|--------|
| Registry | GitHub Container Registry |
| Image | `YOUR_GITHUB_USERNAME/ips5-mcp` (no `ghcr.io` prefix) |
| Tag | `latest` (manual push) or commit SHA from Actions |

**Private package:** when adding the container, supply registry credentials:

- Username: your GitHub username
- Password: PAT with `read:packages`

Then continue with endpoint port **80** and secrets from the table below.

---

## Build the Docker image (local only)

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
3. **Add endpoint** — container port **80** (matches `PORT` in the image). For CDN endpoints, disable **SSL for origin** (the container speaks HTTP on port 80; Bunny terminates TLS at the edge).
4. **Secrets** (never commit these):

   | Variable | Example |
   |----------|---------|
   | `IPS5_BASE_URL` | `https://community.example.com` |
   | `IPS5_API_KEY` | ACP REST key |
   | `MCP_AUTH_TOKEN` | Long random string (team MCP access) |
   | `MCP_TRANSPORT` | `http` |
   | `MCP_ALLOWED_HOSTS` | `mc-xxx.b-cdn.net` (see below) |
   | `MCP_AUTH_MODE` | `both` (Cursor token + ChatGPT OAuth) |
   | `MCP_OAUTH_ISSUER_URL` | `https://mcp.yourdomain.com` |
   | `MCP_RESOURCE_URL` | `https://mcp.yourdomain.com/mcp` |
   | `IPS_OAUTH_CLIENT_ID` | IPS gateway OAuth client (see [oauth-chatgpt.md](oauth-chatgpt.md)) |
   | `IPS_OAUTH_CLIENT_SECRET` | Gateway client secret |
   | `MCP_ADMIN_GROUP_IDS` | Administrator group ID(s), comma-separated |
   | `MCP_OAUTH_STORE_PATH` | Optional file path for OAuth persistence |

   Full OAuth setup: **[docs/oauth-chatgpt.md](oauth-chatgpt.md)**.

5. Optional: custom hostname + Bunny SSL on the endpoint.

### Public URL: `b-cdn.net` vs `bunny.run`

CDN endpoints create a **pull zone**. The HTTPS URL clients should use is usually:

```text
https://mc-<id>.b-cdn.net
```

not `https://mc-<id>.bunny.run`. The `bunny.run` hostname may not terminate TLS correctly (`ERR_SSL_PROTOCOL_ERROR` in browsers); the pull zone hostname on `b-cdn.net` is the reliable public URL.

After deploy, confirm in the Bunny dashboard (Endpoints or linked pull zone) and test:

```bash
curl https://mc-<id>.b-cdn.net/health
```

Set `MCP_ALLOWED_HOSTS` to that **exact** hostname (e.g. `mc-tf903nfnan.b-cdn.net`). Add a custom domain later as a comma-separated second entry if needed.

**Outbound:** The container must reach `IPS5_BASE_URL` over HTTPS. Allow Bunny egress IPs if your IPS install restricts REST API access.

## Cursor client configuration

Keep local stdio in project `.cursor/mcp.json` for development. For the hosted server, add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ip-remote": {
      "url": "https://mc-xxx.b-cdn.net/mcp",
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

- **MCP_AUTH_TOKEN** — who can call your MCP endpoint (Cursor static bearer).
- **OAuth** — ChatGPT and similar clients; gated by IPS login + `MCP_ADMIN_GROUP_IDS`. See [oauth-chatgpt.md](oauth-chatgpt.md).
- **IPS5_API_KEY** — what the server can do on the forum (scope in ACP).
- Rotate tokens independently.
- TLS terminates at Bunny; the container listens on HTTP internally.

**Multi-pod:** OAuth state is in-memory by default. Use autoscaling max=1 or `MCP_OAUTH_STORE_PATH` on a persistent volume before scaling out.

If clients struggle with 200+ tools, use `ips_list_endpoints` and `ips_api_call` instead of loading every tool.
