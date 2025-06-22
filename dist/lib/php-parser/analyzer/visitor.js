"use strict";
/**
 * AST ビジター パターン
 * 互換性のために残されているレガシー実装
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitors = exports.RemoveNodeVisitor = exports.RenameVisitor = exports.VariableCollector = exports.CompositeVisitor = exports.TypedNodeVisitor = exports.NodeVisitorAbstract = void 0;
/**
 * ビジター抽象クラス（レガシー）
 * @deprecated walker.ts の walk 関数を使用してください
 */
class NodeVisitorAbstract {
}
exports.NodeVisitorAbstract = NodeVisitorAbstract;
/**
 * 特定のノードタイプ用ビジター（レガシー）
 * @deprecated walker.ts の findNodes/findFirst を使用してください
 */
class TypedNodeVisitor extends NodeVisitorAbstract {
    handlers = new Map();
    /**
     * ノードタイプごとのハンドラーを登録
     */
    on(type, handler) {
        this.handlers.set(type, handler);
        return this;
    }
    enterNode(node, parent) {
        const handler = this.handlers.get(node.type);
        if (handler) {
            return handler(node, parent);
        }
        return undefined;
    }
}
exports.TypedNodeVisitor = TypedNodeVisitor;
/**
 * 複数のビジターを合成（レガシー）
 * @deprecated pipe 関数と walker を組み合わせて使用してください
 */
class CompositeVisitor extends NodeVisitorAbstract {
    visitors;
    constructor(...visitors) {
        super();
        this.visitors = visitors;
    }
    enterNode(node, parent) {
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
    leaveNode(node, parent) {
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
exports.CompositeVisitor = CompositeVisitor;
/**
 * 変数収集ビジター（レガシー例）
 * @deprecated 以下のように walker を使用してください:
 * ```typescript
 * const variables = findNodes(ast, (node): node is AST.VariableExpression =>
 *   node.type === 'VariableExpression'
 * );
 * ```
 */
class VariableCollector extends NodeVisitorAbstract {
    variables = [];
    enterNode(node) {
        if (node.type === 'VariableExpression') {
            const varExpr = node;
            if (typeof varExpr.name === 'string') {
                this.variables.push(varExpr.name);
            }
        }
        return undefined;
    }
}
exports.VariableCollector = VariableCollector;
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
class RenameVisitor extends NodeVisitorAbstract {
    oldName;
    newName;
    constructor(oldName, newName) {
        super();
        this.oldName = oldName;
        this.newName = newName;
    }
    enterNode(node) {
        if (node.type === 'Identifier' && node.name === this.oldName) {
            return { ...node, name: this.newName };
        }
        if (node.type === 'VariableExpression') {
            const varExpr = node;
            if (typeof varExpr.name === 'string' && varExpr.name === this.oldName) {
                return { ...node, name: this.newName };
            }
        }
        return undefined;
    }
}
exports.RenameVisitor = RenameVisitor;
/**
 * ノード削除ビジター（レガシー）
 * @deprecated transform で null を返すことで削除できます
 */
class RemoveNodeVisitor extends NodeVisitorAbstract {
    predicate;
    constructor(predicate) {
        super();
        this.predicate = predicate;
    }
    enterNode(node) {
        if (this.predicate(node)) {
            return null;
        }
        return undefined;
    }
}
exports.RemoveNodeVisitor = RemoveNodeVisitor;
/**
 * ビジターファクトリー（レガシー）
 * @deprecated 直接関数を使用してください
 */
exports.visitors = {
    /**
     * 変数を収集
     */
    collectVariables() {
        return new VariableCollector();
    },
    /**
     * 識別子をリネーム
     */
    rename(oldName, newName) {
        return new RenameVisitor(oldName, newName);
    },
    /**
     * ノードを削除
     */
    remove(predicate) {
        return new RemoveNodeVisitor(predicate);
    },
    /**
     * カスタムビジターを作成
     */
    create(handlers) {
        return {
            enterNode: handlers.enter,
            leaveNode: handlers.leave
        };
    }
};
