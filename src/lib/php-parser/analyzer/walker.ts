/**
 * AST Walker Module
 * 
 * Provides functional-style AST traversal utilities.
 * 
 * @module walker
 */

import * as AST from '../core/ast.js';

/**
 * ウォーカーの戻り値型
 */
export type WalkResult<T = void> = T | undefined | 'skip' | 'stop';

/**
 * ウォーカー関数の型
 */
export type WalkerFunction<T = void> = (
  node: AST.Node,
  context: WalkContext
) => WalkResult<T>;

/**
 * ウォークコンテキスト
 */
export interface WalkContext {
  /** 親ノードのスタック */
  readonly parents: AST.Node[];
  /** 現在の深さ */
  readonly depth: number;
  /** ユーザー定義のコンテキスト */
  readonly userContext?: any;
}

/**
 * AST を走査
 */
export function walk<T = void>(
  node: AST.Node | AST.Node[],
  walker: WalkerFunction<T>,
  userContext?: any
): T | undefined {
  const context: WalkContext = {
    parents: [],
    depth: 0,
    userContext
  };

  if (Array.isArray(node)) {
    for (const n of node) {
      const result = walkNode(n, walker, context);
      if (result === 'stop') {
        return 'stop' as any;
      }
      if (result !== undefined && result !== 'skip') {
        return result as T;
      }
    }
  } else {
    const result = walkNode(node, walker, context);
    if (result === 'stop') {
      return 'stop' as any;
    }
    if (result !== undefined && result !== 'skip') {
      return result as T;
    }
  }

  return undefined;
}

/**
 * Walks a single node (internal implementation).
 * 
 * @param node - The node to walk
 * @param walker - Walker function to apply
 * @param context - Walk context
 * @returns Walk result (value, 'skip', 'stop', or undefined)
 */
function walkNode<T>(
  node: AST.Node,
  walker: WalkerFunction<T>,
  context: WalkContext
): WalkResult<T> {
  // ウォーカー関数を呼び出す
  const result = walker(node, context);

  // 制御フロー
  if (result === 'skip' || result === 'stop') {
    return result;
  }

  // 値が返された場合は終了
  if (result !== undefined) {
    return result;
  }

  // 子ノードを走査
  const newContext: WalkContext = {
    parents: [...context.parents, node],
    depth: context.depth + 1,
    userContext: context.userContext
  };

  // ノードタイプごとの子ノード走査
  const childResult = walkChildren(node, walker, newContext);
  if (childResult !== undefined) {
    return childResult;
  }

  return undefined;
}

/**
 * Walks child nodes based on node type.
 * 
 * @param node - Parent node whose children to walk
 * @param walker - Walker function to apply
 * @param context - Walk context
 * @returns Walk result from children
 */
