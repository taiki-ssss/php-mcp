import { z } from 'zod';
import { ToolDef } from '../../shared/api/mcp/types.js';
import { getSymbols, formatGetSymbolsResult } from './get-symbols.js';

const schema = z.object({
  filePath: z.string().describe('File path to analyze (relative to root)'),
  root: z.string().optional().describe('Root directory for resolving relative paths'),
});

export const getSymbolsTool: ToolDef<typeof schema> = {
  name: 'php_get_symbols',
  description: 'Get all symbols (classes, functions, methods, properties, etc.) from a PHP file',
  schema,
  execute: async (args) => {
    const result = await getSymbols(args);
    
    if (result.isErr()) {
      throw new Error(result.error);
    }

    return formatGetSymbolsResult(result.value);
  },
};