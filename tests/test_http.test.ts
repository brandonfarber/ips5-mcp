import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import supertest from 'supertest';

import { createHttpApp } from '../src/http.js';

const AUTH_TOKEN = 'test-mcp-token';

beforeEach(() => {
  process.env.MCP_AUTH_MODE = 'token';
  process.env.MCP_AUTH_TOKEN = AUTH_TOKEN;
  process.env.MCP_ALLOWED_HOSTS = '127.0.0.1';
});

afterEach(() => {
  delete process.env.MCP_AUTH_MODE;
  delete process.env.MCP_AUTH_TOKEN;
  delete process.env.MCP_ALLOWED_HOSTS;
});

describe('createHttpApp', () => {
  test('GET /health returns ok without auth', async () => {
    const app = createHttpApp();
    const res = await supertest(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      auth: 'token',
      oauth_configured: false,
      oauth_checks: {
        mcp_oauth_issuer_url: false,
        ips5_base_url: false,
        ips_oauth_client_id: false,
        ips_oauth_client_secret: false,
        mcp_admin_group_ids: false,
      },
    });
  });

  test('POST /mcp without Authorization returns 401', async () => {
    const app = createHttpApp();
    const res = await supertest(app).post('/mcp').send({});

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  test('POST /mcp with wrong bearer token returns 401', async () => {
    const app = createHttpApp();
    const res = await supertest(app)
      .post('/mcp')
      .set('Authorization', 'Bearer wrong-token')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  test('POST /mcp without configured MCP_AUTH_TOKEN returns 503', async () => {
    delete process.env.MCP_AUTH_TOKEN;
    const app = createHttpApp();
    const res = await supertest(app)
      .post('/mcp')
      .set('Authorization', 'Bearer anything')
      .send({});

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'MCP_AUTH_TOKEN is not configured' });
  });
});

describe('dual auth (MCP_AUTH_MODE=both)', () => {
  const saved: Partial<Record<string, string | undefined>> = {};

  beforeEach(() => {
    saved.MCP_AUTH_MODE = process.env.MCP_AUTH_MODE;
    saved.MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
    saved.MCP_OAUTH_ISSUER_URL = process.env.MCP_OAUTH_ISSUER_URL;
    saved.MCP_RESOURCE_URL = process.env.MCP_RESOURCE_URL;
    saved.IPS5_BASE_URL = process.env.IPS5_BASE_URL;
    saved.IPS_OAUTH_CLIENT_ID = process.env.IPS_OAUTH_CLIENT_ID;
    saved.IPS_OAUTH_CLIENT_SECRET = process.env.IPS_OAUTH_CLIENT_SECRET;
    saved.MCP_ADMIN_GROUP_IDS = process.env.MCP_ADMIN_GROUP_IDS;
    saved.MCP_ALLOWED_HOSTS = process.env.MCP_ALLOWED_HOSTS;

    process.env.MCP_AUTH_MODE = 'both';
    process.env.MCP_AUTH_TOKEN = AUTH_TOKEN;
    process.env.MCP_OAUTH_ISSUER_URL = 'https://mcp.example.com';
    process.env.MCP_RESOURCE_URL = 'https://mcp.example.com/mcp';
    process.env.IPS5_BASE_URL = 'https://community.example.com';
    process.env.IPS_OAUTH_CLIENT_ID = 'gateway-client';
    process.env.IPS_OAUTH_CLIENT_SECRET = 'gateway-secret';
    process.env.MCP_ADMIN_GROUP_IDS = '4';
    process.env.MCP_ALLOWED_HOSTS = '127.0.0.1';
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  test('static bearer still works alongside OAuth', async () => {
    const app = createHttpApp();
    const res = await supertest(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
        id: 1,
      });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(503);
  });

  test('wrong bearer without OAuth token returns 401', async () => {
    const app = createHttpApp();
    const res = await supertest(app)
      .post('/mcp')
      .set('Authorization', 'Bearer wrong-token')
      .send({});

    expect(res.status).toBe(401);
  });
});
