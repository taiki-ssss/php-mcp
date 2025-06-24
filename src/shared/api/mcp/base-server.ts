import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ToolDef, McpServerOptions, Transport, JSONSchema } from './types.js';
import { debug, toMcpToolHandler } from './utils.js';
import type { 
  ListToolsResult,
  CallToolResult
} from '@modelcontextprotocol/sdk/types.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Base MCP Server implementation
 * Inspired by typescript-mcp's BaseMcpServer
 */
export class BaseMcpServer {
  private server: Server;
  private tools: Map<string, ToolDef> = new Map();
  private defaultRoot?: string;
  private toolsListHandlerRegistered = false;
  private toolsCallHandlerRegistered = false;
  private connected = false;

  constructor(options: McpServerOptions) {
    this.server = new Server(
      {
        name: options.name,
        version: options.version,
      },
      {
        capabilities: options.capabilities || {
          tools: {},
        },
      }
    );
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Set default root directory for tools
   */
  setDefaultRoot(root: string): void {
    this.defaultRoot = root;
    debug('Default root set to:', root);
  }

  /**
   * Register a single tool
   */
  registerTool(tool: ToolDef): void {
    this.tools.set(tool.name, tool);
    debug('Registered tool:', tool.name);
    
    // Register handlers if already connected
    if (this.connected) {
      this._setupHandlers();
    }
  }

  /**
   * Register multiple tools at once
   */
  registerTools(tools: ToolDef<z.ZodType>[]): void {
    tools.forEach(tool => this.registerTool(tool));
  }

  /**
   * Connect to transport and set up handlers
   */
  async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);
    this.connected = true;
    this._setupHandlers();
  }

  /**
   * Set up all handlers after connection
   */
  private _setupHandlers(): void {
    if (this.tools.size > 0) {
      this._registerToolsListHandler();
      this._registerToolsCallHandler();
    }
  }

  /**
   * Register the tools/list handler
   */
  private _registerToolsListHandler(): void {
    if (this.toolsListHandlerRegistered) return;
    
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => {
        const toolsList = Array.from(this.tools.values()).map(tool => {
          const schema = tool.schema as z.AnyZodObject;
          const shape = schema.shape || {};
          
          const jsonSchema = {
            type: 'object' as const,
            properties: Object.entries(shape).reduce((acc, [key, value]) => {
              const zodType = value as z.ZodType;
              acc[key] = this._zodToJsonSchema(zodType);
              return acc;
            }, {} as Record<string, JSONSchema>),
            required: Object.keys(shape).filter(key => {
              const zodType = shape[key] as z.ZodType;
              return !zodType.isOptional();
            }),
          };

          return {
            name: tool.name,
            description: tool.description,
            inputSchema: jsonSchema,
          };
        });
        
        const result: ListToolsResult = { tools: toolsList };
        return result;
      }
    );
    
    this.toolsListHandlerRegistered = true;
  }

  /**
   * Register the tools/call handler
   */
  private _registerToolsCallHandler(): void {
    if (this.toolsCallHandlerRegistered) return;
    
    // Remove any existing handler first
    try {
      this.server.removeRequestHandler('tools/call');
    } catch (e) {
      // Handler might not exist yet
    }

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const { name, arguments: args } = request.params;
        
        const tool = this.tools.get(name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }

        const schema = tool.schema as z.ZodObject<any>;
        const shape = schema.shape || {};
        
        // Inject default root if available and not provided
        const finalArgs = { ...args };
        if (this.defaultRoot && shape.root && !finalArgs.root) {
          finalArgs.root = this.defaultRoot;
        }

        // Validate with Zod
        const validated = tool.schema.parse(finalArgs);
        
        // Execute tool
        const handler = toMcpToolHandler(tool.execute);
        const result = await handler(validated);
        
        return result as CallToolResult;
      }
    );
    
    this.toolsCallHandlerRegistered = true;
  }

  /**
   * Convert Zod schema to JSON Schema (simplified)
   */
  private _zodToJsonSchema(zodType: z.ZodType): JSONSchema {
    if (zodType instanceof z.ZodString) {
      return { type: 'string' };
    } else if (zodType instanceof z.ZodNumber) {
      return { type: 'number' };
    } else if (zodType instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    } else if (zodType instanceof z.ZodUnion) {
      const unionType = zodType as z.ZodUnion<[z.ZodType, ...z.ZodType[]]>;
      const options = unionType._def.options;
      return { 
        oneOf: options.map((opt: z.ZodType) => this._zodToJsonSchema(opt)) 
      } as JSONSchema;
    } else if (zodType instanceof z.ZodOptional) {
      const optionalType = zodType as z.ZodOptional<z.ZodType>;
      return this._zodToJsonSchema(optionalType._def.innerType);
    }
    return { type: 'string' as const }; // fallback
  }
}