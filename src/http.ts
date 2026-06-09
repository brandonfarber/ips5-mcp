import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Express, Request, Response, NextFunction } from 'express';

import { getHttpPort, getMcpAllowedHosts, getMcpAuthToken } from './config.js';
import { createIpsMcpServer } from './server.js';

function bearerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
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

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
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
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
}

/**
 * Express app for hosted Streamable HTTP MCP (`/health`, `/mcp`).
 */
export function createHttpApp(): Express {
  const allowedHosts = getMcpAllowedHosts();
  const app = createMcpExpressApp({
    host: '0.0.0.0',
    allowedHosts: allowedHosts.length > 0 ? allowedHosts : undefined,
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.all('/mcp', bearerAuthMiddleware, (req, res) => {
    void handleMcpRequest(req, res);
  });

  return app;
}

/**
 * Starts the HTTP MCP server (Bunny Magic Containers / remote Cursor clients).
 */
export async function runHttpServer(): Promise<void> {
  if (!getMcpAuthToken()) {
    throw new Error('MCP_AUTH_TOKEN is required when MCP_TRANSPORT=http');
  }

  const app = createHttpApp();
  const port = getHttpPort();

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`ips5-mcp HTTP listening on 0.0.0.0:${port}`);
      resolve();
    });
    server.on('error', reject);
  });
}
