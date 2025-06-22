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

// Core exports
export * from './core/ast.js';
export * from './core/token.js';
export * from './core/location.js';

// Lexer exports
export { Scanner, CharUtils } from './lexer/scanner.js';
export { Tokenizer, tokenize, type TokenizerOptions } from './lexer/tokenizer.js';
export { LexerState, LexerStateManager, StringInterpolationTokenizer } from './lexer/state.js';

// Parser exports
export { Parser, parse, ParseError, type ParserOptions } from './parser/parser.js';
export { ParserBase } from './parser/base.js';
export { ExpressionParser } from './parser/expression.js';
export { StatementParser } from './parser/statement.js';
export { DeclarationParser } from './parser/declaration.js';

// Analyzer exports
export { walk, findNodes, findFirst, transform, is, type WalkResult, type WalkerFunction, type WalkContext } from './analyzer/walker.js';

// Analyzer utilities
export * from './analyzer/visitor.js';
export * from './analyzer/transformer.js';

import { tokenize, type TokenizerOptions } from './lexer/tokenizer.js';
import { parse, type ParserOptions } from './parser/parser.js';
import type { Statement } from './core/ast.js';
import type { Token } from './core/token.js';

/**
 * PHP コードをトークン化
 * 
 * @example
 * ```typescript
 * const tokens = tokenizePhp('<?php echo "Hello";');
 * ```
 */
export function tokenizePhp(
  source: string,
  options?: TokenizerOptions
): Token[] {
  return tokenize(source, options);
}

/**
 * PHP コードをパース
 * 
 * @example
 * ```typescript
 * const ast = parsePhp('<?php function hello() { echo "Hi"; }');
 * ```
 */
export function parsePhp(
  source: string,
  options?: ParserOptions & TokenizerOptions
): Statement[] {
  const tokens = tokenize(source, options);
  const program = parse(tokens, options);
  return program.statements;
}

/**
 * パイプライン関数を作成
 * 
 * @example
 * ```typescript
 * const transform = pipe(
 *   tokenizePhp,
 *   (tokens) => tokens.filter(t => t.kind !== TokenKind.Whitespace),
 *   (tokens) => parse(tokens),
 *   (ast) => walk(ast, visitor)
 * );
 * 
 * const result = transform(phpCode);
 * ```
 */
export function pipe<A, B>(
  fn1: (a: A) => B
): (a: A) => B;
export function pipe<A, B, C>(
  fn1: (a: A) => B,
  fn2: (b: B) => C
): (a: A) => C;
export function pipe<A, B, C, D>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D
): (a: A) => D;
export function pipe<A, B, C, D, E>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E
): (a: A) => E;
export function pipe<A, B, C, D, E, F>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E,
  fn5: (e: E) => F
): (a: A) => F;
export function pipe(...fns: Function[]): Function {
  return (value: any) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * 非同期パイプライン関数を作成
 * 
 * @example
 * ```typescript
 * const processPhp = pipeAsync(
 *   readFile,
 *   tokenizePhp,
 *   (tokens) => parse(tokens),
 *   async (ast) => {
 *     // 非同期処理
 *     return transformedAst;
 *   }
 * );
 * 
 * const result = await processPhp('file.php');
 * ```
 */
export function pipeAsync<A, B>(
  fn1: (a: A) => B | Promise<B>
): (a: A) => Promise<B>;
export function pipeAsync<A, B, C>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>
): (a: A) => Promise<C>;
export function pipeAsync<A, B, C, D>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>,
  fn3: (c: C) => D | Promise<D>
): (a: A) => Promise<D>;
export function pipeAsync<A, B, C, D, E>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>,
  fn3: (c: C) => D | Promise<D>,
  fn4: (d: D) => E | Promise<E>
): (a: A) => Promise<E>;
export function pipeAsync(...fns: Function[]): (value: any) => Promise<any> {
  return async (value: any) => {
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
export function tryPipe<T, R>(
  pipeline: (input: T) => R,
  errorHandler: (error: unknown) => R
): (input: T) => R {
  return (input: T) => {
    try {
      return pipeline(input);
    } catch (error) {
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
export function partial<T extends any[], R>(
  fn: (...args: T) => R,
  ...partialArgs: Partial<T>
): (...remainingArgs: T) => R {
  return (...remainingArgs: T) => {
    const args = [...partialArgs, ...remainingArgs] as T;
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
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
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
export function tap<T>(
  sideEffect: (value: T) => void
): (value: T) => T {
  return (value: T) => {
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
export function when<T>(
  predicate: (value: T) => boolean,
  transformer: (value: T) => T
): (value: T) => T {
  return (value: T) => {
    return predicate(value) ? transformer(value) : value;
  };
}