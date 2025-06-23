/**
 * AST Transformation Utilities
 * Provides AST transformation, optimization, and validation
 */

import * as AST from '../core/ast.js';
import { walk, transform, type WalkContext } from './walker.js';

// Re-export transform
export { transform } from './walker.js';

/**
 * Transformation options
 */
export interface TransformOptions {
  /** Remove unused variables */
  removeUnusedVariables?: boolean;
  /** Remove dead code */
  removeDeadCode?: boolean;
  /** Constant folding */
  constantFolding?: boolean;
  /** Inline simple functions */
  inlineSimpleFunctions?: boolean;
  /** Optimization level */
  optimizationLevel?: 0 | 1 | 2 | 3;
}

/**
 * Optimizes AST with specified optimization level
 */
export function optimize(
  ast: AST.Node | AST.Node[],
  options: TransformOptions = {}
): AST.Node | AST.Node[] {
  const level = options.optimizationLevel ?? 1;

  if (level === 0) return ast;

  let result = ast;

  // Level 1: Basic optimizations
  if (level >= 1) {
    if (options.constantFolding !== false) {
      result = constantFolding(result);
    }
    if (options.removeDeadCode !== false) {
      result = removeDeadCode(result);
    }
  }

  // Level 2: Intermediate optimizations
  if (level >= 2) {
    if (options.removeUnusedVariables !== false) {
      result = removeUnusedVariables(result);
    }
  }

  // Level 3: Advanced optimizations
  if (level >= 3) {
    if (options.inlineSimpleFunctions !== false) {
      result = inlineSimpleFunctions(result);
    }
  }

  return result;
}

/**
 * Helper to transform a node or array of nodes
 */
function transformNodeOrArray(
  ast: AST.Node | AST.Node[],
  transformer: (node: AST.Node, context: WalkContext) => AST.Node | null
): AST.Node | AST.Node[] | null {
  if (Array.isArray(ast)) {
    return ast.map(node => transform(node, transformer)).filter((n): n is AST.Node => n !== null);
  }
  return transform(ast, transformer);
}

/**
 * Performs constant folding optimization
 */
export function constantFolding(ast: AST.Node | AST.Node[]): AST.Node | AST.Node[] {
  const transformed = transformNodeOrArray(ast, (node) => {
    if (node.type === 'BinaryExpression') {
      const left = node.left;
      const right = node.right;

      // Calculate numeric literals
      if (left.type === 'NumberLiteral' && right.type === 'NumberLiteral') {
        let value: number;

        switch (node.operator) {
          case '+': value = parseFloat(left.value) + parseFloat(right.value); break;
          case '-': value = parseFloat(left.value) - parseFloat(right.value); break;
          case '*': value = parseFloat(left.value) * parseFloat(right.value); break;
          case '/': value = parseFloat(left.value) / parseFloat(right.value); break;
          case '%': value = parseFloat(left.value) % parseFloat(right.value); break;
          case '**': value = Math.pow(parseFloat(left.value), parseFloat(right.value)); break;
          default: return node;
        }

        return {
          type: 'NumberLiteral',
          value: String(value),
          raw: String(value),
          location: node.location
        } as AST.NumberLiteral;
      }

      // String concatenation
      if (node.operator === '.' &&
        left.type === 'StringLiteral' &&
        right.type === 'StringLiteral') {
        return {
          type: 'StringLiteral',
          value: left.value + right.value,
          location: node.location
        } as AST.StringLiteral;
      }
    }

    return node;
  });

  return transformed || ast;
}

/**
 * Removes dead code from AST
 */
export function removeDeadCode(ast: AST.Node | AST.Node[]): AST.Node | AST.Node[] {
  const transformed = transformNodeOrArray(ast, (node) => {
    // Remove code after return
    if (node.type === 'BlockStatement') {
      const statements = node.statements;
      const returnIndex = statements.findIndex(s =>
        s.type === 'ReturnStatement' ||
        s.type === 'ThrowStatement'
      );

      if (returnIndex !== -1 && returnIndex < statements.length - 1) {
        return {
          ...node,
          statements: statements.slice(0, returnIndex + 1)
        };
      }
    }

    // Remove if statements that are always false
    if (node.type === 'IfStatement') {
      if (node.test.type === 'BooleanLiteral' && !(node.test as AST.BooleanLiteral).value) {
        // Keep only else part
        return node.alternate || null;
      }
      // Keep only then part for always true if statements
      if (node.test.type === 'BooleanLiteral' && (node.test as AST.BooleanLiteral).value) {
        return node.consequent;
      }
    }

    return node;
  });

  return transformed || ast;
}

/**
 * Removes unused variables from AST
 */
