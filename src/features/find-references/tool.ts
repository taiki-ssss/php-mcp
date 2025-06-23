import { z } from 'zod';
import { ToolDef } from '../../shared/api/mcp/types.js';
import { findReferences, formatFindReferencesResult } from './find-references.js';

const schema = z.object({
  filePath: z.string().describe('File path containing the symbol (relative to root)'),
  line: z.union([z.number(), z.string()]).describe('Line number (1-based) or string to match'),
  symbolName: z.string().describe('Name of the symbol to find references for'),
  root: z.string().optional().describe('Root directory for resolving relative paths'),
});

export const findReferencesTool: ToolDef<typeof schema> = {
  name: 'php_find_references',
  description: 'Find all references to a PHP symbol (variable, function, class, etc.) across the codebase',
  schema,
  execute: async (args) => {
    const result = await findReferences(args);
    
    if (result.isErr()) {
      throw new Error(result.error);
    }

    return formatFindReferencesResult(result.value);
  },
};