function walkChildren<T>(
  node: AST.Node,
  walker: WalkerFunction<T>,
  context: WalkContext
): WalkResult<T> {
  switch (node.type) {
    // Program
    case 'Program':
    case 'PhpProgram':
      return walkArray(node.statements, walker, context);

    // Statements
    case 'ExpressionStatement':
      return walkNode(node.expression, walker, context);

    case 'BlockStatement':
      return walkArray(node.statements, walker, context);

    case 'IfStatement': {
      let result = walkNode(node.test, walker, context);
      if (result) return result;

      result = walkNode(node.consequent, walker, context);
      if (result) return result;

      if (node.elseifs) {
        result = walkArray(node.elseifs, walker, context);
        if (result) return result;
      }

      if (node.alternate) {
        result = walkNode(node.alternate, walker, context);
        if (result) return result;
      }

      return undefined;
    }

    case 'WhileStatement': {
      let result = walkNode(node.test, walker, context);
      if (result) return result;

      return walkNode(node.body, walker, context);
    }

    case 'ForStatement': {
      let result: WalkResult<T>;

      if (node.init) {
        result = walkNode(node.init, walker, context);
        if (result) return result;
      }

      if (node.test) {
        result = walkNode(node.test, walker, context);
        if (result) return result;
      }

      if (node.update) {
        result = walkNode(node.update, walker, context);
        if (result) return result;
      }

      return walkNode(node.body, walker, context);
    }

    case 'ForeachStatement': {
      let result = walkNode(node.expression, walker, context);
      if (result) return result;

      if (node.key) {
        result = walkNode(node.key, walker, context);
        if (result) return result;
      }

      result = walkNode(node.value, walker, context);
      if (result) return result;

      return walkNode(node.body, walker, context);
    }

    case 'ReturnStatement':
      return node.value ? walkNode(node.value, walker, context) : undefined;

    case 'ThrowStatement':
      return walkNode(node.expression, walker, context);

    case 'TryStatement': {
      let result = walkNode(node.block, walker, context);
      if (result) return result;

      result = walkArray(node.handlers, walker, context);
      if (result) return result;

      if (node.finalizer) {
        result = walkNode(node.finalizer, walker, context);
        if (result) return result;
      }

      return undefined;
    }

    // Declarations
    case 'FunctionDeclaration': {
      let result = walkNode(node.name, walker, context);
      if (result) return result;

      result = walkArray(node.parameters, walker, context);
      if (result) return result;

      if (node.returnType) {
        result = walkNode(node.returnType, walker, context);
        if (result) return result;
      }

      return walkNode(node.body, walker, context);
    }

    case 'ClassDeclaration': {
      let result = walkNode(node.name, walker, context);
      if (result) return result;

      if (node.superClass) {
        result = walkNode(node.superClass, walker, context);
        if (result) return result;
      }

      if (node.interfaces) {
        result = walkArray(node.interfaces, walker, context);
        if (result) return result;
      }

      return walkArray(node.body, walker, context);
    }

    // Expressions
    case 'BinaryExpression': {
      let result = walkNode(node.left, walker, context);
      if (result) return result;

      return walkNode(node.right, walker, context);
    }

    case 'UnaryExpression':
      return walkNode(node.argument, walker, context);

    case 'AssignmentExpression': {
      let result = walkNode(node.left, walker, context);
      if (result) return result;

      return walkNode(node.right, walker, context);
    }

    case 'CallExpression': {
      let result = walkNode(node.callee, walker, context);
      if (result) return result;

      return walkArray(node.arguments, walker, context);
    }

    case 'MemberExpression': {
      let result = walkNode(node.object, walker, context);
      if (result) return result;

      return walkNode(node.property, walker, context);
    }

    case 'ArrayExpression':
      return walkArray(node.elements, walker, context);

    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      let result = walkArray(node.parameters, walker, context);
      if (result) return result;

      if (node.returnType) {
        result = walkNode(node.returnType, walker, context);
        if (result) return result;
      }

      return walkNode(node.body, walker, context);
    }

    case 'ConditionalExpression': {
      let result = walkNode(node.test, walker, context);
      if (result) return result;

      if (node.consequent) {
        result = walkNode(node.consequent, walker, context);
        if (result) return result;
      }

      return walkNode(node.alternate, walker, context);
    }

    // Leaf nodes (no children to walk)
    case 'Identifier':
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'VariableExpression':
      return undefined;

    // その他のノードタイプ
    default:
      // 汎用的な子ノード走査
      return walkGenericChildren(node, walker, context);
  }
}

/**
 * Walks an array of nodes.
 * 
 * @param nodes - Array of nodes to walk
 * @param walker - Walker function to apply
 * @param context - Walk context
 * @returns Walk result from array
 */
function walkArray<T>(
  nodes: AST.Node[],
  walker: WalkerFunction<T>,
  context: WalkContext
): WalkResult<T> {
  for (const node of nodes) {
    const result = walkNode(node, walker, context);
    if (result === 'stop') return 'stop';
    if (result !== undefined && result !== 'skip') {
      return result;
    }
  }
  return undefined;
}

/**
 * Generic child node walker for unhandled node types.
 * Recursively walks all properties that contain nodes.
 * 
 * @param node - Node whose children to walk generically
 * @param walker - Walker function to apply
 * @param context - Walk context
 * @returns Walk result from generic traversal
 */
