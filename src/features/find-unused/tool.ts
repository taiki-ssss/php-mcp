import { z } from 'zod';
import { ToolDef } from '../../shared/api/mcp/types.js';
import { findUnused } from './find-unused.js';

const schema = z.object({
  root: z.string().optional().describe('Root directory to search (default: current directory)'),
  types: z.union([
    z.literal('all'),
    z.array(z.enum([
      'variables',
      'functions',
      'classes', 
      'methods',
      'properties',
      'constants',
      'imports'
    ]))
  ]).optional().describe('Types of unused symbols to detect. Use "all" or array of specific types (default: all)'),
  includePrivate: z.boolean().optional().describe('Include private methods/properties (default: false)'),
  includeProtected: z.boolean().optional().describe('Include protected methods/properties (default: false)'),
  excludePatterns: z.array(z.string()).optional().describe('File/directory patterns to exclude (default: ["vendor/**", "node_modules/**", ".git/**"])'),
  entryPoints: z.array(z.string()).optional().describe('Entry point file patterns (e.g., ["index.php", "public/*.php"])')
});

export const findUnusedTool: ToolDef<typeof schema> = {
  name: 'php_find_unused',
  description: 'Find unused variables, functions, classes, methods, properties, constants, and imports in PHP code',
  schema,
  async execute(args) {
    const result = await findUnused(args);
    
    if (!result.isOk()) {
      throw result.error;
    }

    const { unusedSymbols, totalUnused, scannedFiles, byType } = result.value;

    let output = `Found ${totalUnused} unused symbols in ${scannedFiles} files\n\n`;

    // 種類別の集計
    output += 'Summary by type:\n';
    for (const [type, count] of Object.entries(byType)) {
      if (count > 0) {
        output += `  ${type}: ${count}\n`;
      }
    }
    output += '\n';

    // 未使用シンボルの詳細
    if (unusedSymbols.length > 0) {
      output += 'Unused symbols:\n';
      
      // 種類別にグループ化
      const grouped = unusedSymbols.reduce((acc, symbol) => {
        if (!acc[symbol.type]) {
          acc[symbol.type] = [];
        }
        acc[symbol.type].push(symbol);
        return acc;
      }, {} as Record<string, typeof unusedSymbols>);

      for (const [type, symbols] of Object.entries(grouped)) {
        output += `\n${type.charAt(0).toUpperCase() + type.slice(1)}:\n`;
        
        for (const symbol of symbols) {
          output += `  ${symbol.name}`;
          
          if (symbol.visibility) {
            output += ` (${symbol.visibility})`;
          }
          
          output += `\n     ${symbol.filePath}:${symbol.line}:${symbol.column}`;
          
          if (symbol.reason && symbol.reason !== 'No references found') {
            output += `\n     Note: ${symbol.reason}`;
          }
          
          output += '\n';
        }
      }
    } else {
      output += 'No unused symbols found!\n';
    }

    return output;
  }
};