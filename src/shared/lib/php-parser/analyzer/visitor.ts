/**
 * AST ビジター パターン
 * 互換性のために残されているレガシー実装
 */

import type * as AST from '../core/ast.js';

/**
 * ビジターインターフェース（レガシー）
 * @deprecated walker.ts の関数型 API を使用してください
 */
export interface NodeVisitor {
  /**
   * ノード訪問前
   */
  enterNode?(node: AST.Node, parent?: AST.Node): AST.Node | null | undefined | false;

  /**
   * ノード訪問後
   */
  leaveNode?(node: AST.Node, parent?: AST.Node): AST.Node | null | undefined;
}

/**
 * ビジター抽象クラス（レガシー）
 * @deprecated walker.ts の walk 関数を使用してください
 */
export abstract class NodeVisitorAbstract implements NodeVisitor {
  enterNode?(node: AST.Node, parent?: AST.Node): AST.Node | null | undefined | false;
  leaveNode?(node: AST.Node, parent?: AST.Node): AST.Node | null | undefined;
}

/**
 * 特定のノードタイプ用ビジター（レガシー）
 * @deprecated walker.ts の findNodes/findFirst を使用してください
 */
export class TypedNodeVisitor extends NodeVisitorAbstract {
  private handlers = new Map<string, (node: AST.Node, parent?: AST.Node) => any>();

  /**
   * ノードタイプごとのハンドラーを登録
   */
  on<T extends AST.Node>(
    type: T['type'],
    handler: (node: T, parent?: AST.Node) => any
  ): this {
    this.handlers.set(type, handler as any);
    return this;
  }

  enterNode(node: AST.Node, parent?: AST.Node): AST.Node | null | undefined | false {
    const handler = this.handlers.get(node.type);
    if (handler) {
      return handler(node, parent);
    }
    return undefined;
  }
}

/**
 * 複数のビジターを合成（レガシー）
 * @deprecated pipe 関数と walker を組み合わせて使用してください
 */
export class CompositeVisitor extends NodeVisitorAbstract {
  private visitors: NodeVisitor[];

  constructor(...visitors: NodeVisitor[]) {
    super();
    this.visitors = visitors;
  }

  enterNode(node: AST.Node, parent?: AST.Node): AST.Node | null | undefined | false {
    for (const visitor of this.visitors) {
      if (visitor.enterNode) {
        const result = visitor.enterNode(node, parent);
        if (result !== undefined) {
          return result;
        }
      }
    }
    return undefined;
  }

  leaveNode(node: AST.Node, parent?: AST.Node): AST.Node | null | undefined {
    for (const visitor of this.visitors) {
      if (visitor.leaveNode) {
        const result = visitor.leaveNode(node, parent);
        if (result !== undefined) {
          return result;
        }
      }
    }
    return undefined;
  }
}

/**
 * 変数収集ビジター（レガシー例）
 * @deprecated 以下のように walker を使用してください:
 * ```typescript
 * const variables = findNodes(ast, (node): node is AST.VariableExpression => 
 *   node.type === 'VariableExpression'
 * );
 * ```
 */
export class VariableCollector extends NodeVisitorAbstract {
  public variables: string[] = [];

  enterNode(node: AST.Node): undefined {
    if (node.type === 'VariableExpression') {
      const varExpr = node as AST.VariableExpression;
      if (typeof varExpr.name === 'string') {
        this.variables.push(varExpr.name);
      }
    }
    return undefined;
  }
}

/**
 * 名前変更ビジター（レガシー例）
 * @deprecated 以下のように transform を使用してください:
 * ```typescript
 * const renamed = transform(ast, (node) => {
 *   if (node.type === 'Identifier' && node.name === oldName) {
 *     return { ...node, name: newName };
 *   }
 *   return node;
 * });
 * ```
 */
export class RenameVisitor extends NodeVisitorAbstract {
  constructor(
    private oldName: string,
    private newName: string
  ) {
    super();
  }

