import { Result, ok, err } from 'neverthrow';
import path from 'path';
import fs from 'fs/promises';
import { MoveFileRequest, MoveFileResult, UpdatedFile, UpdateInfo } from './types.js';
import { parsePhp } from '../../shared/lib/php-parser/index.js';
import { isOk } from '../../shared/lib/php-parser/utils/result.js';
import { debug } from '../../shared/api/mcp/utils.js';
import { getPhpFiles } from '../../shared/lib/file-utils/index.js';
import { walk, walkAsync, transform } from '../../shared/lib/php-parser/analyzer/walker.js';
import * as AST from '../../shared/lib/php-parser/core/ast.js';
import { generatePhpCode } from '../../shared/lib/php-parser/generator/index.js';

/**
 * Move a PHP file and update references
 */
export async function moveFile(
  request: MoveFileRequest
): Promise<Result<MoveFileResult, string>> {
  const { oldPath, newPath, root = process.cwd(), updateReferences = true } = request;

  // Resolve absolute paths
  const oldAbsolutePath = path.isAbsolute(oldPath) 
    ? oldPath 
    : path.join(root, oldPath);
  const newAbsolutePath = path.isAbsolute(newPath) 
    ? newPath 
    : path.join(root, newPath);

  debug('Moving file from:', oldAbsolutePath);
  debug('Moving file to:', newAbsolutePath);

  // Check if source file exists
  try {
    await fs.access(oldAbsolutePath);
  } catch {
    return err(`Source file not found: ${oldPath}`);
  }

  // Check if destination already exists
  try {
    await fs.access(newAbsolutePath);
    return err(`Destination file already exists: ${newPath}`);
  } catch {
    // Good, destination doesn't exist
  }

  try {
    // Ensure destination directory exists
    const newDir = path.dirname(newAbsolutePath);
    await fs.mkdir(newDir, { recursive: true });

    // Move the file
    await fs.rename(oldAbsolutePath, newAbsolutePath);

    const result: MoveFileResult = {
      oldPath,
      newPath,
      moved: true,
    };

    // Update references if requested
    if (updateReferences) {
      const updatedFiles = await updateFileReferences(
        oldAbsolutePath,
        newAbsolutePath,
        root
      );
      
      if (updatedFiles.length > 0) {
        result.updatedFiles = updatedFiles;
      }
    }

    return ok(result);
  } catch (error) {
    return err(`Error moving file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update references to the moved file in other PHP files using AST
 */
async function updateFileReferences(
  oldAbsolutePath: string,
  newAbsolutePath: string,
  root: string
): Promise<UpdatedFile[]> {
  const updatedFiles: UpdatedFile[] = [];

  // Get old and new namespace based on PSR-4 convention
  const oldNamespace = getNamespaceFromPath(oldAbsolutePath, root);
  const newNamespace = getNamespaceFromPath(newAbsolutePath, root);

  // Get all PHP files in the project
  const phpFiles = await getPhpFiles(root);

  // First, update the moved file itself
  if (oldNamespace && newNamespace && oldNamespace !== newNamespace) {
    // This will be handled in the loop below
  }

  // Then update references in other files
  for (const filePath of phpFiles) {
    // Skip the moved file itself
    if (filePath === newAbsolutePath) {
      continue;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const updates: UpdateInfo[] = [];
      
      // Parse the PHP file
      const parseResult = parsePhp(content);
      if (!isOk(parseResult)) {
        debug(`Error parsing ${filePath}:`, parseResult.error);
        continue;
      }

      let ast = parseResult.value;
      let hasChanges = false;

      // Update use statements if namespace changed
      if (oldNamespace && newNamespace && oldNamespace !== newNamespace) {
        const result = updateUseStatements(ast, oldNamespace, newNamespace, updates);
        if (result.hasChanges) {
          ast = result.ast;
          hasChanges = true;
        }
      }

      // Update require/include statements
      const requireResult = updateRequireStatements(
        ast,
        oldAbsolutePath,
        newAbsolutePath,
        filePath,
        updates
      );
      if (requireResult.hasChanges) {
        ast = requireResult.ast;
        hasChanges = true;
      }

      // Generate updated PHP code if there were changes
      if (hasChanges) {
        const updatedContent = generatePhpCode(ast);
        await fs.writeFile(filePath, updatedContent, 'utf-8');
        updatedFiles.push({
          filePath: path.relative(root, filePath),
          updates,
        });
      }
    } catch (error) {
      debug(`Error updating references in ${filePath}:`, error);
    }
  }

  return updatedFiles;
}

/**
 * Update namespace in the moved file itself
 */
async function updateMovedFileNamespace(
  filePath: string,
  oldNamespace: string,
  newNamespace: string
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const parseResult = parsePhp(content);
  if (!isOk(parseResult)) {
    debug(`Error parsing moved file ${filePath}:`, parseResult.error);
    return;
  }

  let ast = parseResult.value;
  let hasChanges = false;

  // Update namespace declaration
  const transformedAst = transform(ast, (node) => {
    if (node.type === 'NamespaceDeclaration') {
      const nsDecl = node as AST.NamespaceDeclaration;
      if (nsDecl.name && nsDecl.name.parts.join('\\') === oldNamespace) {
        hasChanges = true;
        return {
          ...nsDecl,
          name: {
            ...nsDecl.name,
            parts: newNamespace.split('\\'),
          },
        };
      }
    }
    return node;
  });
  
  if (transformedAst) {
    ast = transformedAst;
  }

  if (hasChanges) {
    const updatedContent = generatePhpCode(ast);
    await fs.writeFile(filePath, updatedContent, 'utf-8');
  }
}

/**
 * Update use statements in a PHP file using AST
 */
function updateUseStatements(
  ast: AST.PhpProgram,
  oldNamespace: string,
  newNamespace: string,
  updates: UpdateInfo[]
): { ast: AST.PhpProgram; hasChanges: boolean } {
  let hasChanges = false;

  const updatedAst = transform(ast, (node, context) => {
    if (node.type === 'UseStatement') {
      const useStmt = node as AST.UseStatement;
      const updatedItems = useStmt.items.map((item) => {
        const fullName = item.name.parts.join('\\');
        
        // Check if this use statement references the old namespace
        if (fullName.startsWith(oldNamespace + '\\') || fullName === oldNamespace) {
          hasChanges = true;
          const updatedName = fullName.replace(
            new RegExp(`^${escapeRegExp(oldNamespace)}`),
            newNamespace
          );
          
          updates.push({
            type: 'use',
            old: fullName,
            new: updatedName,
            line: item.location?.start.line || 0,
          });

          return {
            ...item,
            name: {
              ...item.name,
              parts: updatedName.split('\\'),
            },
          };
        }
        return item;
      });

      if (hasChanges) {
        return {
          ...useStmt,
          items: updatedItems,
        };
      }
    }
    return node;
  });

  return { ast: updatedAst as AST.PhpProgram, hasChanges };
}

/**
 * Update require/include statements in a PHP file using AST
 */
function updateRequireStatements(
  ast: AST.PhpProgram,
  oldAbsolutePath: string,
  newAbsolutePath: string,
  currentFilePath: string,
  updates: UpdateInfo[]
): { ast: AST.PhpProgram; hasChanges: boolean } {
  let hasChanges = false;

  const updatedAst = transform(ast, (node) => {
    if (node.type === 'IncludeExpression' || node.type === 'RequireExpression') {
      const includeExpr = node as AST.IncludeExpression | AST.RequireExpression;
      
      // Check if the argument is a string literal
      if (includeExpr.argument.type === 'StringLiteral') {
        const strLiteral = includeExpr.argument as AST.StringLiteral;
        const requiredPath = strLiteral.value;
        const absoluteRequiredPath = path.resolve(path.dirname(currentFilePath), requiredPath);
        
        if (absoluteRequiredPath === oldAbsolutePath) {
          hasChanges = true;
          const newRelativePath = path.relative(path.dirname(currentFilePath), newAbsolutePath);
          
          updates.push({
            type: node.type === 'RequireExpression' ? 'require' : 'include',
            old: requiredPath,
            new: newRelativePath,
            line: includeExpr.location?.start.line || 0,
          });

          return {
            ...includeExpr,
            argument: {
              ...strLiteral,
              value: newRelativePath,
              raw: `'${newRelativePath}'`,
            },
          };
        }
      }
    }
    return node;
  });

  return { ast: updatedAst as AST.PhpProgram, hasChanges };
}

/**
 * Get namespace from file path based on PSR-4 convention
 */
function getNamespaceFromPath(filePath: string, root: string): string | null {
  // Look for common PSR-4 root directories
  const psr4Roots = ['src', 'lib', 'app'];
  const relativePath = path.relative(root, filePath);
  const parts = relativePath.split(path.sep);

  let namespaceStart = 0;
  for (let i = 0; i < parts.length; i++) {
    if (psr4Roots.includes(parts[i])) {
      namespaceStart = i + 1;
      break;
    }
  }

  if (namespaceStart === 0 || namespaceStart >= parts.length - 1) {
    // No PSR-4 root found or it's the file itself
    return null;
  }

  // Build namespace from path parts (excluding the filename)
  const namespaceParts = parts.slice(namespaceStart, -1);
  return namespaceParts.join('\\\\');
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find line number of a match in content
 */
function findLineNumber(content: string, searchText: string | RegExp): number {
  const lines = content.split('\\n');
  const searchStr = searchText instanceof RegExp ? searchText.source : searchText;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr) || (searchText instanceof RegExp && searchText.test(lines[i]))) {
      return i + 1;
    }
  }
  
  return 1;
}

/**
 * Format move file result for display
 */
export function formatMoveFileResult(result: MoveFileResult): string {
  const lines: string[] = [
    `File moved successfully:`,
    `  From: ${result.oldPath}`,
    `  To: ${result.newPath}`,
  ];

  if (result.updatedFiles && result.updatedFiles.length > 0) {
    lines.push('');
    lines.push(`Updated ${result.updatedFiles.length} file(s):`);
    
    for (const file of result.updatedFiles) {
      lines.push(`\\n${file.filePath}:`);
      
      for (const update of file.updates) {
        lines.push(`  Line ${update.line}: ${update.type}`);
        lines.push(`    - ${update.old}`);
        lines.push(`    + ${update.new}`);
      }
    }
  }

  return lines.join('\\n');
}