function walkGenericChildren<T>(
  node: AST.Node,
  walker: WalkerFunction<T>,
  context: WalkContext
): WalkResult<T> {
  for (const key in node) {
    const value = (node as any)[key];

    if (value && typeof value === 'object') {
      if ('type' in value) {
        // 単一ノード
        const result = walkNode(value, walker, context);
        if (result !== undefined) return result;
      } else if (Array.isArray(value)) {
        // ノードの配列
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            const result = walkNode(item, walker, context);
            if (result === 'stop') return 'stop';
            if (result !== undefined && result !== 'skip') {
              return result;
            }
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * 特定のノードタイプを検索
 */
export function findNodes<T extends AST.Node>(
  root: AST.Node | AST.Node[],
  predicate: (node: AST.Node) => node is T
): T[] {
  const results: T[] = [];

  walk(root, (node) => {
    if (predicate(node)) {
      results.push(node);
    }
  });

  return results;
}

/**
 * 最初にマッチするノードを検索
 */
export function findFirst<T extends AST.Node>(
  root: AST.Node | AST.Node[],
  predicate: (node: AST.Node) => node is T
): T | undefined {
  return walk(root, (node) => {
    if (predicate(node)) {
      return node;
    }
  });
}

/**
 * ノードを変換
 */
export function transform<T extends AST.Node = AST.Node>(
  node: T,
  transformer: (node: AST.Node, context: WalkContext) => AST.Node | null,
  context: WalkContext = { parents: [], depth: 0, userContext: undefined }
): T | null {
  const transformed = transformer(node, context);

  if (transformed === null) {
    return null;
  }

  // 子ノードを再帰的に変換
  const transformedChildren = transformChildren(transformed, transformer, context);

  return transformedChildren as T;
}

/**
 * Transforms child nodes (internal implementation).
 * Creates a shallow copy with transformed children.
 * 
 * @param node - Node whose children to transform
 * @param transformer - Transformation function
 * @returns Node with transformed children
 */
function transformChildren(
  node: AST.Node,
  transformer: (node: AST.Node, context: WalkContext) => AST.Node | null,
  parentContext: WalkContext
): AST.Node {
  const transformed: any = { ...node };

  for (const key in transformed) {
    const value = transformed[key];

    if (value && typeof value === 'object') {
      if ('type' in value) {
        // 単一ノード
        const childContext: WalkContext = {
          parents: [...parentContext.parents, node],
          depth: parentContext.depth + 1,
          userContext: parentContext.userContext,
          parent: node
        };
        const result = transform(value, transformer, childContext);
        transformed[key] = result;
      } else if (Array.isArray(value)) {
        // ノードの配列
        const newArray: any[] = [];
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            const childContext: WalkContext = {
              parents: [...parentContext.parents, node],
              depth: parentContext.depth + 1,
              userContext: parentContext.userContext,
              parent: node
            };
            const result = transform(item, transformer, childContext);
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

/**
 * ノードタイプチェッカー
 */
export const is = {
  Statement: (node: AST.Node): node is AST.Statement => {
    return node.type.endsWith('Statement') ||
      node.type.endsWith('Declaration');
  },

  Expression: (node: AST.Node): node is AST.Expression => {
    return node.type.endsWith('Expression') ||
      node.type.endsWith('Literal') ||
      node.type === 'Identifier' ||
      node.type === 'VariableExpression' ||
      node.type === 'NameExpression';
  },

  Declaration: (node: AST.Node): node is AST.FunctionDeclaration | AST.ClassDeclaration => {
    return node.type.endsWith('Declaration');
  },

  Literal: (node: AST.Node): node is AST.NumberLiteral | AST.StringLiteral | AST.BooleanLiteral | AST.NullLiteral => {
    return node.type.endsWith('Literal');
  }
};

/**
 * 非同期でASTを走査
 */
export async function walkAsync<T = void>(
  node: AST.Node | AST.Node[],
  walker: (node: AST.Node, context: WalkContext) => Promise<WalkResult<T>> | WalkResult<T>,
  userContext?: any
): Promise<T | undefined> {
  const context: WalkContext = {
    parents: [],
    depth: 0,
    userContext
  };

  if (Array.isArray(node)) {
    for (const n of node) {
      const result = await walkNodeAsync(n, walker, context);
      if (result === 'stop') break;
      if (result !== undefined && result !== 'skip') {
        return result as T;
      }
    }
  } else {
    const result = await walkNodeAsync(node, walker, context);
    if (result !== undefined && result !== 'skip' && result !== 'stop') {
      return result as T;
    }
  }

  return undefined;
}

/**
 * Walks a single node asynchronously (internal implementation).
 * 
 * @param node - The node to walk
 * @param walker - Async walker function to apply
 * @param context - Walk context
 * @returns Promise resolving to walk result
 */
async function walkNodeAsync<T>(
  node: AST.Node,
  walker: (node: AST.Node, context: WalkContext) => Promise<WalkResult<T>> | WalkResult<T>,
  context: WalkContext
): Promise<WalkResult<T>> {
  // ウォーカー関数を呼び出す
  const result = await walker(node, context);

  // 制御フロー
  if (result === 'skip' || result === 'stop') {
    return result;
  }

  // 値が返された場合は終了
  if (result !== undefined) {
    return result;
  }

  // 子ノードを走査
  const newContext: WalkContext = {
    parents: [...context.parents, node],
    depth: context.depth + 1,
    userContext: context.userContext
  };

  // ノードタイプごとの子ノード走査
  const childResult = await walkChildrenAsync(node, walker, newContext);
  if (childResult !== undefined) {
    return childResult;
  }

  return undefined;
}

/**
 * Walks child nodes asynchronously based on node type.
 * 
 * @param node - Parent node whose children to walk
 * @param walker - Async walker function to apply
 * @param context - Walk context
 * @returns Promise resolving to walk result
 */
async function walkChildrenAsync<T>(
  node: AST.Node,
  walker: (node: AST.Node, context: WalkContext) => Promise<WalkResult<T>> | WalkResult<T>,
  context: WalkContext
): Promise<WalkResult<T>> {
  switch (node.type) {
    // Program
    case 'Program':
      return await walkArrayAsync(node.statements, walker, context);

    // Statements
    case 'ExpressionStatement':
      return await walkNodeAsync(node.expression, walker, context);

    case 'BlockStatement':
      return await walkArrayAsync(node.statements, walker, context);

    case 'IfStatement': {
      let result = await walkNodeAsync(node.test, walker, context);
      if (result) return result;

      result = await walkNodeAsync(node.consequent, walker, context);
      if (result) return result;

      if (node.elseifs) {
        result = await walkArrayAsync(node.elseifs, walker, context);
        if (result) return result;
      }

      if (node.alternate) {
        result = await walkNodeAsync(node.alternate, walker, context);
        if (result) return result;
      }

      return undefined;
    }

    case 'WhileStatement': {
      let result = await walkNodeAsync(node.test, walker, context);
      if (result) return result;

      return await walkNodeAsync(node.body, walker, context);
    }

    case 'ForStatement': {
      let result: WalkResult<T>;

      if (node.init) {
        result = await walkNodeAsync(node.init, walker, context);
        if (result) return result;
      }

      if (node.test) {
        result = await walkNodeAsync(node.test, walker, context);
        if (result) return result;
      }

      if (node.update) {
        result = await walkNodeAsync(node.update, walker, context);
        if (result) return result;
      }

      return await walkNodeAsync(node.body, walker, context);
    }

    case 'ForeachStatement': {
      let result = await walkNodeAsync(node.expression, walker, context);
      if (result) return result;

      if (node.key) {
        result = await walkNodeAsync(node.key, walker, context);
        if (result) return result;
      }

      result = await walkNodeAsync(node.value, walker, context);
      if (result) return result;

      return await walkNodeAsync(node.body, walker, context);
    }

    case 'ReturnStatement':
      return node.value ? await walkNodeAsync(node.value, walker, context) : undefined;

    case 'ThrowStatement':
      return await walkNodeAsync(node.expression, walker, context);

    case 'TryStatement': {
      let result = await walkNodeAsync(node.block, walker, context);
      if (result) return result;

      result = await walkArrayAsync(node.handlers, walker, context);
      if (result) return result;

      if (node.finalizer) {
        result = await walkNodeAsync(node.finalizer, walker, context);
        if (result) return result;
      }

      return undefined;
    }

    // Declarations
    case 'FunctionDeclaration': {
      let result = await walkNodeAsync(node.name, walker, context);
      if (result) return result;

      result = await walkArrayAsync(node.parameters, walker, context);
      if (result) return result;

      if (node.returnType) {
        result = await walkNodeAsync(node.returnType, walker, context);
        if (result) return result;
      }

      return await walkNodeAsync(node.body, walker, context);
    }

    case 'ClassDeclaration': {
      let result = await walkNodeAsync(node.name, walker, context);
      if (result) return result;

      if (node.superClass) {
        result = await walkNodeAsync(node.superClass, walker, context);
        if (result) return result;
      }

      if (node.interfaces) {
        result = await walkArrayAsync(node.interfaces, walker, context);
        if (result) return result;
      }

      return await walkArrayAsync(node.body, walker, context);
    }

    // Expressions
    case 'BinaryExpression': {
      let result = await walkNodeAsync(node.left, walker, context);
      if (result) return result;

      return await walkNodeAsync(node.right, walker, context);
    }

    case 'UnaryExpression':
      return await walkNodeAsync(node.argument, walker, context);

    case 'AssignmentExpression': {
      let result = await walkNodeAsync(node.left, walker, context);
      if (result) return result;

      return await walkNodeAsync(node.right, walker, context);
    }

    case 'CallExpression': {
      let result = await walkNodeAsync(node.callee, walker, context);
      if (result) return result;

      return await walkArrayAsync(node.arguments, walker, context);
    }

    case 'MemberExpression': {
      let result = await walkNodeAsync(node.object, walker, context);
      if (result) return result;

      return await walkNodeAsync(node.property, walker, context);
    }

    case 'ArrayExpression':
      return await walkArrayAsync(node.elements, walker, context);

    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      let result = await walkArrayAsync(node.parameters, walker, context);
      if (result) return result;

      if (node.returnType) {
        result = await walkNodeAsync(node.returnType, walker, context);
        if (result) return result;
      }

      return await walkNodeAsync(node.body, walker, context);
    }

    case 'ConditionalExpression': {
      let result = await walkNodeAsync(node.test, walker, context);
      if (result) return result;

      if (node.consequent) {
        result = await walkNodeAsync(node.consequent, walker, context);
        if (result) return result;
      }

      return await walkNodeAsync(node.alternate, walker, context);
    }

    // Leaf nodes (no children to walk)
    case 'Identifier':
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'VariableExpression':
      return undefined;

    // その他のノードタイプ
    default:
      // 汎用的な子ノード走査
      return await walkGenericChildrenAsync(node, walker, context);
  }
}

/**
 * Generic async child node walker for unhandled node types.
 * 
 * @param node - Node whose children to walk generically
 * @param walker - Async walker function to apply
 * @param context - Walk context
 * @returns Promise resolving to walk result
 */
async function walkGenericChildrenAsync<T>(
  node: AST.Node,
  walker: (node: AST.Node, context: WalkContext) => Promise<WalkResult<T>> | WalkResult<T>,
  context: WalkContext
): Promise<WalkResult<T>> {
  for (const key in node) {
    const value = (node as any)[key];

    if (value && typeof value === 'object') {
      if ('type' in value) {
        // 単一ノード
        const result = await walkNodeAsync(value, walker, context);
        if (result !== undefined) return result;
      } else if (Array.isArray(value)) {
        // ノードの配列
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            const result = await walkNodeAsync(item, walker, context);
            if (result === 'stop') return 'stop';
            if (result !== undefined && result !== 'skip') {
              return result;
            }
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Walks an array of nodes asynchronously.
 * 
 * @param nodes - Array of nodes to walk
 * @param walker - Async walker function to apply
 * @param context - Walk context
 * @returns Promise resolving to walk result
 */
async function walkArrayAsync<T>(
  nodes: AST.Node[],
  walker: (node: AST.Node, context: WalkContext) => Promise<WalkResult<T>> | WalkResult<T>,
  context: WalkContext
): Promise<WalkResult<T>> {
  for (const node of nodes) {
    const result = await walkNodeAsync(node, walker, context);
    if (result === 'stop') return 'stop';
    if (result !== undefined && result !== 'skip') {
      return result;
    }
  }
  return undefined;
}