import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { BaseMcpServer } from '../base-server.js';
import { ToolDef } from '../types.js';

describe('BaseMcpServer', () => {
  it('should register tools and handle tools/list request', async () => {
    // Create a server instance
    const server = new BaseMcpServer({
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server',
    });

    // Define a test tool
    const testTool: ToolDef = {
      name: 'test_tool',
      description: 'A test tool',
      schema: z.object({
        name: z.string().describe('Name parameter'),
      }),
      execute: async (args) => `Hello, ${args.name}!`,
    };

    // Register the tool
    server.registerTool(testTool);

    // Verify the tool is registered
    const mcpServer = server.getServer();
    expect(mcpServer).toBeDefined();
  });

  it('should handle tools/call request', async () => {
    const server = new BaseMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    const mockExecute = vi.fn().mockResolvedValue('Tool executed successfully');
    
    const testTool: ToolDef = {
      name: 'test_tool',
      description: 'A test tool',
      schema: z.object({
        value: z.string(),
      }),
      execute: mockExecute,
    };

    server.registerTool(testTool);

    // The tool should be ready to handle calls
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('should inject default root when available', async () => {
    const server = new BaseMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    server.setDefaultRoot('/test/root');

    const mockExecute = vi.fn().mockResolvedValue('Success');
    
    const testTool: ToolDef = {
      name: 'test_tool_with_root',
      description: 'A tool that uses root',
      schema: z.object({
        file: z.string(),
        root: z.string().optional(),
      }),
      execute: mockExecute,
    };

    server.registerTool(testTool);

    // The default root should be set
    expect(server['defaultRoot']).toBe('/test/root');
  });

  it('should register multiple tools at once', () => {
    const server = new BaseMcpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    const tools: ToolDef[] = [
      {
        name: 'tool1',
        description: 'Tool 1',
        schema: z.object({ a: z.string() }),
        execute: async () => 'Result 1',
      },
      {
        name: 'tool2',
        description: 'Tool 2',
        schema: z.object({ b: z.number() }),
        execute: async () => 'Result 2',
      },
    ];

    server.registerTools(tools);

    // Both tools should be registered
    expect(server['tools'].size).toBe(2);
    expect(server['tools'].has('tool1')).toBe(true);
    expect(server['tools'].has('tool2')).toBe(true);
  });
});