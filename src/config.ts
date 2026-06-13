const VERSION = '0.0.1';

export type McpTransport = 'stdio' | 'http';
export type McpAuthMode = 'token' | 'oauth' | 'both';

const MCP_OAUTH_SCOPES = ['mcp:tools'];

/**
 * MCP server identity (reported during MCP initialization).
 */
export function getServerInfo(): { name: string; version: string } {
  return {
    name: 'ips5-mcp',
    version: VERSION,
  };
}

/** Sent as `User-Agent` on IPS REST requests (IPS docs recommend a fixed agent string). */
export const USER_AGENT = `ips5-mcp/${VERSION}`;

/** `stdio` (default) for local Cursor; `http` for hosted Streamable HTTP deployments. */
export function getMcpTransport(): McpTransport {
  const value = (process.env.MCP_TRANSPORT ?? 'stdio').trim().toLowerCase();
  return value === 'http' ? 'http' : 'stdio';
}

/** HTTP listen port (`PORT` env). Defaults to 8080 locally; use 80 on Bunny Magic Containers. */
export function getHttpPort(): number {
  const parsed = Number.parseInt(process.env.PORT ?? '8080', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8080;
}

/** Bearer token required on `/mcp` when `MCP_TRANSPORT=http`. */
export function getMcpAuthToken(): string | null {
  const token = (process.env.MCP_AUTH_TOKEN ?? '').trim();
  return token.length > 0 ? token : null;
}

/** Comma-separated host allowlist for DNS rebinding protection (e.g. Bunny hostname). */
export function getMcpAllowedHosts(): string[] {
  const raw = (process.env.MCP_ALLOWED_HOSTS ?? '').trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host.length > 0);
}

/** Allowed Host headers for HTTP mode, including localhost for platform health probes. */
export function getHttpAllowedHosts(): string[] {
  const hosts = getMcpAllowedHosts();
  if (hosts.length === 0) {
    return [];
  }
  const merged = [...hosts];
  for (const probeHost of ['127.0.0.1', 'localhost']) {
    if (!merged.includes(probeHost)) {
      merged.push(probeHost);
    }
  }
  return merged;
}

/** Static bearer, OAuth bearer, or both (default `both` for hosted). */
export function getMcpAuthMode(): McpAuthMode {
  const value = (process.env.MCP_AUTH_MODE ?? 'both').trim().toLowerCase();
  if (value === 'token' || value === 'oauth') {
    return value;
  }
  return 'both';
}

export function getMcpOAuthIssuerUrl(): URL {
  const raw = (process.env.MCP_OAUTH_ISSUER_URL ?? '').trim();
  if (!raw) {
    throw new Error('MCP_OAUTH_ISSUER_URL is required when MCP_AUTH_MODE includes oauth');
  }
  return new URL(raw);
}

export function getMcpResourceUrl(): URL {
  const raw = (process.env.MCP_RESOURCE_URL ?? '').trim();
  if (raw) {
    return new URL(raw);
  }
  return new URL('/mcp', getMcpOAuthIssuerUrl());
}

export function getIps5BaseUrl(): string | null {
  const baseUrl = (process.env.IPS5_BASE_URL ?? '').trim();
  return baseUrl.length > 0 ? baseUrl : null;
}

export function getIpsOAuthClientId(): string | null {
  const id = (process.env.IPS_OAUTH_CLIENT_ID ?? '').trim();
  return id.length > 0 ? id : null;
}

export function getIpsOAuthClientSecret(): string | null {
  const secret = (process.env.IPS_OAUTH_CLIENT_SECRET ?? '').trim();
  return secret.length > 0 ? secret : null;
}

export function getIpsOAuthScopes(): string[] {
  const raw = (process.env.IPS_OAUTH_SCOPES ?? '').trim();
  if (!raw) {
    return ['profile'];
  }
  return raw.split(/\s+/).filter((s) => s.length > 0);
}

export function parseCommaSeparatedIds(raw: string | undefined): number[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

export function getMcpAdminGroupIds(): number[] {
  return parseCommaSeparatedIds(process.env.MCP_ADMIN_GROUP_IDS);
}

export function getMcpAllowedMemberIds(): number[] {
  return parseCommaSeparatedIds(process.env.MCP_ALLOWED_MEMBER_IDS);
}

export function getMcpOAuthScopes(): string[] {
  return MCP_OAUTH_SCOPES;
}

export function isOAuthConfigured(): boolean {
  return getOAuthConfigStatus().configured;
}

/** Per-field OAuth env diagnostics (safe for /health — never exposes secret values). */
export function getOAuthConfigStatus(): {
  configured: boolean;
  checks: {
    mcp_oauth_issuer_url: boolean;
    ips5_base_url: boolean;
    ips_oauth_client_id: boolean;
    ips_oauth_client_secret: boolean;
    mcp_admin_group_ids: boolean;
  };
} {
  const checks = {
    mcp_oauth_issuer_url: Boolean((process.env.MCP_OAUTH_ISSUER_URL ?? '').trim()),
    ips5_base_url: Boolean(getIps5BaseUrl()),
    ips_oauth_client_id: Boolean(getIpsOAuthClientId()),
    ips_oauth_client_secret: Boolean(getIpsOAuthClientSecret()),
    mcp_admin_group_ids: getMcpAdminGroupIds().length > 0,
  };
  const configured = Object.values(checks).every(Boolean);
  return { configured, checks };
}

export function validateHttpAuthConfig(): void {
  const mode = getMcpAuthMode();
  const hasToken = Boolean(getMcpAuthToken());
  const hasOAuth = isOAuthConfigured();

  if (mode === 'token' && !hasToken) {
    throw new Error('MCP_AUTH_TOKEN is required when MCP_AUTH_MODE=token');
  }
  if (mode === 'oauth' && !hasOAuth) {
    throw new Error(
      'OAuth is not configured: set MCP_OAUTH_ISSUER_URL, IPS_OAUTH_CLIENT_ID, IPS_OAUTH_CLIENT_SECRET, MCP_ADMIN_GROUP_IDS, and IPS5_BASE_URL',
    );
  }
  if (mode === 'both' && !hasToken && !hasOAuth) {
    throw new Error('Configure MCP_AUTH_TOKEN and/or OAuth settings for MCP_AUTH_MODE=both');
  }
}
