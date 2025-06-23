import { SourceLocation } from '../../entities/symbol/index.js';

/**
 * Request parameters for rename symbol operation
 */
export interface RenameSymbolRequest {
  filePath: string;
  line: number | string;
  oldName: string;
  newName: string;
  root?: string;
}

/**
 * Result of rename symbol operation
 */
export interface RenameSymbolResult {
  message: string;
  changedFiles: ChangedFile[];
  totalChanges: number;
}

/**
 * Represents changes made to a file
 */
export interface ChangedFile {
  path: string;
  changes: Change[];
}

/**
 * Individual change in a file
 */
export interface Change {
  line: number;
  column: number;
  oldText: string;
  newText: string;
}