  enterNode(node: AST.Node): AST.Node | undefined {
    if (node.type === 'Identifier' && (node as AST.Identifier).name === this.oldName) {
      return { ...node, name: this.newName };
    }
    if (node.type === 'VariableExpression') {
      const varExpr = node as AST.VariableExpression;
      if (typeof varExpr.name === 'string' && varExpr.name === this.oldName) {
        return { ...node, name: this.newName };
      }
    }
    return undefined;
  }
}

/**
 * ノード削除ビジター（レガシー）
 * @deprecated transform で null を返すことで削除できます
 */
export class RemoveNodeVisitor extends NodeVisitorAbstract {
  constructor(
    private predicate: (node: AST.Node) => boolean
  ) {
    super();
  }

  enterNode(node: AST.Node): AST.Node | null | undefined {
    if (this.predicate(node)) {
      return null;
    }
    return undefined;
  }
}

/**
 * ビジターファクトリー（レガシー）
 * @deprecated 直接関数を使用してください
 */
export const visitors = {
  /**
   * 変数を収集
   */
  collectVariables(): VariableCollector {
    return new VariableCollector();
  },

  /**
   * 識別子をリネーム
   */
  rename(oldName: string, newName: string): RenameVisitor {
    return new RenameVisitor(oldName, newName);
  },

  /**
   * ノードを削除
   */
  remove(predicate: (node: AST.Node) => boolean): RemoveNodeVisitor {
    return new RemoveNodeVisitor(predicate);
  },

  /**
   * カスタムビジターを作成
   */
  create(handlers: {
    enter?: (node: AST.Node, parent?: AST.Node) => any;
    leave?: (node: AST.Node, parent?: AST.Node) => any;
  }): NodeVisitor {
    return {
      enterNode: handlers.enter,
      leaveNode: handlers.leave
    };
  }
};

/**
 * ビジター作成ヘルパー関数
 */
export function createVisitor(handlers: {
  [key: string]: ((node: any, parent?: AST.Node) => any) | {
    enter?: (node: any, parent?: AST.Node) => any;
    leave?: (node: any, parent?: AST.Node) => any;
  };
}): {
  visit: (node: AST.Node | AST.Node[]) => void;
} {
  const enterHandlers = new Map<string, (node: AST.Node, parent?: AST.Node) => any>();
  const leaveHandlers = new Map<string, (node: AST.Node, parent?: AST.Node) => any>();
  const wildcardEnter: ((node: AST.Node, parent?: AST.Node) => any) | undefined = handlers['*'] as any;
  
  for (const [key, handler] of Object.entries(handlers)) {
    if (key === '*' && typeof handler === 'function') {
      continue; // Wildcard is handled separately
    }
    
    if (typeof handler === 'function') {
      enterHandlers.set(key, handler);
    } else if (handler && typeof handler === 'object') {
      if (handler.enter) {
        enterHandlers.set(key, handler.enter);
      }
      if (handler.leave) {
        leaveHandlers.set(key, handler.leave);
      }
    }
  }
  
  const visit = (node: AST.Node | AST.Node[]) => {
    const walkNode = (n: AST.Node, parent?: AST.Node) => {
      // Call wildcard handler if exists
      if (wildcardEnter) {
        wildcardEnter(n, parent);
      }
      
      // Call specific enter handler
      const enterHandler = enterHandlers.get(n.type);
      if (enterHandler) {
        enterHandler(n, parent);
      }
      
      // Walk children
      for (const key in n) {
        const value = (n as any)[key];
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach(item => {
              if (item && typeof item === 'object' && 'type' in item) {
                walkNode(item as AST.Node, n);
              }
            });
          } else if ('type' in value) {
            walkNode(value as AST.Node, n);
          }
        }
      }
      
      // Call specific leave handler
      const leaveHandler = leaveHandlers.get(n.type);
      if (leaveHandler) {
        leaveHandler(n, parent);
      }
    };
    
    if (Array.isArray(node)) {
      node.forEach(n => walkNode(n));
    } else {
      walkNode(node);
    }
  };
  
  return { visit };
}