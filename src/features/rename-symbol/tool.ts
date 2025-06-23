import { z } from 'zod';
import { ToolDef } from '../../shared/api/mcp/types.js';
import { renameSymbol, formatRenameResult } from './rename-symbol.js';

const schema = z.object({
  filePath: z.string().describe('File path containing the symbol (relative to root)'),
  line: z.union([z.number(), z.string()]).describe('Line number (1-based) or string to match'),
  oldName: z.string().describe('Current name of the symbol'),
  newName: z.string().describe('New name for the symbol'),
  root: z.string().optional().describe('Root directory for resolving relative paths'),
});

export const renameSymbolTool: ToolDef<typeof schema> = {
  name: 'php_rename_symbol',
  description: 'Rename a PHP symbol (variable, function, class, etc.) across the codebase',
  schema,
  execute: async (args) => {
    const result = await renameSymbol(args);
    
    if (result.isErr()) {
      throw new Error(result.error);
    }

    return formatRenameResult(result.value);
  },
};