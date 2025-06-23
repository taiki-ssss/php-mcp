/**
 * Debug function that outputs to stderr
 * IMPORTANT: stdout is reserved for MCP protocol communication
 */
export function debug(...args: unknown[]): void {
  console.error('[PHP-MCP]', ...args);
}

/**
 * Format error message for MCP response
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Create a MCP tool handler wrapper
 */
export function toMcpToolHandler<T>(
  handler: (args: T) => Promise<string> | string
): (args: T) => Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  return async (args: T) => {
    try {
      const message = await handler(args);
      return {
        content: [{ type: 'text', text: message }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
        isError: true,
      } as any;
    }
  };
}