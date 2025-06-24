export interface FindUnusedRequest {
  root?: string;
  types?: 'all' | UnusedType[];
  includePrivate?: boolean;
  includeProtected?: boolean;
  excludePatterns?: string[];
  entryPoints?: string[];
}

export type UnusedType = 
  | 'variables'
  | 'functions' 
  | 'classes'
  | 'methods'
  | 'properties'
  | 'constants'
  | 'imports';

export interface FindUnusedResult {
  unusedSymbols: UnusedSymbol[];
  totalUnused: number;
  scannedFiles: number;
  byType: Record<UnusedType, number>;
}

export interface UnusedSymbol {
  name: string;
  type: UnusedType;
  visibility?: 'public' | 'private' | 'protected';
  filePath: string;
  line: number;
  column: number;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface SymbolDefinition {
  name: string;
  type: UnusedType;
  visibility?: 'public' | 'private' | 'protected';
  filePath: string;
  line: number;
  column: number;
  className?: string; // For methods and properties
}

export interface SymbolReference {
  name: string;
  type: 'read' | 'write' | 'call' | 'instantiation' | 'import';
  filePath: string;
  line: number;
  column: number;
}