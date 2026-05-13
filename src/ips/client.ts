import { USER_AGENT } from '../config.js';

/**
 * Successful JSON body from `GET /api/core/hello`.
 * @see https://invisioncommunity.com/developers/rest-api
 */
export type IpsCoreHelloResponse = {
  communityName: string;
  communityUrl: string;
  ipsVersion: string;
};

export type IpsRestClientOptions = {
  /** Community root URL (may include subpath), e.g. https://forum.example.com or https://example.com/ips */
  baseUrl: string;
  /** API key from ACP → REST & OAuth (HTTP Basic username, empty password) */
  apiKey: string;
};

export function normalizeCommunityBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export class IpsRestClient {
  constructor(private readonly options: IpsRestClientOptions) {}

  /**
   * Authenticated request to the IPS REST API (`{base}/api/...`).
   * Uses HTTP Basic auth: username = API key, password empty (IPS docs).
   */
  async request(method: string, path: string, init?: RequestInit): Promise<Response> {
    const base = normalizeCommunityBaseUrl(this.options.baseUrl);
    const rel = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}/api${rel}`;
    const token = Buffer.from(`${this.options.apiKey}:`, 'utf8').toString('base64');
    const headers = new Headers(init?.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Basic ${token}`);
    }
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', USER_AGENT);
    }
    return fetch(url, { ...init, method, headers });
  }

  /** `GET /api/core/hello` — connectivity check; returns community metadata. */
  async getCoreHello(): Promise<IpsCoreHelloResponse> {
    const res = await this.request('GET', '/core/hello');
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(formatIpsError(res.status, bodyText));
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText) as unknown;
    } catch {
      throw new Error(`IPS REST ${res.status}: non-JSON body: ${truncate(bodyText)}`);
    }
    return parsed as IpsCoreHelloResponse;
  }
}

function truncate(s: string, max = 500): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function formatIpsError(status: number, bodyText: string): string {
  try {
    const o = JSON.parse(bodyText) as { errorMessage?: string; errorCode?: string };
    if (o.errorMessage) {
      return `IPS REST ${status}: ${o.errorMessage}${o.errorCode ? ` (${o.errorCode})` : ''}`;
    }
  } catch {
    // fall through
  }
  return `IPS REST ${status}: ${truncate(bodyText)}`;
}
