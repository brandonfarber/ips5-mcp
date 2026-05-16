export function missingCredentialsResult() {
  return {
    isError: true as const,
    content: [
      {
        type: 'text' as const,
        text:
          'Missing IPS5_BASE_URL or IPS5_API_KEY. Copy .env.example to .env, set both values, then restart this MCP server (or set them in your MCP client env block).',
      },
    ],
  };
}

export function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  };
}
