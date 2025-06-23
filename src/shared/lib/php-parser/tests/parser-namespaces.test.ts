import { describe, expect, test } from 'vitest';
import { expectParseSuccess, expectParseFail, getFirstStatement } from './test-utils';

describe('Parser - Namespace Declarations', () => {
  test('should parse simple namespace', () => {
    const stmt = getFirstStatement('<?php namespace Foo; ?>');
    expect(stmt.type).toBe('NamespaceDeclaration');
    if (stmt.type === 'NamespaceDeclaration') {
      expect(stmt.name?.parts).toEqual(['Foo']);
    }
  });

  test('should parse nested namespace', () => {
    const stmt = getFirstStatement('<?php namespace Foo\\Bar\\Baz; ?>');
    expect(stmt.type).toBe('NamespaceDeclaration');
    if (stmt.type === 'NamespaceDeclaration') {
      expect(stmt.name?.parts).toEqual(['Foo', 'Bar', 'Baz']);
    }
  });

  test('should parse namespace with block', () => {
    const statements = expectParseSuccess('<?php namespace Foo { class Bar {} } ?>');
    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('NamespaceDeclaration');
    if (statements[0].type === 'NamespaceDeclaration') {
      expect(statements[0].statements).toHaveLength(1);
      expect(statements[0].statements[0].type).toBe('ClassDeclaration');
    }
  });

  test('should parse global namespace', () => {
    const statements = expectParseSuccess('<?php namespace { class Bar {} } ?>');
    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('NamespaceDeclaration');
    if (statements[0].type === 'NamespaceDeclaration') {
      expect(statements[0].name).toBeUndefined();
      expect(statements[0].statements).toHaveLength(1);
    }
  });

  test('should parse multiple namespaces', () => {
    const statements = expectParseSuccess('<?php namespace Foo {} namespace Bar {} ?>');
    expect(statements).toHaveLength(2);
    expect(statements[0].type).toBe('NamespaceDeclaration');
    expect(statements[1].type).toBe('NamespaceDeclaration');
    if (statements[0].type === 'NamespaceDeclaration' && statements[1].type === 'NamespaceDeclaration') {
      expect(statements[0].name?.parts).toEqual(['Foo']);
      expect(statements[1].name?.parts).toEqual(['Bar']);
    }
  });
});

describe('Parser - Use Declarations', () => {
  test('should parse simple use', () => {
    const stmt = getFirstStatement('<?php use Foo; ?>');
    expect(stmt.type).toBe('UseStatement');
    if (stmt.type === 'UseStatement') {
      expect(stmt.items).toHaveLength(1);
      expect(stmt.items[0].name.parts).toEqual(['Foo']);
      expect(stmt.items[0].alias).toBeUndefined();
    }
  });

  test('should parse use with alias', () => {
    const stmt = getFirstStatement('<?php use Foo as Bar; ?>');
    expect(stmt.type).toBe('UseStatement');
    if (stmt.type === 'UseStatement') {
      expect(stmt.items).toHaveLength(1);
      expect(stmt.items[0].name.parts).toEqual(['Foo']);
      expect(stmt.items[0].alias?.name).toBe('Bar');
    }
  });

  test('should parse multiple use', () => {
    const stmt = getFirstStatement('<?php use Foo, Bar, Baz; ?>');
    expect(stmt.type).toBe('UseStatement');
    if (stmt.type === 'UseStatement') {
      expect(stmt.items).toHaveLength(3);
      expect(stmt.items[0].name.parts).toEqual(['Foo']);
      expect(stmt.items[1].name.parts).toEqual(['Bar']);
      expect(stmt.items[2].name.parts).toEqual(['Baz']);
    }
  });

  test('should parse grouped use', () => {
    const stmt = getFirstStatement('<?php use Foo\\{Bar, Baz}; ?>');
    expect(stmt.type).toBe('UseStatement');
    if (stmt.type === 'UseStatement') {
      expect(stmt.items).toHaveLength(2);
      expect(stmt.items[0].name.parts).toEqual(['Foo', 'Bar']);
      expect(stmt.items[1].name.parts).toEqual(['Foo', 'Baz']);
    }
  });

  test('should parse function use', () => {
    const stmt = getFirstStatement('<?php use function Foo\\bar; ?>');
    expect(stmt.type).toBe('UseStatement');
    if (stmt.type === 'UseStatement') {
      expect(stmt.kind).toBe('function');
      expect(stmt.items[0].name.parts).toEqual(['Foo', 'bar']);
    }
  });

  test('should parse const use', () => {
    const stmt = getFirstStatement('<?php use const Foo\\BAR; ?>');
    expect(stmt.type).toBe('UseStatement');
    if (stmt.type === 'UseStatement') {
      expect(stmt.kind).toBe('const');
      expect(stmt.items[0].name.parts).toEqual(['Foo', 'BAR']);
    }
  });

  test('should parse complex grouped use', () => {
    const stmt = getFirstStatement('<?php use Foo\\{Bar as B, function baz, const QUX}; ?>');
    expect(stmt.type).toBe('UseStatement');
    if (stmt.type === 'UseStatement') {
      expect(stmt.items).toHaveLength(3);
      expect(stmt.items[0].alias?.name).toBe('B');
      expect(stmt.items[1].kind).toBe('function');
      expect(stmt.items[2].kind).toBe('const');
    }
  });
});

describe('Parser - Const Declarations', () => {
  test('should parse simple const', () => {
    const stmt = getFirstStatement('<?php const FOO = 42; ?>');
    expect(stmt.type).toBe('ConstStatement');
    if (stmt.type === 'ConstStatement') {
      expect(stmt.declarations).toHaveLength(1);
      expect(stmt.declarations[0].name.name).toBe('FOO');
      expect(stmt.declarations[0].value.type).toBe('NumberLiteral');
    }
  });

  test('should parse multiple const', () => {
    const stmt = getFirstStatement('<?php const FOO = 42, BAR = "hello", BAZ = true; ?>');
    expect(stmt.type).toBe('ConstStatement');
    if (stmt.type === 'ConstStatement') {
      expect(stmt.declarations).toHaveLength(3);
      expect(stmt.declarations[0].name.name).toBe('FOO');
      expect(stmt.declarations[1].name.name).toBe('BAR');
      expect(stmt.declarations[2].name.name).toBe('BAZ');
    }
  });

  test('should parse const with complex expression', () => {
    const stmt = getFirstStatement('<?php const FOO = 1 + 2 * 3; ?>');
    expect(stmt.type).toBe('ConstStatement');
    if (stmt.type === 'ConstStatement') {
      expect(stmt.declarations[0].value.type).toBe('BinaryExpression');
    }
  });

  test('should parse const with array', () => {
    const stmt = getFirstStatement('<?php const FOO = [1, 2, 3]; ?>');
    expect(stmt.type).toBe('ConstStatement');
    if (stmt.type === 'ConstStatement') {
      expect(stmt.declarations[0].value.type).toBe('ArrayExpression');
    }
  });
});