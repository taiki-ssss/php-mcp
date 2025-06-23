import { z } from 'zod';

/**
 * MCP Tool Definition Interface
 * Based on typescript-mcp's ToolDef pattern
 */
export interface ToolDef<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  execute: (args: z.infer<S>) => Promise<string> | string;
}

/**
 * MCP Tool Result format
 */
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * MCP Server Options
 */
export interface McpServerOptions {
  name: string;
  version: string;
  description?: string;
  capabilities?: {
    tools?: {};
    resources?: {};
    prompts?: {};
  };
}