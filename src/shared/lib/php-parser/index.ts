/**
 * PHP Parser - Modern TypeScript Implementation
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
export { walk, walkAsync, findNodes, findFirst, is, type WalkResult, type WalkerFunction, type WalkContext } from './analyzer/walker.js';
export * from './analyzer/visitor.js';
export * from './analyzer/transformer.js';

// Utils exports
export { Result, ok, err, isOk, isErr } from './utils/result.js';

import { tokenize, type TokenizerOptions } from './lexer/tokenizer.js';
import { parse, type ParserOptions } from './parser/parser.js';
import type { Program, PhpProgram } from './core/ast.js';
import type { Token } from './core/token.js';
import { Result, ok, err } from './utils/result.js';

/**
 * Tokenize PHP code
 * 
 * @example
 * ```typescript
 * const tokens = tokenizePhp('<?php echo "Hello";');
 * ```
 */
export function tokenizePhp(
  source: string,
  options?: TokenizerOptions
): Result<Token[]> {
  try {
    const tokens = tokenize(source, options);
    return ok(tokens);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Parse PHP code
 * 
 * @example
 * ```typescript
 * const ast = parsePhp('<?php function hello() { echo "Hi"; }');
 * ```
 */
export function parsePhp(
  source: string,
  options?: ParserOptions & TokenizerOptions
): Result<PhpProgram> {
  try {
    const tokens = tokenize(source, options);
    // Filter out whitespace and newline tokens before parsing
    const nonWhitespaceTokens = tokens.filter(t =>
      t.kind !== 'Whitespace' && t.kind !== 'Newline'
    );
    const program = parse(nonWhitespaceTokens, options);
    return ok(program);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Create a pipeline function
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
 * Create an async pipeline function
 * 
 * @example
 * ```typescript
 * const processPhp = pipeAsync(
 *   readFile,
 *   tokenizePhp,
 *   (tokens) => parse(tokens),
 *   async (ast) => {
 *     // Async processing
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
 * Pipeline with error handling
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
export function tryPipe<A, B>(
  fn1: (a: A) => B
): (a: A) => Result<B>;
export function tryPipe<A, B, C>(
  fn1: (a: A) => B,
  fn2: (b: B) => C
): (a: A) => Result<C>;
export function tryPipe<A, B, C, D>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D
): (a: A) => Result<D>;
export function tryPipe(...fns: Function[]): Function {
  return (value: any): Result<any> => {
    try {
      const result = fns.reduce((acc, fn) => fn(acc), value);
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error.message : String(error));
    }
  };
}

/**
 * Partial application helper
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
 * Memoization helper
 * 
 * @example
 * ```typescript
 * const memoizedParse = memoize(parsePhp);
 * const ast1 = memoizedParse(code); // Parse executed
 * const ast2 = memoizedParse(code); // Retrieved from cache
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
 * Debug helper
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
 * Conditional transformation
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