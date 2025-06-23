/**
 * PHP Symbol types - representing code elements in PHP
 */

export type SymbolKind = 
  | 'class'
  | 'interface'
  | 'trait'
  | 'function'
  | 'method'
  | 'property'
  | 'constant'
  | 'variable'
  | 'namespace';

export type Visibility = 'public' | 'private' | 'protected';

/**
 * Source location information
 */
export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  offset?: number;
}

/**
 * Represents a PHP symbol (class, function, variable, etc.)
 */
export interface PhpSymbol {
  name: string;
  kind: SymbolKind;
  location: SourceLocation;
  namespace?: string;
  visibility?: Visibility;
  static?: boolean;
  abstract?: boolean;
  final?: boolean;
  parentClass?: string;
  implements?: string[];
  traits?: string[];
  docComment?: string;
}

/**
 * Symbol reference (where a symbol is used)
 */
export interface SymbolReference {
  location: SourceLocation;
  context: string; // Line of code where reference appears
}