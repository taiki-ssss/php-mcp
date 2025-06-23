/**
 * AST Helper Utilities
 * 
 * Provides utility functions for working with PHP AST nodes.
 * 
 * @module ast-helpers
 */

import { Node } from '../core/ast';
import { transform as walkerTransform, WalkContext } from '../analyzer/walker';

/**
 * Handler function type for transforming specific node types.
 * 
 * @template T - The specific node type being handled
 * @param node - The AST node to transform
 * @param context - The walker context containing parent and ancestors
 * @returns The transformed node or null to remove it
 */
type NodeHandler<T extends Node = Node> = (node: T, context: WalkContext) => Node | null;

/**
 * Type-safe mapping of node types to their handlers.
 * 
 * Allows specifying handlers for specific AST node types.
 */
type TransformHandlers = {
  [K in Node['type']]?: NodeHandler<Extract<Node, { type: K }>>;
};

/**
 * Transforms an AST using type-specific handlers.
 * 
 * This function provides a type-safe way to transform AST nodes
 * by specifying handlers for specific node types. Each handler
 * receives the node and context and can return a transformed node
 * or null to remove it.
 * 
 * @example
 * ```typescript
 * const transformed = transform(ast, {
 *   VariableExpression: (node) => ({
 *     ...node,
 *     name: node.name.toUpperCase()
 *   }),
 *   IfStatement: (node, context) => {
 *     // Remove if statements in certain contexts
 *     return context.parent?.type === 'BlockStatement' ? null : node;
 *   }
 * });
 * ```
 * 
 * @param node - The root AST node to transform
 * @param handlers - Object mapping node types to handler functions
 * @returns The transformed AST or null if the root was removed
 */
export function transform(
  node: Node,
  handlers: TransformHandlers
): Node | null {
  return walkerTransform(node, (n, context) => {
    const handler = handlers[n.type];
    if (handler) {
      return handler(n as any, context);
    }
    return n;
  });
}