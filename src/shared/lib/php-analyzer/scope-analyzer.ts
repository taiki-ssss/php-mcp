import { PhpProgram } from '../php-parser/index.js';
import { walk } from '../php-parser/analyzer/walker.js';

/**
 * Represents a scope in PHP code
 */
export interface Scope {
  type: 'global' | 'class' | 'function' | 'method' | 'namespace';
  name?: string;
  parent?: Scope;
  variables: Set<string>;
  imports: Map<string, string>; // alias -> full name
}

/**
 * Build scope information for an AST
 */
export function analyzeScopes(ast: PhpProgram): Scope {
  const globalScope: Scope = {
    type: 'global',
    variables: new Set(),
    imports: new Map(),
  };

  let currentScope = globalScope;

  walk(ast, (node, context) => {
    const nodeType = node.type;
    const nodeData = node as any;

    // Enter new scope
    if (nodeType === 'ClassDeclaration') {
      const classScope: Scope = {
        type: 'class',
        name: nodeData.name?.name || 'unknown',
        parent: currentScope,
        variables: new Set(),
        imports: new Map(currentScope.imports), // Inherit imports
      };
      currentScope = classScope;
    }

    if (nodeType === 'FunctionDeclaration') {
      const functionScope: Scope = {
        type: 'function',
        name: nodeData.name?.name || 'unknown',
        parent: currentScope,
        variables: new Set(),
        imports: new Map(currentScope.imports), // Inherit imports
      };
      currentScope = functionScope;
    }

    if (nodeType === 'MethodDeclaration') {
      const methodScope: Scope = {
        type: 'method',
        name: nodeData.name?.name || 'unknown',
        parent: currentScope,
        variables: new Set(['this']), // $this is always available in methods
        imports: new Map(currentScope.imports), // Inherit imports
      };
      currentScope = methodScope;
    }

    // Track variables
    if (nodeType === 'VariableExpression' || nodeType === 'AssignmentExpression') {
      if (nodeData.left?.type === 'VariableExpression') {
        currentScope.variables.add(nodeData.left.name);
      } else if (nodeData.name && nodeType === 'VariableExpression') {
        currentScope.variables.add(nodeData.name);
      }
    }

    // Track use statements
    if (nodeType === 'UseStatement') {
      if (nodeData.uses && Array.isArray(nodeData.uses)) {
        for (const use of nodeData.uses) {
          const fullName = use.name?.name || '';
          const alias = use.alias?.name || fullName.split('\\').pop() || '';
          currentScope.imports.set(alias, fullName);
        }
      }
    }

    // Exit scope - simplified approach
    // Track when we exit a scope-creating node
    if (context.parents.length > 0) {
      const parent = context.parents[context.parents.length - 1];
      const parentType = parent.type;
      if ((parentType === 'ClassDeclaration' || 
           parentType === 'FunctionDeclaration' || 
           parentType === 'MethodDeclaration') && 
          currentScope.parent) {
        // Check if we're leaving the scope
        const parentData = parent as any;
        if (currentScope.name === parentData.name?.name) {
          currentScope = currentScope.parent;
        }
      }
    }
  });

  return globalScope;
}

/**
 * Find the scope at a specific position
 */
export function findScopeAtPosition(
  ast: PhpProgram,
  line: number,
  column: number
): Scope | undefined {
  const globalScope = analyzeScopes(ast);
  let foundScope: Scope | undefined;

  walk(ast, (node, context) => {
    if (node.location && 
        node.location.start.line <= line && 
        node.location.end.line >= line) {
      
      // More specific check for column if on the same line
      if (node.location.start.line === line && node.location.start.column > column) {
        return;
      }
      if (node.location.end.line === line && node.location.end.column < column) {
        return;
      }

      const nodeType = node.type;
      // This node contains the position, check if it creates a scope
      if (nodeType === 'ClassDeclaration' || 
          nodeType === 'FunctionDeclaration' || 
          nodeType === 'MethodDeclaration') {
        // Find the corresponding scope
        let scope: Scope | undefined = globalScope;
        const scopePath: string[] = [];

        // Build scope path from parent nodes
        for (const parent of context.parents) {
          const parentType = parent.type;
          if (parentType === 'ClassDeclaration' || 
              parentType === 'FunctionDeclaration' || 
              parentType === 'MethodDeclaration') {
            const parentData = parent as any;
            if (parentData.name?.name) {
              scopePath.push(parentData.name.name);
            }
          }
        }

        // Navigate to the scope
        for (const name of scopePath) {
          // Find child scope with matching name
          // Note: This is simplified - a full implementation would track child scopes
        }

        foundScope = scope;
      }
    }
  });

  return foundScope || globalScope;
}

/**
 * Check if a variable is defined in the current scope
 */
export function isVariableInScope(
  scope: Scope,
  variableName: string
): boolean {
  let current: Scope | undefined = scope;
  
  while (current) {
    if (current.variables.has(variableName)) {
      return true;
    }
    current = current.parent;
  }
  
  return false;
}

/**
 * Resolve an imported class name
 */
export function resolveImport(
  scope: Scope,
  alias: string
): string | undefined {
  let current: Scope | undefined = scope;
  
  while (current) {
    if (current.imports.has(alias)) {
      return current.imports.get(alias);
    }
    current = current.parent;
  }
  
  return undefined;
}