import fs from 'fs/promises';
import path from 'path';
import { PhpProject } from '../../../entities/project/index.js';
import { debug } from '../../api/mcp/utils.js';

/**
 * Default patterns to exclude from scanning
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  'vendor',
  'node_modules',
  '.git',
  '.svn',
  'cache',
  'tmp',
  'temp',
  'build',
  'dist',
  'coverage',
];

/**
 * Check if a path should be excluded
 */
function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  const parts = filePath.split(path.sep);
  return excludePatterns.some(pattern => parts.includes(pattern));
}

/**
 * Recursively find all PHP files in a directory
 */
async function findPhpFiles(
  dir: string,
  excludePatterns: string[] = DEFAULT_EXCLUDE_PATTERNS
): Promise<string[]> {
  const phpFiles: string[] = [];

  async function scanDir(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dir, fullPath);

        if (shouldExclude(relativePath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.php')) {
          phpFiles.push(fullPath);
        }
      }
    } catch (error) {
      debug(`Error scanning directory ${currentDir}:`, error);
    }
  }

  await scanDir(dir);
  return phpFiles;
}

/**
 * Load composer.json if it exists
 */
async function loadComposerJson(projectRoot: string): Promise<any | undefined> {
  const composerPath = path.join(projectRoot, 'composer.json');
  try {
    const content = await fs.readFile(composerPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

/**
 * Scan a PHP project and gather information
 */
export async function scanProject(
  projectRoot: string,
  excludePaths?: string[]
): Promise<PhpProject> {
  debug('Scanning project:', projectRoot);

  // Load composer.json
  const composerJson = await loadComposerJson(projectRoot);

  // Find all PHP files
  const allExcludePatterns = [...DEFAULT_EXCLUDE_PATTERNS, ...(excludePaths || [])];
  const files = await findPhpFiles(projectRoot, allExcludePatterns);

  debug(`Found ${files.length} PHP files`);

  return {
    rootPath: projectRoot,
    composerJson,
    files,
    excludePaths: allExcludePatterns,
  };
}

/**
 * Get PSR-4 namespace for a file path based on composer.json
 */
export function getNamespaceForPath(
  filePath: string,
  project: PhpProject
): string | undefined {
  if (!project.composerJson?.autoload?.['psr-4']) {
    return undefined;
  }

  const relativePath = path.relative(project.rootPath, filePath);
  const psr4 = project.composerJson.autoload['psr-4'];

  for (const [namespace, paths] of Object.entries(psr4)) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    
    for (const basePath of pathArray) {
      if (relativePath.startsWith(basePath)) {
        const subPath = relativePath.slice(basePath.length);
        const parts = path.dirname(subPath).split(path.sep).filter(p => p);
        
        if (parts.length === 0) {
          return namespace.replace(/\\$/, '');
        }
        
        return namespace + parts.join('\\');
      }
    }
  }

  return undefined;
}

/**
 * Calculate the new namespace when a file is moved
 */
export function calculateNewNamespace(
  oldPath: string,
  newPath: string,
  project: PhpProject
): string | undefined {
  // Create a temporary project with the new path
  const tempProject = {
    ...project,
    rootPath: project.rootPath,
  };

  return getNamespaceForPath(newPath, tempProject);
}