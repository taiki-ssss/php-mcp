import { Result, ok, err } from 'neverthrow';
import path from 'path';
import fs from 'fs/promises';
import { parsePhp } from '../../shared/lib/php-parser/index.js';
import { isOk } from '../../shared/lib/php-parser/utils/result.js';
import { 
  findSymbolReferences,
  scanProject 
} from '../../shared/lib/php-analyzer/index.js';
import { FindReferencesRequest, FindReferencesResult, FileReferences, Reference } from './types.js';
import { debug } from '../../shared/api/mcp/utils.js';

/**
 * Find all references to a symbol
 */
export async function findReferences(
  request: FindReferencesRequest
): Promise<Result<FindReferencesResult, string>> {
  const { filePath, line, symbolName, root = process.cwd() } = request;

  // Resolve absolute path
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join(root, filePath);

  debug('Finding references for:', { absolutePath, line, symbolName });

  try {
    // Scan the project to find all PHP files
    const project = await scanProject(root);
    const fileReferences: FileReferences[] = [];
    let totalReferences = 0;

    // Process each file in the project
    for (const phpFile of project.files) {
      const fileContent = await fs.readFile(phpFile, 'utf-8');
      const parseResult = parsePhp(fileContent, {
        errorRecovery: true
      });

      if (!isOk(parseResult)) {
        debug(`Skipping file due to parse error: ${phpFile}`);
        continue;
      }

      // Find all references to the symbol in this file
      const references = findSymbolReferences(parseResult.value, symbolName, phpFile);
      
      if (references.length > 0) {
        const lines = fileContent.split('\n');
        const refs: Reference[] = references.map(ref => {
          const lineContent = lines[ref.line - 1] || '';
          return {
            line: ref.line,
            column: ref.column,
            context: lineContent.trim(),
          };
        });

        const relativePath = path.relative(root, phpFile);
        fileReferences.push({
          path: relativePath,
          references: refs,
        });

        totalReferences += references.length;
      }
    }

    const result: FindReferencesResult = {
      symbol: symbolName,
      references: fileReferences,
      totalReferences,
    };

    return ok(result);
  } catch (error) {
    return err(`Error finding references: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Format find references result for display
 */
export function formatFindReferencesResult(result: FindReferencesResult): string {
  const lines: string[] = [
    `Found ${result.totalReferences} reference(s) to '${result.symbol}':`,
    '',
  ];

  for (const file of result.references) {
    lines.push(`=Ä ${file.path} (${file.references.length} reference(s))`);
    for (const ref of file.references) {
      lines.push(`  Line ${ref.line}:${ref.column} - ${ref.context}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}