export function removeUnusedVariables(ast: AST.Node | AST.Node[]): AST.Node | AST.Node[] {
  // First collect used variables
  const usedVariables = new Set<string>();
  const definedVariables = new Map<string, AST.Node[]>();

  const nodes = Array.isArray(ast) ? ast : [ast];
  nodes.forEach(node => walk(node, (n) => {
    // Variable usage
    if (n.type === 'VariableExpression') {
      const varExpr = n as AST.VariableExpression;
      if (typeof varExpr.name === 'string') {
        usedVariables.add(varExpr.name);
      }
    }

    // Variable definition
    if (n.type === 'ExpressionStatement' &&
      n.expression.type === 'AssignmentExpression' &&
      n.expression.left.type === 'VariableExpression') {
      const varExpr = n.expression.left as AST.VariableExpression;
      if (typeof varExpr.name === 'string') {
        const varName = varExpr.name;
        if (!definedVariables.has(varName)) {
          definedVariables.set(varName, []);
        }
        definedVariables.get(varName)!.push(n);
      }
    }
  }));

  // Remove unused variable definitions
  const transformed = transformNodeOrArray(ast, (node) => {
    if (node.type === 'ExpressionStatement' &&
      node.expression.type === 'AssignmentExpression' &&
      node.expression.left.type === 'VariableExpression') {
      const varExpr = node.expression.left as AST.VariableExpression;
      if (typeof varExpr.name === 'string' && !usedVariables.has(varExpr.name)) {
        return null; // Remove
      }
    }

    return node;
  });

  return transformed || ast;
}

/**
 * Inlines simple functions into their call sites
 */
export function inlineSimpleFunctions(ast: AST.Node | AST.Node[]): AST.Node | AST.Node[] {
  // Collect simple functions
  const simpleFunctions = new Map<string, AST.FunctionDeclaration>();

  const nodes = Array.isArray(ast) ? ast : [ast];
  nodes.forEach(node => walk(node, (n) => {
    if (n.type === 'FunctionDeclaration' &&
      n.body.statements.length === 1 &&
      n.body.statements[0].type === 'ReturnStatement' &&
      n.parameters.length <= 2) {
      simpleFunctions.set((n as AST.FunctionDeclaration).name.name, n as AST.FunctionDeclaration);
    }
  }));

  // Inline function calls
  const transformed = transformNodeOrArray(ast, (node) => {
    if (node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      simpleFunctions.has((node.callee as AST.Identifier).name)) {
      const func = simpleFunctions.get((node.callee as AST.Identifier).name)!;
      const returnStmt = func.body.statements[0] as AST.ReturnStatement;

      if (returnStmt.value && func.parameters.length === node.arguments.length) {
        // Replace parameters with arguments
        const paramMap = new Map<string, AST.Expression>();
        func.parameters.forEach((param, index) => {
          if (param.name.type === 'VariableExpression' && typeof param.name.name === 'string') {
            // Remove $ from parameter name and register in map
            const paramName = param.name.name.substring(1);
            paramMap.set(paramName, node.arguments[index].value);
          }
        });

        // Replace variables in returnStmt.value
        const replaced = transform(returnStmt.value, (n) => {
          if (n.type === 'VariableExpression' && typeof n.name === 'string') {
            // Replace variables matching parameter names with arguments
            const paramName = n.name.substring(1); // Remove $
            if (paramMap.has(paramName)) {
              return paramMap.get(paramName)!;
            }
          }
          return n;
        });

        return replaced;
      }
    }

    return node;
  });

  return transformed || ast;
}

/**
 * Validates AST structure and semantics
 */
