import { Node } from '../core/ast';
import { transform as walkerTransform, WalkContext } from '../analyzer/walker';

type NodeHandler<T extends Node = Node> = (node: T, context: WalkContext) => Node | null;

type TransformHandlers = {
  [K in Node['type']]?: NodeHandler<Extract<Node, { type: K }>>;
};

/**
 * Transform AST with type-specific handlers
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