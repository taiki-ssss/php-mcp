"use strict";
/**
 * AST ウォーカー
 * 関数型プログラミングスタイルの AST 走査
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.is = void 0;
exports.walk = walk;
exports.findNodes = findNodes;
exports.findFirst = findFirst;
exports.transform = transform;
/**
 * AST を走査
 */
function walk(node, walker, userContext) {
    const context = {
        parents: [],
        depth: 0,
        userContext
    };
    if (Array.isArray(node)) {
        for (const n of node) {
            const result = walkNode(n, walker, context);
            if (result === 'stop')
                break;
            if (result !== undefined && result !== 'skip') {
                return result;
            }
        }
    }
    else {
        const result = walkNode(node, walker, context);
        if (result !== undefined && result !== 'skip' && result !== 'stop') {
            return result;
        }
    }
    return undefined;
}
/**
 * ノードを走査（内部実装）
 */
function walkNode(node, walker, context) {
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
    const newContext = {
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
 * 子ノードを走査
 */
function walkChildren(node, walker, context) {
    switch (node.type) {
        // Program
        case 'Program':
            return walkArray(node.statements, walker, context);
        // Statements
        case 'ExpressionStatement':
            return walkNode(node.expression, walker, context);
        case 'BlockStatement':
            return walkArray(node.statements, walker, context);
        case 'IfStatement': {
            let result = walkNode(node.condition, walker, context);
            if (result)
                return result;
            result = walkNode(node.then, walker, context);
            if (result)
                return result;
            if (node.elseIfs) {
                result = walkArray(node.elseIfs, walker, context);
                if (result)
                    return result;
            }
            if (node.else) {
                result = walkNode(node.else, walker, context);
                if (result)
                    return result;
            }
            return undefined;
        }
        case 'WhileStatement': {
            let result = walkNode(node.condition, walker, context);
            if (result)
                return result;
            return walkNode(node.body, walker, context);
        }
        case 'ForStatement': {
            let result;
            if (node.init) {
                result = walkArray(node.init, walker, context);
                if (result)
                    return result;
            }
            if (node.condition) {
                result = walkNode(node.condition, walker, context);
                if (result)
                    return result;
            }
            if (node.update) {
                result = walkArray(node.update, walker, context);
                if (result)
                    return result;
            }
            return walkNode(node.body, walker, context);
        }
        case 'ForeachStatement': {
            let result = walkNode(node.iterable, walker, context);
            if (result)
                return result;
            if (node.key) {
                result = walkNode(node.key, walker, context);
                if (result)
                    return result;
            }
            result = walkNode(node.value, walker, context);
            if (result)
                return result;
            return walkNode(node.body, walker, context);
        }
        case 'ReturnStatement':
            return node.argument ? walkNode(node.argument, walker, context) : undefined;
        case 'ThrowStatement':
            return walkNode(node.argument, walker, context);
        case 'TryStatement': {
            let result = walkNode(node.block, walker, context);
            if (result)
                return result;
            result = walkArray(node.handlers, walker, context);
            if (result)
                return result;
            if (node.finalizer) {
                result = walkNode(node.finalizer, walker, context);
                if (result)
                    return result;
            }
            return undefined;
        }
        // Declarations
        case 'FunctionDeclaration': {
            let result = walkNode(node.name, walker, context);
            if (result)
                return result;
            result = walkArray(node.parameters, walker, context);
            if (result)
                return result;
            if (node.returnType) {
                result = walkNode(node.returnType, walker, context);
                if (result)
                    return result;
            }
            return walkNode(node.body, walker, context);
        }
        case 'ClassDeclaration': {
            let result = walkNode(node.name, walker, context);
            if (result)
                return result;
            if (node.superClass) {
                result = walkNode(node.superClass, walker, context);
                if (result)
                    return result;
            }
            if (node.interfaces) {
                result = walkArray(node.interfaces, walker, context);
                if (result)
                    return result;
            }
            return walkArray(node.body, walker, context);
        }
        // Expressions
        case 'BinaryExpression': {
            let result = walkNode(node.left, walker, context);
            if (result)
                return result;
            return walkNode(node.right, walker, context);
        }
        case 'UnaryExpression':
            return walkNode(node.argument, walker, context);
        case 'AssignmentExpression': {
            let result = walkNode(node.left, walker, context);
            if (result)
                return result;
            return walkNode(node.right, walker, context);
        }
        case 'CallExpression': {
            let result = walkNode(node.callee, walker, context);
            if (result)
                return result;
            return walkArray(node.arguments, walker, context);
        }
        case 'MemberExpression': {
            let result = walkNode(node.object, walker, context);
            if (result)
                return result;
            return walkNode(node.property, walker, context);
        }
        case 'ArrayExpression':
            return walkArray(node.elements, walker, context);
        case 'FunctionExpression':
        case 'ArrowFunctionExpression': {
            let result = walkArray(node.parameters, walker, context);
            if (result)
                return result;
            if (node.returnType) {
                result = walkNode(node.returnType, walker, context);
                if (result)
                    return result;
            }
            return walkNode(node.body, walker, context);
        }
        case 'ConditionalExpression': {
            let result = walkNode(node.test, walker, context);
            if (result)
                return result;
            if (node.consequent) {
                result = walkNode(node.consequent, walker, context);
                if (result)
                    return result;
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
 * 配列を走査
 */
function walkArray(nodes, walker, context) {
    for (const node of nodes) {
        const result = walkNode(node, walker, context);
        if (result === 'stop')
            return 'stop';
        if (result !== undefined && result !== 'skip') {
            return result;
        }
    }
    return undefined;
}
/**
 * 汎用的な子ノード走査
 */
function walkGenericChildren(node, walker, context) {
    for (const key in node) {
        const value = node[key];
        if (value && typeof value === 'object') {
            if ('type' in value) {
                // 単一ノード
                const result = walkNode(value, walker, context);
                if (result !== undefined)
                    return result;
            }
            else if (Array.isArray(value)) {
                // ノードの配列
                for (const item of value) {
                    if (item && typeof item === 'object' && 'type' in item) {
                        const result = walkNode(item, walker, context);
                        if (result === 'stop')
                            return 'stop';
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
function findNodes(root, predicate) {
    const results = [];
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
function findFirst(root, predicate) {
    return walk(root, (node) => {
        if (predicate(node)) {
            return node;
        }
    });
}
/**
 * ノードを変換
 */
function transform(node, transformer) {
    const transformed = transformer(node, {
        parents: [],
        depth: 0,
        userContext: undefined
    });
    if (transformed === null) {
        return null;
    }
    // 子ノードを再帰的に変換
    const transformedChildren = transformChildren(transformed, transformer);
    return transformedChildren;
}
/**
 * 子ノードを変換（内部実装）
 */
function transformChildren(node, transformer) {
    const transformed = { ...node };
    for (const key in transformed) {
        const value = transformed[key];
        if (value && typeof value === 'object') {
            if ('type' in value) {
                // 単一ノード
                const result = transform(value, transformer);
                transformed[key] = result;
            }
            else if (Array.isArray(value)) {
                // ノードの配列
                const newArray = [];
                for (const item of value) {
                    if (item && typeof item === 'object' && 'type' in item) {
                        const result = transform(item, transformer);
                        if (result !== null) {
                            newArray.push(result);
                        }
                    }
                    else {
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
exports.is = {
    Statement: (node) => {
        return node.type.endsWith('Statement') ||
            node.type.endsWith('Declaration');
    },
    Expression: (node) => {
        return node.type.endsWith('Expression') ||
            node.type.endsWith('Literal') ||
            node.type === 'Identifier' ||
            node.type === 'VariableExpression' ||
            node.type === 'NameExpression';
    },
    Declaration: (node) => {
        return node.type.endsWith('Declaration');
    },
    Literal: (node) => {
        return node.type.endsWith('Literal');
    }
};
