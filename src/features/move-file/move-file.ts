import { Result, ok, err } from 'neverthrow';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { MoveFileRequest, MoveFileResult, UpdatedFile, UpdateInfo } from './types.js';
import { parsePhp } from '../../shared/lib/php-parser/index.js';
import { isOk } from '../../shared/lib/php-parser/utils/result.js';
import { debug } from '../../shared/api/mcp/utils.js';
import { getPhpFiles } from '../../shared/lib/file-utils/index.js';
import { walk, walkAsync, transform } from '../../shared/lib/php-parser/analyzer/walker.js';
import * as AST from '../../shared/lib/php-parser/core/ast.js';
import { generatePhpCode } from '../../shared/lib/php-parser/generator/index.js';

/**
 * Get the actual class name from a PHP file by parsing its AST
 */
async function getClassNameFromFile(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parseResult = parsePhp(content);
    if (!isOk(parseResult)) {
      debug(`Error parsing file ${filePath}:`, parseResult.error);
      return null;
    }

    let className: string | null = null;

    // Walk through AST to find class declaration
    walk(parseResult.value, (node) => {
      if (node.type === 'ClassDeclaration') {
        const classDecl = node as AST.ClassDeclaration;
        if (classDecl.name) {
          className = classDecl.name.name;
          return 'stop'; // Stop walking once we find the first class
        }
      } else if (node.type === 'InterfaceDeclaration') {
        const interfaceDecl = node as AST.InterfaceDeclaration;
        if (interfaceDecl.name) {
          className = interfaceDecl.name.name;
          return 'stop';
        }
      } else if (node.type === 'TraitDeclaration') {
        const traitDecl = node as AST.TraitDeclaration;
        if (traitDecl.name) {
          className = traitDecl.name.name;
          return 'stop';
        }
      }
    });

    return className;
  } catch (error) {
    debug(`Error reading file ${filePath}:`, error);
    return null;
  }
}

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
  
  // Get the actual class name from the PHP file (file has already been moved)
  const className = await getClassNameFromFile(newAbsolutePath);
  
  // If we couldn't get the class name from the file, skip updating references
  if (!className) {
    debug('Could not extract class name from file, skipping reference updates');
    return updatedFiles;
  }
  
  debug('Namespace mapping:', {
    oldPath: oldAbsolutePath,
    newPath: newAbsolutePath,
    oldNamespace,
    newNamespace,
    className
  });

  // Get all PHP files in the project
  const phpFiles = await getPhpFiles(root);

  // First, update the moved file itself
  // Always try to update namespace based on new path
  if (newNamespace !== null) {
    await updateMovedFileNamespace(newAbsolutePath, oldNamespace, newNamespace);
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
      if (oldNamespace !== newNamespace) {
        const result = updateUseStatements(ast, oldNamespace, newNamespace, className!, updates);
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
  oldNamespace: string | null,
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
      const currentNamespace = nsDecl.name ? nsDecl.name.parts.join('\\') : '';
      
      debug('Updating namespace:', {
        current: currentNamespace,
        expected: oldNamespace,
        new: newNamespace
      });
      
      // Update any namespace declaration in the file
      if (nsDecl.name) {
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
    debug('Updated namespace in moved file');
  } else {
    // No namespace found, check if we need to add one
    let needsNamespace = false;
    walk(ast, (node) => {
      if (node.type === 'ClassDeclaration' || 
          node.type === 'InterfaceDeclaration' || 
          node.type === 'TraitDeclaration' ||
          node.type === 'FunctionDeclaration') {
        needsNamespace = true;
        return 'stop';
      }
    });
    
    if (needsNamespace) {
      // Add namespace declaration at the beginning
      const namespaceDecl: AST.NamespaceDeclaration = {
        type: 'NamespaceDeclaration',
        name: {
          type: 'NameExpression',
          parts: newNamespace.split('\\'),
          qualified: 'unqualified'
        },
        statements: ast.statements
      };
      
      const newAst: AST.PhpProgram = {
        ...ast,
        statements: [namespaceDecl]
      };
      const updatedContent = generatePhpCode(newAst);
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      debug('Added namespace to moved file');
    }
  }
}

/**
 * Update use statements in a PHP file using AST
 */
function updateUseStatements(
  ast: AST.PhpProgram,
  oldNamespace: string | null,
  newNamespace: string | null,
  className: string,
  updates: UpdateInfo[]
): { ast: AST.PhpProgram; hasChanges: boolean } {
  let hasChanges = false;

  const updatedAst = transform(ast, (node, context) => {
    if (node.type === 'UseStatement') {
      const useStmt = node as AST.UseStatement;
      let statementHasChanges = false;
      
      const updatedItems = useStmt.items.map((item) => {
        const fullName = item.name.parts.join('\\');
        
        // Build the full qualified class name
        const oldFullName = oldNamespace ? `${oldNamespace}\\${className}` : className;
        const newFullName = newNamespace ? `${newNamespace}\\${className}` : className;
        
        // Check if this use statement references the specific class that was moved
        if (fullName === oldFullName) {
          statementHasChanges = true;
          hasChanges = true;
          
          updates.push({
            type: 'use',
            old: fullName,
            new: newFullName,
            line: item.location?.start.line || 0,
          });

          return {
            ...item,
            name: {
              ...item.name,
              parts: newFullName.split('\\'),
            },
          };
        }
        return item;
      });

      if (statementHasChanges) {
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
 * Get namespace from file path based on composer.json PSR-4 configuration
 */
function getNamespaceFromPath(filePath: string, root: string): string | null {
  const relativePath = path.relative(root, filePath);
  const parts = relativePath.split(path.sep);

  debug('getNamespaceFromPath:', {
    filePath,
    root,
    relativePath,
    parts
  });

  // If file is in root directory, no namespace
  if (parts.length <= 1) {
    return null;
  }

  // Try to read composer.json for PSR-4 configuration
  const psr4Config = getPsr4Config(root);
  
  // Build namespace from path parts (excluding the filename)
  const pathParts = parts.slice(0, -1);
  
  if (psr4Config) {
    // Check PSR-4 mappings
    for (const [namespace, directories] of Object.entries(psr4Config)) {
      for (const dir of directories) {
        // Normalize directory path (remove trailing slash)
        const normalizedDir = dir.replace(/\/$/, '');
        
        // Check if file path starts with this PSR-4 directory
        if (pathParts[0] === normalizedDir || relativePath.startsWith(normalizedDir + path.sep)) {
          // Calculate namespace based on PSR-4 mapping
          const baseParts = normalizedDir.split('/');
          const remainingParts = pathParts.slice(baseParts.length);
          
          if (remainingParts.length > 0) {
            return namespace + '\\' + remainingParts.join('\\');
          }
          return namespace;
        }
      }
    }
  }
  
  // Fallback: use directory structure as namespace
  // First part gets capitalized
  const firstPart = pathParts[0];
  const capitalizedFirst = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  
  // Build namespace parts
  const namespaceParts = [capitalizedFirst, ...pathParts.slice(1)];
  const namespace = namespaceParts.join('\\');
  
  debug('Computed namespace:', namespace);
  
  return namespace || null;
}

/**
 * Get PSR-4 configuration from composer.json
 */
function getPsr4Config(root: string): Record<string, string[]> | null {
  try {
    const composerPath = path.join(root, 'composer.json');
    if (!fsSync.existsSync(composerPath)) {
      return null;
    }
    
    const composerContent = fsSync.readFileSync(composerPath, 'utf-8');
    const composer = JSON.parse(composerContent);
    
    // Combine autoload and autoload-dev PSR-4 configurations
    const psr4 = {
      ...(composer.autoload?.['psr-4'] || {}),
      ...(composer['autoload-dev']?.['psr-4'] || {})
    };
    
    // Convert to a more usable format
    const config: Record<string, string[]> = {};
    for (const [namespace, paths] of Object.entries(psr4)) {
      // Remove trailing backslash from namespace
      const cleanNamespace = namespace.replace(/\\+$/, '');
      // Ensure paths is an array
      const pathArray = Array.isArray(paths) ? paths : [paths];
      config[cleanNamespace] = pathArray as string[];
    }
    
    debug('PSR-4 config:', config);
    
    return config;
  } catch (error) {
    debug('Error reading composer.json:', error);
    return null;
  }
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