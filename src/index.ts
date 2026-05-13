#!/usr/bin/env node

import { runMcpServer } from './server.js';

void runMcpServer().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
