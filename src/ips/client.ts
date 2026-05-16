import { USER_AGENT } from '../config.js';
import { buildQueryString, encodeFormBody, resolveApiPath } from './path.js';
import type { IpsEndpoint } from './catalog.js';

export type IpsCoreHelloResponse = {
  communityName: string;
  communityUrl: string;
  ipsVersion: string;
  ipsApplications?: Record<string, string>;
};

export type IpsRestClientOptions = {
  baseUrl: string;
  apiKey: string;
};

export type IpsCallOptions = {
  method: string;
  /** REST path under /api, e.g. /core/members or /core/members/123 */
  path: string;
  pathParams?: Record<string, string | number>;
  query?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
};

export function normalizeCommunityBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export class IpsRestClient {
  constructor(private readonly options: IpsRestClientOptions) {}

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

  async requestJson<T = unknown>(options: IpsCallOptions): Promise<T> {
    const pathParams = options.pathParams ?? {};
    const resolvedPath =
      Object.keys(pathParams).length > 0
        ? resolveApiPath(options.path, pathParams)
        : options.path;
    const query = options.query ?? {};
    const queryString = buildQueryString(query);
    const urlPath = `${resolvedPath}${queryString}`;

    const method = options.method.toUpperCase();
    let init: RequestInit | undefined;

    if (method === 'POST' || method === 'PUT') {
      const body = options.body ?? {};
      init = {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFormBody(body),
      };
    } else if (method === 'DELETE' && options.body && Object.keys(options.body).length > 0) {
      init = {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFormBody(options.body),
      };
    }

    const res = await this.request(method, urlPath, init);
    const bodyText = await res.text();

    if (!res.ok) {
      throw new Error(formatIpsError(res.status, bodyText));
    }

    if (!bodyText) {
      return {} as T;
    }

    try {
      return JSON.parse(bodyText) as T;
    } catch {
      throw new Error(`IPS REST ${res.status}: non-JSON body: ${truncate(bodyText)}`);
    }
  }

  /** Call a catalogued endpoint definition. */
  async callEndpoint(
    endpoint: IpsEndpoint,
    args: {
      pathParams?: Record<string, string | number>;
      query?: Record<string, string | number | boolean>;
      body?: Record<string, unknown>;
    },
  ): Promise<unknown> {
    const pathParams: Record<string, string | number> = { ...(args.pathParams ?? {}) };
    for (const key of endpoint.pathParams) {
      if (pathParams[key] === undefined) {
        throw new Error(`Missing required path parameter: ${key}`);
      }
    }
    return this.requestJson({
      method: endpoint.method,
      path: endpoint.path,
      pathParams,
      query: args.query,
      body: args.body,
    });
  }

  async getCoreHello(): Promise<IpsCoreHelloResponse> {
    return this.requestJson<IpsCoreHelloResponse>({
      method: 'GET',
      path: '/core/hello',
    });
  }
}

function truncate(s: string, max = 500): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

export function formatIpsError(status: number, bodyText: string): string {
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
