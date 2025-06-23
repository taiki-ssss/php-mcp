import { describe, expect, test } from 'vitest';
import { expectParseSuccess, expectParseFail, getFirstStatement } from './test-utils';

describe('Parser - Function Declarations', () => {
  test('should parse simple function', () => {
    const stmt = getFirstStatement('<?php function foo() {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.name.name).toBe('foo');
      expect(stmt.parameters).toHaveLength(0);
      expect(stmt.body.type).toBe('BlockStatement');
    }
  });

  test('should parse function with parameters', () => {
    const stmt = getFirstStatement('<?php function foo($a, $b, $c) {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.parameters).toHaveLength(3);
      expect(stmt.parameters[0].name.name).toBe('a');
      expect(stmt.parameters[1].name.name).toBe('b');
      expect(stmt.parameters[2].name.name).toBe('c');
    }
  });

  test('should parse function with typed parameters', () => {
    const stmt = getFirstStatement('<?php function foo(string $a, int $b, ?array $c) {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.parameters).toHaveLength(3);
      
      const [p1, p2, p3] = stmt.parameters;
      
      expect(p1.typeAnnotation?.type).toBe('SimpleType');
      if (p1.typeAnnotation?.type === 'SimpleType') {
        expect(p1.typeAnnotation.name).toBe('string');
      }
      
      expect(p2.typeAnnotation?.type).toBe('SimpleType');
      if (p2.typeAnnotation?.type === 'SimpleType') {
        expect(p2.typeAnnotation.name).toBe('int');
      }
      
      expect(p3.typeAnnotation?.type).toBe('NullableType');
      if (p3.typeAnnotation?.type === 'NullableType') {
        expect(p3.typeAnnotation.type).toBe('NullableType');
      }
    }
  });

  test('should parse function with return type', () => {
    const stmt = getFirstStatement('<?php function foo(): string {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.returnType?.type).toBe('SimpleType');
      if (stmt.returnType?.type === 'SimpleType') {
        expect(stmt.returnType.name).toBe('string');
      }
    }
  });

  test('should parse function with nullable return type', () => {
    const stmt = getFirstStatement('<?php function foo(): ?string {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.returnType?.type).toBe('NullableType');
    }
  });

  test('should parse function with union return type', () => {
    const stmt = getFirstStatement('<?php function foo(): int|string {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.returnType?.type).toBe('UnionType');
      if (stmt.returnType?.type === 'UnionType') {
        expect(stmt.returnType.types).toHaveLength(2);
      }
    }
  });

  test('should parse function with default parameter values', () => {
    const stmt = getFirstStatement('<?php function foo($a = 10, $b = "hello", $c = null) {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.parameters).toHaveLength(3);
      
      expect(stmt.parameters[0].defaultValue?.type).toBe('NumberLiteral');
      expect(stmt.parameters[1].defaultValue?.type).toBe('StringLiteral');
      expect(stmt.parameters[2].defaultValue?.type).toBe('NullLiteral');
    }
  });

  test('should parse function with reference parameters', () => {
    const stmt = getFirstStatement('<?php function foo(&$a, $b, &$c) {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.parameters[0].byReference).toBe(true);
      expect(stmt.parameters[1].byReference).toBe(false);
      expect(stmt.parameters[2].byReference).toBe(true);
    }
  });

  test('should parse function with variadic parameter', () => {
    const stmt = getFirstStatement('<?php function foo($a, ...$rest) {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.parameters).toHaveLength(2);
      expect(stmt.parameters[0].variadic).toBe(false);
      expect(stmt.parameters[1].variadic).toBe(true);
      expect(stmt.parameters[1].name.name).toBe('rest');
    }
  });

  test('should parse function by reference', () => {
    const stmt = getFirstStatement('<?php function &foo() {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.byReference).toBe(true);
    }
  });
});