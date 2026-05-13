const VERSION = '0.0.1';

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
