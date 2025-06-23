import { glob } from 'glob';
import path from 'path';

/**
 * Get all PHP files in a directory recursively
 */
export async function getPhpFiles(root: string): Promise<string[]> {
  const pattern = path.join(root, '**/*.php');
  const files = await glob(pattern, {
    absolute: true,
    ignore: ['**/vendor/**', '**/node_modules/**'],
  });
  return files;
}

/**
 * Check if a file is a PHP file
 */
export function isPhpFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.php';
}