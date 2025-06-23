import { Result, ok, err } from 'neverthrow';
import path from 'path';
import fs from 'fs/promises';
import { MoveFileRequest, MoveFileResult, UpdatedFile, UpdateInfo } from './types.js';
import { parsePhp } from '../../shared/lib/php-parser/index.js';
import { isOk } from '../../shared/lib/php-parser/utils/result.js';
import { debug } from '../../shared/api/mcp/utils.js';
import { getPhpFiles } from '../../shared/lib/file-utils/index.js';

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
 * Update references to the moved file in other PHP files
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

  for (const filePath of phpFiles) {
    // Skip the moved file itself
    if (filePath === newAbsolutePath) {
      continue;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const updates: UpdateInfo[] = [];
      let updatedContent = content;

      // Update namespace in the moved file
      if (filePath === newAbsolutePath && oldNamespace && newNamespace) {
        const namespaceRegex = new RegExp(
          `^namespace\\s+${escapeRegExp(oldNamespace)}\\s*;`,
          'gm'
        );
        const newNamespaceDecl = `namespace ${newNamespace};`;
        
        if (namespaceRegex.test(updatedContent)) {
          updatedContent = updatedContent.replace(namespaceRegex, newNamespaceDecl);
          updates.push({
            type: 'namespace',
            old: oldNamespace,
            new: newNamespace,
            line: findLineNumber(content, namespaceRegex),
          });
        }
      }

      // Update use statements
      if (oldNamespace && newNamespace) {
        const useRegex = new RegExp(
          `^use\\s+${escapeRegExp(oldNamespace)}\\\\([^;]+);`,
          'gm'
        );
        
        let match;
        while ((match = useRegex.exec(content)) !== null) {
          const oldUse = `${oldNamespace}\\${match[1]}`;
          const newUse = `${newNamespace}\\${match[1]}`;
          const newUseStatement = `use ${newUse};`;
          
          updatedContent = updatedContent.replace(match[0], newUseStatement);
          updates.push({
            type: 'use',
            old: oldUse,
            new: newUse,
            line: findLineNumber(content, match[0]),
          });
        }
      }

      // Update require/include statements
      const requirePatterns = [
        /require\s+['"]([^'"]+)['"]/g,
        /require_once\s+['"]([^'"]+)['"]/g,
        /include\s+['"]([^'"]+)['"]/g,
        /include_once\s+['"]([^'"]+)['"]/g,
      ];

      for (const pattern of requirePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const requiredPath = match[1];
          const absoluteRequiredPath = path.resolve(path.dirname(filePath), requiredPath);
          
          if (absoluteRequiredPath === oldAbsolutePath) {
            const newRelativePath = path.relative(path.dirname(filePath), newAbsolutePath);
            const newRequire = match[0].replace(requiredPath, newRelativePath);
            
            updatedContent = updatedContent.replace(match[0], newRequire);
            updates.push({
              type: match[0].includes('require') ? 'require' : 'include',
              old: requiredPath,
              new: newRelativePath,
              line: findLineNumber(content, match[0]),
            });
          }
        }
      }

      // Write updated content if there were changes
      if (updates.length > 0) {
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