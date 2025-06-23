import { z } from 'zod';
import { ToolDef } from '../../shared/api/mcp/types.js';
import { moveFile, formatMoveFileResult } from './move-file.js';

const schema = z.object({
  oldPath: z.string().describe('Current file path (relative to root)'),
  newPath: z.string().describe('New file path (relative to root)'),
  root: z.string().optional().describe('Root directory for resolving relative paths'),
  updateReferences: z.coerce.boolean().optional().default(true).describe('Update references in other files (default: true)'),
});

export const moveFileTool: ToolDef<typeof schema> = {
  name: 'php_move_file',
  description: 'Move a PHP file and optionally update all references to it (namespaces, use statements, require/include)',
  schema,
  execute: async (args) => {
    const result = await moveFile(args);
    
    if (result.isErr()) {
      throw new Error(result.error);
    }

    return formatMoveFileResult(result.value);
  },
};