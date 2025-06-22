"use strict";
/**
 * PHP Parser - モダンな TypeScript 実装
 *
 * @example
 * ```typescript
 * import { parsePhp, tokenizePhp } from '@php-parser';
 *
 * const ast = parsePhp('<?php echo "Hello, World!";');
 * const tokens = tokenizePhp('<?php $x = 1 + 2;');
 * ```
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.is = exports.transform = exports.findFirst = exports.findNodes = exports.walk = exports.DeclarationParser = exports.StatementParser = exports.ExpressionParser = exports.ParserBase = exports.ParseError = exports.parse = exports.Parser = exports.StringInterpolationTokenizer = exports.LexerStateManager = exports.LexerState = exports.tokenize = exports.Tokenizer = exports.CharUtils = exports.Scanner = void 0;
exports.tokenizePhp = tokenizePhp;
exports.parsePhp = parsePhp;
exports.pipe = pipe;
exports.pipeAsync = pipeAsync;
exports.tryPipe = tryPipe;
exports.partial = partial;
exports.memoize = memoize;
exports.tap = tap;
exports.when = when;
// Core exports
__exportStar(require("./core/ast.js"), exports);
__exportStar(require("./core/token.js"), exports);
__exportStar(require("./core/location.js"), exports);
// Lexer exports
var scanner_js_1 = require("./lexer/scanner.js");
Object.defineProperty(exports, "Scanner", { enumerable: true, get: function () { return scanner_js_1.Scanner; } });
Object.defineProperty(exports, "CharUtils", { enumerable: true, get: function () { return scanner_js_1.CharUtils; } });
var tokenizer_js_1 = require("./lexer/tokenizer.js");
Object.defineProperty(exports, "Tokenizer", { enumerable: true, get: function () { return tokenizer_js_1.Tokenizer; } });
Object.defineProperty(exports, "tokenize", { enumerable: true, get: function () { return tokenizer_js_1.tokenize; } });
var state_js_1 = require("./lexer/state.js");
Object.defineProperty(exports, "LexerState", { enumerable: true, get: function () { return state_js_1.LexerState; } });
Object.defineProperty(exports, "LexerStateManager", { enumerable: true, get: function () { return state_js_1.LexerStateManager; } });
Object.defineProperty(exports, "StringInterpolationTokenizer", { enumerable: true, get: function () { return state_js_1.StringInterpolationTokenizer; } });
// Parser exports
var parser_js_1 = require("./parser/parser.js");
Object.defineProperty(exports, "Parser", { enumerable: true, get: function () { return parser_js_1.Parser; } });
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parser_js_1.parse; } });
Object.defineProperty(exports, "ParseError", { enumerable: true, get: function () { return parser_js_1.ParseError; } });
var base_js_1 = require("./parser/base.js");
Object.defineProperty(exports, "ParserBase", { enumerable: true, get: function () { return base_js_1.ParserBase; } });
var expression_js_1 = require("./parser/expression.js");
Object.defineProperty(exports, "ExpressionParser", { enumerable: true, get: function () { return expression_js_1.ExpressionParser; } });
var statement_js_1 = require("./parser/statement.js");
Object.defineProperty(exports, "StatementParser", { enumerable: true, get: function () { return statement_js_1.StatementParser; } });
var declaration_js_1 = require("./parser/declaration.js");
Object.defineProperty(exports, "DeclarationParser", { enumerable: true, get: function () { return declaration_js_1.DeclarationParser; } });
// Analyzer exports
var walker_js_1 = require("./analyzer/walker.js");
Object.defineProperty(exports, "walk", { enumerable: true, get: function () { return walker_js_1.walk; } });
Object.defineProperty(exports, "findNodes", { enumerable: true, get: function () { return walker_js_1.findNodes; } });
Object.defineProperty(exports, "findFirst", { enumerable: true, get: function () { return walker_js_1.findFirst; } });
Object.defineProperty(exports, "transform", { enumerable: true, get: function () { return walker_js_1.transform; } });
Object.defineProperty(exports, "is", { enumerable: true, get: function () { return walker_js_1.is; } });
// Analyzer utilities
__exportStar(require("./analyzer/visitor.js"), exports);
__exportStar(require("./analyzer/transformer.js"), exports);
const tokenizer_js_2 = require("./lexer/tokenizer.js");
const parser_js_2 = require("./parser/parser.js");
/**
 * PHP コードをトークン化
 *
 * @example
 * ```typescript
 * const tokens = tokenizePhp('<?php echo "Hello";');
 * ```
 */
function tokenizePhp(source, options) {
    return (0, tokenizer_js_2.tokenize)(source, options);
}
/**
 * PHP コードをパース
 *
 * @example
 * ```typescript
 * const ast = parsePhp('<?php function hello() { echo "Hi"; }');
 * ```
 */
function parsePhp(source, options) {
    const tokens = (0, tokenizer_js_2.tokenize)(source, options);
    const program = (0, parser_js_2.parse)(tokens, options);
    return program.statements;
}
function pipe(...fns) {
    return (value) => fns.reduce((acc, fn) => fn(acc), value);
}
function pipeAsync(...fns) {
    return async (value) => {
        let result = value;
        for (const fn of fns) {
            result = await fn(result);
        }
        return result;
    };
}
/**
 * エラーハンドリング付きパイプライン
 *
 * @example
 * ```typescript
 * const safeParsePhp = tryPipe(
 *   tokenizePhp,
 *   (tokens) => parse(tokens),
 *   (error) => {
 *     console.error('Parse error:', error);
 *     return [];
 *   }
 * );
 * ```
 */
function tryPipe(pipeline, errorHandler) {
    return (input) => {
        try {
            return pipeline(input);
        }
        catch (error) {
            return errorHandler(error);
        }
    };
}
/**
 * 部分適用ヘルパー
 *
 * @example
 * ```typescript
 * const parseWithOptions = partial(parsePhp, { phpVersion: '8.0' });
 * const ast = parseWithOptions(phpCode);
 * ```
 */
function partial(fn, ...partialArgs) {
    return (...remainingArgs) => {
        const args = [...partialArgs, ...remainingArgs];
        return fn(...args);
    };
}
/**
 * メモ化ヘルパー
 *
 * @example
 * ```typescript
 * const memoizedParse = memoize(parsePhp);
 * const ast1 = memoizedParse(code); // パース実行
 * const ast2 = memoizedParse(code); // キャッシュから取得
 * ```
 */
function memoize(fn, keyGenerator) {
    const cache = new Map();
    return ((...args) => {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    });
}
/**
 * デバッグヘルパー
 *
 * @example
 * ```typescript
 * const debugPipeline = pipe(
 *   tokenizePhp,
 *   tap(tokens => console.log('Tokens:', tokens.length)),
 *   (tokens) => parse(tokens),
 *   tap(ast => console.log('AST nodes:', ast.length))
 * );
 * ```
 */
function tap(sideEffect) {
    return (value) => {
        sideEffect(value);
        return value;
    };
}
/**
 * 条件付き変換
 *
 * @example
 * ```typescript
 * const transform = when(
 *   (node) => node.type === 'Identifier',
 *   (node) => ({ ...node, name: node.name.toUpperCase() })
 * );
 * ```
 */
function when(predicate, transformer) {
    return (value) => {
        return predicate(value) ? transformer(value) : value;
    };
}
