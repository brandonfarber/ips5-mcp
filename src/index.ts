#!/usr/bin/env node

import { config as loadDotenv } from 'dotenv';

import { getMcpTransport } from './config.js';
import { runHttpServer } from './http.js';
import { runStdioServer } from './server.js';

loadDotenv();

const transport = getMcpTransport();

void (transport === 'http' ? runHttpServer() : runStdioServer()).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
