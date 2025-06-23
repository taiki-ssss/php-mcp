import { PhpSymbol, SymbolKind, SourceLocation } from '../../../entities/symbol/index.js';
import { PhpProgram } from '../php-parser/index.js';
import { walk } from '../php-parser/analyzer/walker.js';

/**
 * Extract all symbols from a PHP AST
 */
export function extractSymbols(ast: PhpProgram, filePath: string): PhpSymbol[] {
  const symbols: PhpSymbol[] = [];
  let currentNamespace: string | undefined;
  let currentClass: string | undefined;

  walk(ast, (node, context) => {
    const nodeType = node.type;
    const nodeData = node as any;

    // Track current namespace
    if (nodeType === 'NamespaceDeclaration') {
      currentNamespace = nodeData.name?.name;
      return;
    }

    // Track current class
    if (nodeType === 'ClassDeclaration') {
      currentClass = nodeData.name?.name;
      const symbol: PhpSymbol = {
        name: nodeData.name?.name || 'unknown',
        kind: 'class',
        location: {
          file: filePath,
          line: node.location?.start.line || 0,
          column: node.location?.start.column || 0,
        },
        namespace: currentNamespace,
        abstract: nodeData.modifiers?.includes('abstract'),
        final: nodeData.modifiers?.includes('final'),
      };
      symbols.push(symbol);
      return;
    }

    // Function declarations
    if (nodeType === 'FunctionDeclaration') {
      const symbol: PhpSymbol = {
        name: nodeData.name?.name || 'unknown',
        kind: 'function',
        location: {
          file: filePath,
          line: node.location?.start.line || 0,
          column: node.location?.start.column || 0,
        },
        namespace: currentNamespace,
      };
      symbols.push(symbol);
    }

    // Class methods
    if (nodeType === 'MethodDeclaration' && currentClass) {
      const symbol: PhpSymbol = {
        name: nodeData.name?.name || 'unknown',
        kind: 'method',
        location: {
          file: filePath,
          line: node.location?.start.line || 0,
          column: node.location?.start.column || 0,
        },
        namespace: currentNamespace,
        parentClass: currentClass,
        visibility: nodeData.modifiers?.find((m: string) => ['public', 'private', 'protected'].includes(m)),
        static: nodeData.modifiers?.includes('static'),
        abstract: nodeData.modifiers?.includes('abstract'),
        final: nodeData.modifiers?.includes('final'),
      };
      symbols.push(symbol);
    }

    // Properties
    if (nodeType === 'PropertyDeclaration' && currentClass) {
      const symbol: PhpSymbol = {
        name: nodeData.name?.name || 'unknown',
        kind: 'property',
        location: {
          file: filePath,
          line: node.location?.start.line || 0,
          column: node.location?.start.column || 0,
        },
        namespace: currentNamespace,
        parentClass: currentClass,
        visibility: nodeData.modifiers?.find((m: string) => ['public', 'private', 'protected'].includes(m)),
        static: nodeData.modifiers?.includes('static'),
      };
      symbols.push(symbol);
    }

    // Exit class scope - check if we're leaving a class
    // This is simplified - in a real implementation we'd track scope exit properly
  });

  return symbols;
}

/**
 * Find a symbol at a specific line
 */
export function findSymbolAtLine(
  ast: PhpProgram,
  targetLine: number,
  symbolName: string,
  filePath: string
): PhpSymbol | undefined {
  const symbols = extractSymbols(ast, filePath);
  
  // Find symbols on the target line with matching name
  const candidateSymbols = symbols.filter(symbol => 
    symbol.location.line === targetLine && 
    symbol.name === symbolName
  );

  // Return the first match
  return candidateSymbols[0];
}

/**
 * Find all references to a symbol name
 */
export function findSymbolReferences(
  ast: PhpProgram,
  symbolName: string,
  filePath: string
): SourceLocation[] {
  const references: SourceLocation[] = [];

  walk(ast, (node) => {
    const nodeType = node.type;
    const nodeData = node as any;

    // Check identifiers
    if (nodeType === 'Identifier') {
      if (nodeData.name === symbolName && node.location) {
        references.push({
          file: filePath,
          line: node.location.start.line,
          column: node.location.start.column,
        });
      }
    }

    // Check variable expressions
    if (nodeType === 'VariableExpression') {
      if (nodeData.name === symbolName && node.location) {
        references.push({
          file: filePath,
          line: node.location.start.line,
          column: node.location.start.column,
        });
      }
    }

    // Check member expressions (property/method access)
    if (nodeType === 'MemberExpression') {
      if (nodeData.property?.type === 'Identifier' && nodeData.property?.name === symbolName) {
        if (nodeData.property?.location) {
          references.push({
            file: filePath,
            line: nodeData.property.location.start.line,
            column: nodeData.property.location.start.column,
          });
        }
      }
    }

    // Check call expressions
    if (nodeType === 'CallExpression') {
      if (nodeData.callee?.type === 'Identifier' && nodeData.callee?.name === symbolName) {
        if (nodeData.callee?.location) {
          references.push({
            file: filePath,
            line: nodeData.callee.location.start.line,
            column: nodeData.callee.location.start.column,
          });
        }
      }
    }

    // Check new expressions
    if (nodeType === 'NewExpression') {
      if (nodeData.callee?.type === 'Identifier' && nodeData.callee?.name === symbolName) {
        if (nodeData.callee?.location) {
          references.push({
            file: filePath,
            line: nodeData.callee.location.start.line,
            column: nodeData.callee.location.start.column,
          });
        }
      }
    }
  });

  return references;
}