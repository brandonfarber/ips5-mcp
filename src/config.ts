const VERSION = '0.0.1';

export type McpTransport = 'stdio' | 'http';

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
