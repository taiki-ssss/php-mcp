import { Result, ok, err } from 'neverthrow';
import path from 'path';
import fs from 'fs/promises';
import { parsePhp } from '../../shared/lib/php-parser/index.js';
import { isOk } from '../../shared/lib/php-parser/utils/result.js';
import { 
  findSymbolAtLine, 
  findSymbolReferences,
  scanProject 
} from '../../shared/lib/php-analyzer/index.js';
import { RenameSymbolRequest, RenameSymbolResult, ChangedFile, Change } from './types.js';
import { debug } from '../../shared/api/mcp/utils.js';

/**
 * Main logic for renaming PHP symbols
 */
export async function renameSymbol(
  request: RenameSymbolRequest
): Promise<Result<RenameSymbolResult, string>> {
  const { filePath, line, oldName, newName, root = process.cwd() } = request;

  // Resolve absolute path
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join(root, filePath);

  debug('Renaming symbol:', { absolutePath, line, oldName, newName });

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

    // Convert line parameter to number
    const targetLine = typeof line === 'string' 
      ? parseInt(line, 10)
      : line;

    if (!targetLine || isNaN(targetLine)) {
      return err(`Invalid line number: "${line}"`);
    }

    // Find the symbol at the specified line
    const symbol = findSymbolAtLine(ast, targetLine, oldName, absolutePath);
    
    if (!symbol) {
      return err(`Symbol '${oldName}' not found at line ${targetLine}`);
    }

    debug(`Found symbol: ${symbol.kind} ${symbol.name} at line ${symbol.location.line}`);

    // Scan the project to find all PHP files
    const project = await scanProject(root);
    const changedFiles: ChangedFile[] = [];
    let totalChanges = 0;

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
      const references = findSymbolReferences(parseResult.value, oldName, phpFile);
      
      if (references.length > 0) {
        const changes: Change[] = references.map(ref => ({
          line: ref.line,
          column: ref.column,
          oldText: oldName,
          newText: newName,
        }));

        // Apply the changes to the file content
        const updatedContent = applyChangesToContent(fileContent, changes, newName);
        await fs.writeFile(phpFile, updatedContent, 'utf-8');

        const relativePath = path.relative(root, phpFile);
        changedFiles.push({
          path: relativePath,
          changes,
        });

        totalChanges += changes.length;
      }
    }

    const result: RenameSymbolResult = {
      message: `Successfully renamed '${oldName}' to '${newName}'`,
      changedFiles,
      totalChanges,
    };

    return ok(result);
  } catch (error) {
    return err(`Error during rename: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * Apply changes to file content
 */
function applyChangesToContent(
  content: string, 
  changes: Change[],
  newName: string
): string {
  // Sort changes by position (reverse order to avoid offset issues)
  const sortedChanges = [...changes].sort((a, b) => {
    if (a.line !== b.line) {
      return b.line - a.line;
    }
    return b.column - a.column;
  });

  const lines = content.split('\n');

  for (const change of sortedChanges) {
    const lineIndex = change.line - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const before = line.substring(0, change.column - 1);
      const after = line.substring(change.column - 1 + change.oldText.length);
      lines[lineIndex] = before + newName + after;
    }
  }

  return lines.join('\n');
}

/**
 * Format rename result for display
 */
export function formatRenameResult(result: RenameSymbolResult): string {
  const lines: string[] = [
    result.message,
    '',
    `Changed ${result.totalChanges} occurrence(s) in ${result.changedFiles.length} file(s):`,
    '',
  ];

  for (const file of result.changedFiles) {
    lines.push(`=> ${file.path}`);
    for (const change of file.changes) {
      lines.push(`  Line ${change.line}: "${change.oldText}" -> "${change.newText}"`);
    }
    lines.push('');
  }

  return lines.join('\n');
}