import { SourceLocation } from '../../entities/symbol/index.js';

/**
 * Request parameters for find references operation
 */
export interface FindReferencesRequest {
  filePath: string;
  line: number | string;
  symbolName: string;
  root?: string;
}

/**
 * Result of find references operation
 */
export interface FindReferencesResult {
  symbol: string;
  references: FileReferences[];
  totalReferences: number;
}

/**
 * References grouped by file
 */
export interface FileReferences {
  path: string;
  references: Reference[];
}

/**
 * Individual reference
 */
export interface Reference {
  line: number;
  column: number;
  context: string; // Line of code containing the reference
}