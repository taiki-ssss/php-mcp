"use strict";
/**
 * AST 変換ユーティリティ
 * AST の変換・最適化・検証
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimize = optimize;
exports.constantFolding = constantFolding;
exports.removeDeadCode = removeDeadCode;
exports.removeUnusedVariables = removeUnusedVariables;
exports.inlineSimpleFunctions = inlineSimpleFunctions;
exports.validate = validate;
exports.generateSourceMap = generateSourceMap;
exports.normalize = normalize;
exports.isEqual = isEqual;
exports.getStatistics = getStatistics;
const walker_js_1 = require("./walker.js");
/**
 * AST を最適化
 */
function optimize(ast, options = {}) {
    const level = options.optimizationLevel ?? 1;
    if (level === 0)
        return ast;
    let result = ast;
    // レベル 1: 基本的な最適化
    if (level >= 1) {
        if (options.constantFolding !== false) {
            result = constantFolding(result);
        }
        if (options.removeDeadCode !== false) {
            result = removeDeadCode(result);
        }
    }
    // レベル 2: 中級最適化
    if (level >= 2) {
        if (options.removeUnusedVariables !== false) {
            result = removeUnusedVariables(result);
        }
    }
    // レベル 3: 高度な最適化
    if (level >= 3) {
        if (options.inlineSimpleFunctions !== false) {
            result = inlineSimpleFunctions(result);
        }
    }
    return result;
}
/**
 * ノードまたはノード配列を変換するヘルパー
 */
function transformNodeOrArray(ast, transformer) {
    if (Array.isArray(ast)) {
        return ast.map(node => (0, walker_js_1.transform)(node, transformer)).filter((n) => n !== null);
    }
    return (0, walker_js_1.transform)(ast, transformer);
}
/**
 * 定数畳み込み
 */
function constantFolding(ast) {
    const transformed = transformNodeOrArray(ast, (node) => {
        if (node.type === 'BinaryExpression') {
            const left = node.left;
            const right = node.right;
            // 数値リテラルの計算
            if (left.type === 'NumberLiteral' && right.type === 'NumberLiteral') {
                let value;
                switch (node.operator) {
                    case '+':
                        value = left.value + right.value;
                        break;
                    case '-':
                        value = left.value - right.value;
                        break;
                    case '*':
                        value = left.value * right.value;
                        break;
                    case '/':
                        value = left.value / right.value;
                        break;
                    case '%':
                        value = left.value % right.value;
                        break;
                    case '**':
                        value = Math.pow(left.value, right.value);
                        break;
                    default: return node;
                }
                return {
                    type: 'NumberLiteral',
                    value,
                    location: node.location
                };
            }
            // 文字列結合
            if (node.operator === '.' &&
                left.type === 'StringLiteral' &&
                right.type === 'StringLiteral') {
                return {
                    type: 'StringLiteral',
                    value: left.value + right.value,
                    location: node.location
                };
            }
        }
        return node;
    });
    return transformed || ast;
}
/**
 * デッドコード削除
 */
function removeDeadCode(ast) {
    const transformed = transformNodeOrArray(ast, (node) => {
        // return 後のコードを削除
        if (node.type === 'BlockStatement') {
            const statements = node.statements;
            const returnIndex = statements.findIndex(s => s.type === 'ReturnStatement' ||
                s.type === 'ThrowStatement');
            if (returnIndex !== -1 && returnIndex < statements.length - 1) {
                return {
                    ...node,
                    statements: statements.slice(0, returnIndex + 1)
                };
            }
        }
        // 常に false の if 文を削除
        if (node.type === 'IfStatement') {
            if (node.condition.type === 'BooleanLiteral' && !node.condition.value) {
                // else 部分のみ残す
                return node.else || null;
            }
            // 常に true の if 文は then 部分のみ残す
            if (node.condition.type === 'BooleanLiteral' && node.condition.value) {
                return node.then;
            }
        }
        return node;
    });
    return transformed || ast;
}
/**
 * 未使用変数を削除
 */
function removeUnusedVariables(ast) {
    // まず使用されている変数を収集
    const usedVariables = new Set();
    const definedVariables = new Map();
    const nodes = Array.isArray(ast) ? ast : [ast];
    nodes.forEach(node => (0, walker_js_1.walk)(node, (n) => {
        // 変数の使用
        if (n.type === 'VariableExpression') {
            const varExpr = n;
            if (typeof varExpr.name === 'string') {
                usedVariables.add(varExpr.name);
            }
        }
        // 変数の定義
        if (n.type === 'ExpressionStatement' &&
            n.expression.type === 'AssignmentExpression' &&
            n.expression.left.type === 'VariableExpression') {
            const varExpr = n.expression.left;
            if (typeof varExpr.name === 'string') {
                const varName = varExpr.name;
                if (!definedVariables.has(varName)) {
                    definedVariables.set(varName, []);
                }
                definedVariables.get(varName).push(n);
            }
        }
    }));
    // 未使用の変数定義を削除
    const transformed = transformNodeOrArray(ast, (node) => {
        if (node.type === 'ExpressionStatement' &&
            node.expression.type === 'AssignmentExpression' &&
            node.expression.left.type === 'VariableExpression') {
            const varExpr = node.expression.left;
            if (typeof varExpr.name === 'string' && !usedVariables.has(varExpr.name)) {
                return null; // 削除
            }
        }
        return node;
    });
    return transformed || ast;
}
/**
 * シンプルな関数をインライン展開
 */
