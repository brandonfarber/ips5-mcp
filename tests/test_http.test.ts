import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import supertest from 'supertest';

import { createHttpApp } from '../src/http.js';

const AUTH_TOKEN = 'test-mcp-token';

beforeEach(() => {
  process.env.MCP_AUTH_TOKEN = AUTH_TOKEN;
  process.env.MCP_ALLOWED_HOSTS = '127.0.0.1';
});

afterEach(() => {
  delete process.env.MCP_AUTH_TOKEN;
  delete process.env.MCP_ALLOWED_HOSTS;
});

describe('createHttpApp', () => {
  test('GET /health returns ok without auth', async () => {
    const app = createHttpApp();
    const res = await supertest(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
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
