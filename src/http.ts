import { randomUUID } from 'node:crypto';
import express from 'express';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthRouter,
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';

import {
  getHttpAllowedHosts,
  getHttpPort,
  getMcpAuthMode,
  getMcpAuthToken,
  getMcpOAuthIssuerUrl,
  getMcpOAuthScopes,
  getMcpResourceUrl,
  getOAuthConfigStatus,
  isOAuthConfigured,
  validateHttpAuthConfig,
} from './config.js';
import { IpsOAuthBrokerProvider } from './oauth/ipsBrokerProvider.js';
import { createOAuthStore } from './oauth/store.js';
import { createIpsMcpServer } from './server.js';

const oauthStore = createOAuthStore();
let oauthProvider: IpsOAuthBrokerProvider | null = null;

function staticBearerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expected = getMcpAuthToken();
  if (!expected) {
    res.status(503).json({ error: 'MCP_AUTH_TOKEN is not configured' });
    return;
  }

  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || match[1] !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

function buildDualAuthMiddleware(oauthMiddleware: RequestHandler): RequestHandler {
  return (req, res, next) => {
    const mode = getMcpAuthMode();

    if (mode === 'token' || mode === 'both') {
      const expected = getMcpAuthToken();
      const header = req.headers.authorization ?? '';
      const match = /^Bearer\s+(.+)$/i.exec(header);
      if (expected && match && match[1] === expected) {
        next();
        return;
      }
      if (mode === 'token') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }

    if (mode === 'oauth' || mode === 'both') {
      oauthMiddleware(req, res, next);
      return;
    }

    res.status(401).json({ error: 'Unauthorized' });
  };
}

const transports: Record<string, StreamableHTTPServerTransport> = {};

async function handleStatelessMcpRequest(req: Request, res: Response): Promise<void> {
  const server = createIpsMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    const body = req.method === 'POST' ? req.body : undefined;
    await transport.handleRequest(req, res, body);
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
}

async function mcpPostHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport!;
        },
      });
      transport.onclose = () => {
        const sid = transport?.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
        }
      };
      const server = createIpsMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP POST:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
}

async function mcpGetHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
}

async function mcpDeleteHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
}

function registerMcpRoutes(app: Express, authMiddleware?: RequestHandler): void {
  const useStateful = getMcpAuthMode() !== 'token';

  if (!useStateful) {
    const handler = (req: Request, res: Response) => void handleStatelessMcpRequest(req, res);
    if (authMiddleware) {
      app.all('/mcp', authMiddleware, handler);
    } else {
      app.all('/mcp', handler);
    }
    return;
  }

  if (authMiddleware) {
    app.post('/mcp', authMiddleware, (req, res) => void mcpPostHandler(req, res));
    app.get('/mcp', authMiddleware, (req, res) => void mcpGetHandler(req, res));
    app.delete('/mcp', authMiddleware, (req, res) => void mcpDeleteHandler(req, res));
  } else {
    app.post('/mcp', (req, res) => void mcpPostHandler(req, res));
    app.get('/mcp', (req, res) => void mcpGetHandler(req, res));
    app.delete('/mcp', (req, res) => void mcpDeleteHandler(req, res));
  }
}

function setupOAuth(app: Express): RequestHandler | undefined {
  if (!isOAuthConfigured()) {
    return undefined;
  }

  const issuerUrl = getMcpOAuthIssuerUrl();
  const resourceUrl = getMcpResourceUrl();
  oauthProvider = new IpsOAuthBrokerProvider({ store: oauthStore });

  app.use(
    mcpAuthRouter({
      provider: oauthProvider,
      issuerUrl,
      resourceServerUrl: resourceUrl,
      scopesSupported: getMcpOAuthScopes(),
      resourceName: 'ips5-mcp',
    }),
  );

  app.get('/oauth/ips/callback', (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      res.status(400).send('Missing code or state from IPS');
      return;
    }
    void oauthProvider!.handleIpsCallback(code, state, res);
  });

  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(resourceUrl);

  return requireBearerAuth({
    verifier: oauthProvider,
    requiredScopes: [],
    resourceMetadataUrl,
  });
}

/**
 * Express app for hosted Streamable HTTP MCP (`/health`, `/mcp`, OAuth).
 */
export function createHttpApp(): Express {
  const rootApp = express();

  // Platform health probes often omit Host or use 127.0.0.1 — register before host validation.
  rootApp.get('/health', (_req, res) => {
    const oauth = getOAuthConfigStatus();
    res.set('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      auth: getMcpAuthMode(),
      oauth_configured: oauth.configured,
      oauth_checks: oauth.checks,
    });
  });

  const allowedHosts = getHttpAllowedHosts();
  const app = createMcpExpressApp({
    host: '0.0.0.0',
    allowedHosts: allowedHosts.length > 0 ? allowedHosts : undefined,
  });

  const mode = getMcpAuthMode();
  const oauthMiddleware = mode === 'oauth' || mode === 'both' ? setupOAuth(app) : undefined;

  if (mode === 'token') {
    registerMcpRoutes(app, staticBearerMiddleware);
  } else if (mode === 'oauth') {
    if (!oauthMiddleware) {
      throw new Error('OAuth is not configured for MCP_AUTH_MODE=oauth');
    }
    registerMcpRoutes(app, oauthMiddleware);
  } else if (mode === 'both') {
    if (oauthMiddleware) {
      registerMcpRoutes(app, buildDualAuthMiddleware(oauthMiddleware));
    } else {
      registerMcpRoutes(app, staticBearerMiddleware);
    }
  }

  rootApp.use(app);
  return rootApp;
}

/**
 * Starts the HTTP MCP server (Bunny Magic Containers / remote clients).
 */
export async function runHttpServer(): Promise<void> {
  validateHttpAuthConfig();

  const app = createHttpApp();
  const port = getHttpPort();

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      const oauth = getOAuthConfigStatus();
      console.log(`ips5-mcp HTTP listening on 0.0.0.0:${port} (auth: ${getMcpAuthMode()})`);
      console.log(
        `OAuth configured: ${oauth.configured} (${Object.entries(oauth.checks)
          .map(([key, ok]) => `${key}=${ok}`)
          .join(', ')})`,
      );
      resolve();
    });
    server.on('error', reject);
  });
}