export function validate(ast: AST.Node | AST.Node[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const nodes = Array.isArray(ast) ? ast : [ast];
  nodes.forEach(node => walk(node, (n, context) => {
    // Check for undefined variable usage
    if (n.type === 'VariableExpression') {
      const varExpr = n as AST.VariableExpression;
      if (typeof varExpr.name === 'string') {
        // Needs scope analysis (simplified version)
        const isDefined = checkVariableDefined(varExpr.name, context);
        if (!isDefined) {
          warnings.push({
            type: 'undefined-variable',
            message: `Variable '$${varExpr.name}' may not be defined`,
            node: n,
            location: n.location
          });
        }
      }
    }

    // Check for possible infinite loops
    if (n.type === 'WhileStatement' &&
      n.test.type === 'BooleanLiteral' &&
      (n.test as AST.BooleanLiteral).value === true) {
      warnings.push({
        type: 'infinite-loop',
        message: 'Possible infinite loop detected',
        node: n,
        location: n.location
      });
    }

    // Check if break/continue is used outside loops
    if (n.type === 'BreakStatement' || n.type === 'ContinueStatement') {
      const inLoop = isInLoop(context);
      if (!inLoop) {
        errors.push({
          type: 'invalid-break-continue',
          message: `'${n.type === 'BreakStatement' ? 'break' : 'continue'}' not in loop or switch statement`,
          node: n,
          location: n.location
        });
      }
    }
  }));

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Checks if a variable is defined in the current scope
 */
function checkVariableDefined(name: string, context: WalkContext): boolean {
  // PHP superglobal variables
  const superGlobals = ['GLOBALS', '_SERVER', '_GET', '_POST', '_SESSION', '_COOKIE', '_FILES', '_ENV', '_REQUEST'];
  if (superGlobals.includes(name)) return true;

  // $this is always defined inside class/trait
  if (name === 'this') {
    return context.parents.some(p =>
      p.type === 'ClassDeclaration' ||
      p.type === 'TraitDeclaration' ||
      p.type === 'MethodDeclaration'
    );
  }

  // Traverse parent nodes to find variable definitions
  for (let i = context.parents.length - 1; i >= 0; i--) {
    const parent = context.parents[i];

    // Check function parameters
    if (parent.type === 'FunctionDeclaration' || parent.type === 'MethodDeclaration' ||
      parent.type === 'FunctionExpression' || parent.type === 'ArrowFunctionExpression') {
      const params = (parent as any).parameters || [];
      for (const param of params) {
        if (param.type === 'Parameter' && param.name && param.name.type === 'Identifier' && param.name.name === name) {
          return true;
        }
      }
    }

    // Check foreach variables
    if (parent.type === 'ForeachStatement') {
      const foreach = parent as AST.ForeachStatement;
      if (foreach.key && foreach.key.type === 'VariableExpression' &&
        typeof foreach.key.name === 'string' && foreach.key.name === name) {
        return true;
      }
      if (foreach.value && foreach.value.type === 'VariableExpression' &&
        typeof foreach.value.name === 'string' && foreach.value.name === name) {
        return true;
      }
    }

    // Reached global scope
    if (parent.type === 'Program') {
      break;
    }
  }

  // Return false for simplicity (more detailed implementation needs SSA form etc.)
  return false;
}

/**
 * Checks if current context is inside a loop
 */
function isInLoop(context: WalkContext): boolean {
  return context.parents.some(p =>
    p.type === 'WhileStatement' ||
    p.type === 'ForStatement' ||
    p.type === 'ForeachStatement' ||
    p.type === 'DoWhileStatement' ||
    p.type === 'SwitchStatement'
  );
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  type: string;
  message: string;
  node: AST.Node;
  location?: AST.SourceLocation;
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  type: string;
  message: string;
  node: AST.Node;
  location?: AST.SourceLocation;
}

/**
 * Generates source map for transformed AST
 */
export function generateSourceMap(
  _original: AST.Node | AST.Node[],
  _transformed: AST.Node | AST.Node[]
): SourceMap {
  const mappings: SourceMapping[] = [];

  // Collect node location information and generate mappings
  const collectMappings = (node: AST.Node, line: number = 0, column: number = 0): void => {
    if (node.location) {
      mappings.push({
        originalLine: node.location.start.line,
        originalColumn: node.location.start.column,
        generatedLine: line,
        generatedColumn: column
      });
    }

    // Traverse child nodes (simplified implementation)
    Object.values(node).forEach(value => {
      if (value && typeof value === 'object') {
        if ('type' in value && 'location' in value) {
          collectMappings(value as AST.Node, line, column);
        } else if (Array.isArray(value)) {
          value.forEach(item => {
            if (item && typeof item === 'object' && 'type' in item) {
              collectMappings(item as AST.Node, line, column);
            }
          });
        }
      }
    });
  };

  // Collect mappings from transformed AST
  if (Array.isArray(_transformed)) {
    _transformed.forEach(node => collectMappings(node));
  } else {
    collectMappings(_transformed);
  }

  return {
    version: 3,
    sources: ['original.php'],
    mappings: encodeMappings(mappings)
  };
}

/**
 * Source map interface
 */
export interface SourceMap {
  version: number;
  sources: string[];
  mappings: string;
}

/**
 * Source mapping interface
 */
interface SourceMapping {
  originalLine: number;
  originalColumn: number;
  generatedLine: number;
  generatedColumn: number;
}

/**
 * Encodes mappings (simplified version)
 */
function encodeMappings(mappings: SourceMapping[]): string {
  // Simplified VLQ encoding implementation
  const vlqChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  const encodeVLQ = (value: number): string => {
    let encoded = '';
    let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;

    do {
      let digit = vlq & 0x1f;
      vlq >>= 5;
      if (vlq > 0) {
        digit |= 0x20; // Continuation bit
      }
      encoded += vlqChars[digit];
    } while (vlq > 0);

    return encoded;
  };

  // Encode mappings per segment
  let result = '';
  let previousGeneratedLine = 0;
  let previousGeneratedColumn = 0;
  let previousOriginalLine = 0;
  let previousOriginalColumn = 0;

  mappings.forEach((mapping, index) => {
    if (index > 0 && mapping.generatedLine > previousGeneratedLine) {
      // New line
      result += ';'.repeat(mapping.generatedLine - previousGeneratedLine);
      previousGeneratedColumn = 0;
    } else if (index > 0) {
      result += ',';
    }

    // Encode relative values
    result += encodeVLQ(mapping.generatedColumn - previousGeneratedColumn);
    result += encodeVLQ(0); // Source index (assumes single source)
    result += encodeVLQ(mapping.originalLine - previousOriginalLine);
    result += encodeVLQ(mapping.originalColumn - previousOriginalColumn);

    // Update previous values
    previousGeneratedLine = mapping.generatedLine;
    previousGeneratedColumn = mapping.generatedColumn;
    previousOriginalLine = mapping.originalLine;
    previousOriginalColumn = mapping.originalColumn;
  });

  return result;
}

/**
 * Normalizes AST for testing (removes location info)
 */
export function normalize(ast: AST.Node | AST.Node[]): AST.Node | AST.Node[] {
  const transformed = transformNodeOrArray(ast, (node) => {
    // Remove location
    const { location, ...rest } = node as any;
    return rest;
  });

  return transformed || ast;
}

/**
 * Compares two AST nodes for equality
 */
export function isEqual(a: AST.Node, b: AST.Node): boolean {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}

/**
 * Collects statistics about AST structure
 */
export function getStatistics(ast: AST.Node | AST.Node[]): ASTStatistics {
  const stats: ASTStatistics = {
    totalNodes: 0,
    nodeTypes: {},
    maxDepth: 0,
    functions: 0,
    classes: 0,
    variables: new Set()
  };

  const nodes = Array.isArray(ast) ? ast : [ast];
  nodes.forEach(node => walk(node, (n, context) => {
    stats.totalNodes++;
    stats.nodeTypes[n.type] = (stats.nodeTypes[n.type] || 0) + 1;
    stats.maxDepth = Math.max(stats.maxDepth, context.depth);

    if (n.type === 'FunctionDeclaration') stats.functions++;
    if (n.type === 'ClassDeclaration') stats.classes++;
    if (n.type === 'VariableExpression') {
      const varExpr = n as AST.VariableExpression;
      if (typeof varExpr.name === 'string') {
        stats.variables.add(varExpr.name);
      }
    }
  }));

  return stats;
}

export interface ASTStatistics {
  totalNodes: number;
  nodeTypes: Record<string, number>;
  maxDepth: number;
  functions: number;
  classes: number;
  variables: Set<string>;
}

/**
 * Performs asynchronous AST transformation
 */
export async function transformAsync(
  ast: AST.Node | AST.Node[],
  transformer: (node: AST.Node, context: WalkContext) => Promise<AST.Node | null> | AST.Node | null
): Promise<AST.Node | AST.Node[] | null> {
  if (Array.isArray(ast)) {
    const results = await Promise.all(
      ast.map(async node => {
        const result = await transformNodeAsync(node, transformer);
        return result;
      })
    );
    return results.filter((n): n is AST.Node => n !== null);
  }
  return await transformNodeAsync(ast, transformer);
}

/**
 * Transforms node asynchronously (internal implementation)
 */
async function transformNodeAsync(
  node: AST.Node,
  transformer: (node: AST.Node, context: WalkContext) => Promise<AST.Node | null> | AST.Node | null
): Promise<AST.Node | null> {
  const transformed = await transformer(node, {
    parents: [],
    depth: 0,
    userContext: undefined
  });

  if (transformed === null) {
    return null;
  }

  // Recursively transform child nodes
  const transformedChildren = await transformChildrenAsync(transformed, transformer);

  return transformedChildren;
}

/**
 * Transforms child nodes asynchronously (internal implementation)
 */
async function transformChildrenAsync(
  node: AST.Node,
  transformer: (node: AST.Node, context: WalkContext) => Promise<AST.Node | null> | AST.Node | null
): Promise<AST.Node> {
  const transformed: any = { ...node };

  for (const key in transformed) {
    const value = transformed[key];

    if (value && typeof value === 'object') {
      if ('type' in value) {
        // Single node
        const result = await transformNodeAsync(value, transformer);
        transformed[key] = result;
      } else if (Array.isArray(value)) {
        // Array of nodes
        const newArray: any[] = [];
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            const result = await transformNodeAsync(item, transformer);
            if (result !== null) {
              newArray.push(result);
            }
          } else {
            newArray.push(item);
          }
        }
        transformed[key] = newArray;
      }
    }
  }

  return transformed;
}