import { PhpSymbol } from '../../entities/symbol/index.js';

/**
 * Request parameters for get symbols operation
 */
export interface GetSymbolsRequest {
  filePath: string;
  root?: string;
}

/**
 * Result of get symbols operation
 */
export interface GetSymbolsResult {
  filePath: string;
  symbols: SymbolGroup[];
  totalSymbols: number;
}

/**
 * Symbols grouped by type
 */
export interface SymbolGroup {
  type: string;
  symbols: SymbolInfo[];
}

/**
 * Basic symbol information
 */
export interface SymbolInfo {
  name: string;
  line: number;
  column: number;
  parentClass?: string;
  visibility?: string;
  modifiers?: string[];
}