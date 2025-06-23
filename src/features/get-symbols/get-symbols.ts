import { Result, ok, err } from 'neverthrow';
import path from 'path';
import fs from 'fs/promises';
import { parsePhp } from '../../shared/lib/php-parser/index.js';
import { isOk } from '../../shared/lib/php-parser/utils/result.js';
import { extractSymbols } from '../../shared/lib/php-analyzer/index.js';
import { GetSymbolsRequest, GetSymbolsResult, SymbolGroup, SymbolInfo } from './types.js';
import { PhpSymbol, SymbolKind } from '../../entities/symbol/index.js';
import { debug } from '../../shared/api/mcp/utils.js';

/**
 * Get all symbols in a file
 */
export async function getSymbols(
  request: GetSymbolsRequest
): Promise<Result<GetSymbolsResult, string>> {
  const { filePath, root = process.cwd() } = request;

  // Resolve absolute path
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join(root, filePath);

  debug('Getting symbols from:', absolutePath);

  try {
    // Check if file exists
    await fs.access(absolutePath);
  } catch {
    return err(`File not found: ${filePath}`);
  }

  try {
    // Read file content
    const content = await fs.readFile(absolutePath, 'utf-8');
    
    // Parse PHP file
    const parseResult = parsePhp(content, { 
      errorRecovery: true 
    });

    if (!isOk(parseResult)) {
      return err(`Failed to parse PHP file: ${parseResult.error}`);
    }

    const ast = parseResult.value;

    // Extract all symbols
    const symbols = extractSymbols(ast, absolutePath);

    // Group symbols by type
    const groupedSymbols = groupSymbolsByType(symbols);

    const result: GetSymbolsResult = {
      filePath,
      symbols: groupedSymbols,
      totalSymbols: symbols.length,
    };

    return ok(result);
  } catch (error) {
    return err(`Error getting symbols: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Group symbols by their type
 */
function groupSymbolsByType(symbols: PhpSymbol[]): SymbolGroup[] {
  const groups = new Map<SymbolKind, SymbolInfo[]>();

  for (const symbol of symbols) {
    if (!groups.has(symbol.kind)) {
      groups.set(symbol.kind, []);
    }

    const info: SymbolInfo = {
      name: symbol.name,
      line: symbol.location.line,
      column: symbol.location.column,
    };

    if (symbol.parentClass) {
      info.parentClass = symbol.parentClass;
    }

    if (symbol.visibility) {
      info.visibility = symbol.visibility;
    }

    const modifiers: string[] = [];
    if (symbol.static) modifiers.push('static');
    if (symbol.abstract) modifiers.push('abstract');
    if (symbol.final) modifiers.push('final');
    
    if (modifiers.length > 0) {
      info.modifiers = modifiers;
    }

    groups.get(symbol.kind)!.push(info);
  }

  // Convert to array and sort
  const result: SymbolGroup[] = [];
  const typeOrder: SymbolKind[] = ['namespace', 'class', 'interface', 'trait', 'function', 'method', 'property', 'constant', 'variable'];

  for (const type of typeOrder) {
    const symbols = groups.get(type);
    if (symbols && symbols.length > 0) {
      // Sort symbols by line number
      symbols.sort((a, b) => a.line - b.line);
      result.push({
        type: type.charAt(0).toUpperCase() + type.slice(1) + 's',
        symbols,
      });
    }
  }

  return result;
}

/**
 * Format get symbols result for display
 */
export function formatGetSymbolsResult(result: GetSymbolsResult): string {
  const lines: string[] = [
    `Found ${result.totalSymbols} symbol(s) in ${result.filePath}:`,
    '',
  ];

  for (const group of result.symbols) {
    lines.push(`### ${group.type}`);
    for (const symbol of group.symbols) {
      let line = `  ${symbol.name} (line ${symbol.line})`;
      
      if (symbol.parentClass) {
        line = `  ${symbol.parentClass}::${symbol.name} (line ${symbol.line})`;
      }

      if (symbol.visibility || symbol.modifiers) {
        const attrs: string[] = [];
        if (symbol.visibility) attrs.push(symbol.visibility);
        if (symbol.modifiers) attrs.push(...symbol.modifiers);
        line += ` [${attrs.join(' ')}]`;
      }

      lines.push(line);
    }
    lines.push('');
  }

  return lines.join('\n');
}