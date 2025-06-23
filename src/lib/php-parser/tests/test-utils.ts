import { expect } from 'vitest';
import type { Statement, Expression, Node } from '../core/ast';
import { parsePhp, tokenizePhp, isErr, type Result } from '../index';

export function expectTokens(input: string, expectedTypes: string[]): void {
  const result = tokenizePhp(input);
  if (isErr(result)) {
    throw new Error(`Tokenization failed: ${result.error}`);
  }
  
  const tokenTypes = result.value
    .filter(token => token.type !== 'T_WHITESPACE')
    .map(token => token.type);
  
  expect(tokenTypes).toEqual(expectedTypes);
}

export function expectTokenValues(input: string, expectedValues: Array<[string, string]>): void {
  const result = tokenizePhp(input);
  if (isErr(result)) {
    throw new Error(`Tokenization failed: ${result.error}`);
  }
  
  const tokenPairs = result.value
    .filter(token => token.type !== 'T_WHITESPACE')
    .map(token => [token.type, token.value] as [string, string]);
  
  expect(tokenPairs).toEqual(expectedValues);
}

export function expectParseFail(input: string): void {
  const result = parsePhp(input);
  expect(result.success).toBe(false);
}

export function expectParseSuccess(input: string): Statement[] {
  const result = parsePhp(input);
  if (isErr(result)) {
    throw new Error(`Parse failed: ${result.error}`);
  }
  return result.value.statements;
}

export function getFirstStatement(input: string): Statement {
  const statements = expectParseSuccess(input);
  if (statements.length === 0) {
    throw new Error('No statements in AST');
  }
  return statements[0];
}

export function getFirstExpression(input: string): Expression {
  const stmt = getFirstStatement(input);
  if (stmt.type !== 'ExpressionStatement') {
    throw new Error(`Expected ExpressionStatement, got ${stmt.type}`);
  }
  return stmt.expression;
}

export function findNodeByType<T extends Node>(node: Node, type: T['type']): T | null {
  if (node.type === type) {
    return node as T;
  }
  
  for (const key in node) {
    const value = (node as any)[key];
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            const result = findNodeByType<T>(item, type);
            if (result) return result;
          }
        }
      } else if ('type' in value) {
        const result = findNodeByType<T>(value, type);
        if (result) return result;
      }
    }
  }
  
  return null;
}

export const PHP_SNIPPETS = {
  // Basic constructs
  EMPTY: '<?php ?>',
  ECHO: '<?php echo "Hello"; ?>',
  VARIABLE: '<?php $x = 42; ?>',
  FUNCTION: '<?php function foo() { return 42; } ?>',
  CLASS: '<?php class Foo {} ?>',
  
  // Control structures
  IF_STATEMENT: '<?php if ($x > 0) { echo "positive"; } ?>',
  FOR_LOOP: '<?php for ($i = 0; $i < 10; $i++) { echo $i; } ?>',
  WHILE_LOOP: '<?php while ($x > 0) { $x--; } ?>',
  FOREACH: '<?php foreach ($arr as $key => $value) { echo $value; } ?>',
  
  // Modern PHP features
  MATCH_EXPRESSION: '<?php $result = match($x) { 1 => "one", 2 => "two", default => "other" }; ?>',
  ARROW_FUNCTION: '<?php $fn = fn($x) => $x * 2; ?>',
  ENUM: '<?php enum Status { case ACTIVE; case INACTIVE; } ?>',
  READONLY_PROPERTY: '<?php class Foo { public readonly string $bar; } ?>',
  
  // Complex expressions
  TERNARY: '<?php $result = $x > 0 ? "positive" : "negative"; ?>',
  NULL_COALESCING: '<?php $value = $x ?? "default"; ?>',
  NAMESPACE: '<?php namespace App\\Models; class User {} ?>',
  USE_STATEMENT: '<?php use App\\Models\\User; ?>',
  
  // Error cases
  SYNTAX_ERROR: '<?php class { ?>',
  UNCLOSED_STRING: '<?php $x = "unclosed string; ?>',
  INVALID_VARIABLE: '<?php $ = 42; ?>',
};