function inlineSimpleFunctions(ast) {
    // シンプルな関数を収集
    const simpleFunctions = new Map();
    const nodes = Array.isArray(ast) ? ast : [ast];
    nodes.forEach(node => (0, walker_js_1.walk)(node, (n) => {
        if (n.type === 'FunctionDeclaration' &&
            n.body.statements.length === 1 &&
            n.body.statements[0].type === 'ReturnStatement' &&
            n.parameters.length <= 2) {
            simpleFunctions.set(n.name.name, n);
        }
    }));
    // 関数呼び出しをインライン展開
    const transformed = transformNodeOrArray(ast, (node) => {
        if (node.type === 'CallExpression' &&
            node.callee.type === 'Identifier' &&
            simpleFunctions.has(node.callee.name)) {
            const func = simpleFunctions.get(node.callee.name);
            const returnStmt = func.body.statements[0];
            if (returnStmt.argument && func.parameters.length === node.arguments.length) {
                // パラメータを引数で置換
                const paramMap = new Map();
                func.parameters.forEach((param, index) => {
                    if (param.name.type === 'VariableExpression' && typeof param.name.name === 'string') {
                        // パラメータ名から $ を除去してマップに登録
                        const paramName = param.name.name.substring(1);
                        paramMap.set(paramName, node.arguments[index].value);
                    }
                });
                // returnStmt.argument 内の変数を置換
                const replaced = (0, walker_js_1.transform)(returnStmt.argument, (n) => {
                    if (n.type === 'VariableExpression' && typeof n.name === 'string') {
                        // パラメータ名と一致する変数を引数で置換
                        const paramName = n.name.substring(1); // $ を除去
                        if (paramMap.has(paramName)) {
                            return paramMap.get(paramName);
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
 * AST 検証
 */
function validate(ast) {
    const errors = [];
    const warnings = [];
    const nodes = Array.isArray(ast) ? ast : [ast];
    nodes.forEach(node => (0, walker_js_1.walk)(node, (n, context) => {
        // 未定義変数の使用をチェック
        if (n.type === 'VariableExpression') {
            const varExpr = n;
            if (typeof varExpr.name === 'string') {
                // スコープ解析が必要（簡易版）
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
        // 無限ループの可能性をチェック
        if (n.type === 'WhileStatement' &&
            n.condition.type === 'BooleanLiteral' &&
            n.condition.value === true) {
            warnings.push({
                type: 'infinite-loop',
                message: 'Possible infinite loop detected',
                node: n,
                location: n.location
            });
        }
        // break/continue がループ外で使用されていないかチェック
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
 * 変数が定義されているかチェック
 */
function checkVariableDefined(name, context) {
    // PHPのスーパーグローバル変数
    const superGlobals = ['GLOBALS', '_SERVER', '_GET', '_POST', '_SESSION', '_COOKIE', '_FILES', '_ENV', '_REQUEST'];
    if (superGlobals.includes(name))
        return true;
    // $this は class/trait 内で常に定義されている
    if (name === 'this') {
        return context.parents.some(p => p.type === 'ClassDeclaration' ||
            p.type === 'TraitDeclaration' ||
            p.type === 'MethodDeclaration');
    }
    // 親ノードを遡って変数定義を探す
    for (let i = context.parents.length - 1; i >= 0; i--) {
        const parent = context.parents[i];
        // 関数パラメータをチェック
        if (parent.type === 'FunctionDeclaration' || parent.type === 'MethodDeclaration' ||
            parent.type === 'FunctionExpression' || parent.type === 'ArrowFunctionExpression') {
            const params = parent.parameters || [];
            for (const param of params) {
                if (param.type === 'Parameter' && param.name && param.name.type === 'Identifier' && param.name.name === name) {
                    return true;
                }
            }
        }
        // foreach の変数をチェック
        if (parent.type === 'ForeachStatement') {
            const foreach = parent;
            if (foreach.key && foreach.key.type === 'VariableExpression' &&
                typeof foreach.key.name === 'string' && foreach.key.name === name) {
                return true;
            }
            if (foreach.value && foreach.value.type === 'VariableExpression' &&
                typeof foreach.value.name === 'string' && foreach.value.name === name) {
                return true;
            }
        }
        // グローバルスコープに到達
        if (parent.type === 'Program') {
            break;
        }
    }
    // 簡易的にfalseを返す（より詳細な実装にはSSA形式などが必要）
    return false;
}
/**
 * ループ内にいるかチェック
 */
function isInLoop(context) {
    return context.parents.some(p => p.type === 'WhileStatement' ||
        p.type === 'ForStatement' ||
        p.type === 'ForeachStatement' ||
        p.type === 'DoWhileStatement' ||
        p.type === 'SwitchStatement');
}
/**
 * ソースマップを生成
 */
function generateSourceMap(_original, _transformed) {
    const mappings = [];
    // ノードの位置情報を収集してマッピングを生成
    const collectMappings = (node, line = 0, column = 0) => {
        if (node.location) {
            mappings.push({
                originalLine: node.location.start.line,
                originalColumn: node.location.start.column,
                generatedLine: line,
                generatedColumn: column
            });
        }
        // 子ノードを走査（簡易実装）
        Object.values(node).forEach(value => {
            if (value && typeof value === 'object') {
                if ('type' in value && 'location' in value) {
                    collectMappings(value, line, column);
                }
                else if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (item && typeof item === 'object' && 'type' in item) {
                            collectMappings(item, line, column);
                        }
                    });
                }
            }
        });
    };
    // 変換後のASTからマッピングを収集
    if (Array.isArray(_transformed)) {
        _transformed.forEach(node => collectMappings(node));
    }
    else {
        collectMappings(_transformed);
    }
    return {
        version: 3,
        sources: ['original.php'],
        mappings: encodeMappings(mappings)
    };
}
/**
 * マッピングをエンコード（簡易版）
 */
function encodeMappings(mappings) {
    // 簡易的なVLQエンコーディング実装
    const vlqChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const encodeVLQ = (value) => {
        let encoded = '';
        let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
        do {
            let digit = vlq & 0x1f;
            vlq >>= 5;
            if (vlq > 0) {
                digit |= 0x20; // 続きがあることを示すビット
            }
            encoded += vlqChars[digit];
        } while (vlq > 0);
        return encoded;
    };
    // マッピングをセグメントごとにエンコード
    let result = '';
    let previousGeneratedLine = 0;
    let previousGeneratedColumn = 0;
    let previousOriginalLine = 0;
    let previousOriginalColumn = 0;
    mappings.forEach((mapping, index) => {
        if (index > 0 && mapping.generatedLine > previousGeneratedLine) {
            // 新しい行
            result += ';'.repeat(mapping.generatedLine - previousGeneratedLine);
            previousGeneratedColumn = 0;
        }
        else if (index > 0) {
            result += ',';
        }
        // 相対値をエンコード
        result += encodeVLQ(mapping.generatedColumn - previousGeneratedColumn);
        result += encodeVLQ(0); // ソースインデックス（単一ソース前提）
        result += encodeVLQ(mapping.originalLine - previousOriginalLine);
        result += encodeVLQ(mapping.originalColumn - previousOriginalColumn);
        // 前の値を更新
        previousGeneratedLine = mapping.generatedLine;
        previousGeneratedColumn = mapping.generatedColumn;
        previousOriginalLine = mapping.originalLine;
        previousOriginalColumn = mapping.originalColumn;
    });
    return result;
}
/**
 * AST を正規化（テスト用）
 */
function normalize(ast) {
    const transformed = transformNodeOrArray(ast, (node) => {
        // location を削除
        const { location, ...rest } = node;
        return rest;
    });
    return transformed || ast;
}
/**
 * AST を比較
 */
function isEqual(a, b) {
    const normalizedA = normalize(a);
    const normalizedB = normalize(b);
    return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}
/**
 * AST の統計情報
 */
function getStatistics(ast) {
    const stats = {
        totalNodes: 0,
        nodeTypes: {},
        maxDepth: 0,
        functions: 0,
        classes: 0,
        variables: new Set()
    };
    const nodes = Array.isArray(ast) ? ast : [ast];
    nodes.forEach(node => (0, walker_js_1.walk)(node, (n, context) => {
        stats.totalNodes++;
        stats.nodeTypes[n.type] = (stats.nodeTypes[n.type] || 0) + 1;
        stats.maxDepth = Math.max(stats.maxDepth, context.depth);
        if (n.type === 'FunctionDeclaration')
            stats.functions++;
        if (n.type === 'ClassDeclaration')
            stats.classes++;
        if (n.type === 'VariableExpression') {
            const varExpr = n;
            if (typeof varExpr.name === 'string') {
                stats.variables.add(varExpr.name);
            }
        }
    }));
    return stats;
}
