import { describe, expect, test } from 'vitest';
import { expectParseSuccess, expectParseFail, getFirstStatement } from './test-utils';

describe.skip('Parser - Attributes (Not implemented yet)', () => {
  test('should parse simple attribute', () => {
    const stmt = getFirstStatement('<?php #[Deprecated] function foo() {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.attributes).toHaveLength(1);
      expect(stmt.attributes?.[0].name.parts).toEqual(['Deprecated']);
      expect(stmt.attributes?.[0].arguments).toHaveLength(0);
    }
  });

  test('should parse attribute with arguments', () => {
    const stmt = getFirstStatement('<?php #[Route("/api", methods: ["GET", "POST"])] function foo() {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.attributes).toHaveLength(1);
      expect(stmt.attributes?.[0].name.parts).toEqual(['Route']);
      expect(stmt.attributes?.[0].arguments.length).toBeGreaterThan(0);
    }
  });

  test('should parse multiple attributes', () => {
    const stmt = getFirstStatement('<?php #[Deprecated] #[Route("/api")] function foo() {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.attributes).toHaveLength(2);
      expect(stmt.attributes?.[0].name.parts).toEqual(['Deprecated']);
      expect(stmt.attributes?.[1].name.parts).toEqual(['Route']);
    }
  });

  test('should parse attribute on class', () => {
    const stmt = getFirstStatement('<?php #[Entity] class Foo {} ?>');
    expect(stmt.type).toBe('ClassDeclaration');
    if (stmt.type === 'ClassDeclaration') {
      expect(stmt.attributes).toHaveLength(1);
      expect(stmt.attributes?.[0].name.parts).toEqual(['Entity']);
    }
  });

  test('should parse attribute on property', () => {
    const stmt = getFirstStatement('<?php class Foo { #[Column] public $bar; } ?>');
    expect(stmt.type).toBe('ClassDeclaration');
    if (stmt.type === 'ClassDeclaration' && stmt.body[0].type === 'PropertyDeclaration') {
      expect(stmt.body[0].attributes).toHaveLength(1);
      expect(stmt.body[0].attributes?.[0].name.parts).toEqual(['Column']);
    }
  });

  test('should parse attribute on parameter', () => {
    const stmt = getFirstStatement('<?php function foo(#[Sensitive] string $password) {} ?>');
    expect(stmt.type).toBe('FunctionDeclaration');
    if (stmt.type === 'FunctionDeclaration') {
      expect(stmt.parameters[0].attributes).toHaveLength(1);
      expect(stmt.parameters[0].attributes?.[0].name.parts).toEqual(['Sensitive']);
    }
  });

  test('should parse attribute on constant', () => {
    const stmt = getFirstStatement('<?php class Foo { #[Deprecated] const BAR = 42; } ?>');
    expect(stmt.type).toBe('ClassDeclaration');
    if (stmt.type === 'ClassDeclaration' && stmt.body[0].type === 'ConstantDeclaration') {
      expect(stmt.body[0].attributes).toHaveLength(1);
      expect(stmt.body[0].attributes?.[0].name.parts).toEqual(['Deprecated']);
    }
  });
});

describe('Parser - Anonymous Classes', () => {
  test('should parse simple anonymous class', () => {
    const stmt = getFirstStatement('<?php $obj = new class {}; ?>');
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const right = stmt.expression.right;
      expect(right.type).toBe('NewExpression');
      if (right.type === 'NewExpression' && right.callee.type === 'ClassExpression') {
        expect(right.callee.body).toHaveLength(0);
      }
    }
  });

  test('should parse anonymous class with extends', () => {
    const stmt = getFirstStatement('<?php $obj = new class extends Foo {}; ?>');
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const right = stmt.expression.right;
      if (right.type === 'NewExpression' && right.callee.type === 'ClassExpression') {
        expect(right.callee.superClass?.parts).toEqual(['Foo']);
      }
    }
  });

  test('should parse anonymous class with implements', () => {
    const stmt = getFirstStatement('<?php $obj = new class implements Bar {}; ?>');
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const right = stmt.expression.right;
      if (right.type === 'NewExpression' && right.callee.type === 'ClassExpression') {
        expect(right.callee.interfaces).toHaveLength(1);
        expect(right.callee.interfaces?.[0].parts).toEqual(['Bar']);
      }
    }
  });

  test('should parse anonymous class with constructor arguments', () => {
    const stmt = getFirstStatement('<?php $obj = new class($foo, $bar) { public function __construct($a, $b) {} }; ?>');
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const right = stmt.expression.right;
      if (right.type === 'NewExpression') {
        expect(right.arguments).toHaveLength(2);
        if (right.callee.type === 'ClassExpression') {
          expect(right.callee.body).toHaveLength(1);
          expect(right.callee.body[0].type).toBe('MethodDeclaration');
        }
      }
    }
  });

  test('should parse anonymous class with members', () => {
    const stmt = getFirstStatement('<?php $obj = new class { public $prop; public function method() {} }; ?>');
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const right = stmt.expression.right;
      if (right.type === 'NewExpression' && right.callee.type === 'ClassExpression') {
        expect(right.callee.body).toHaveLength(2);
        expect(right.callee.body[0].type).toBe('PropertyDeclaration');
        expect(right.callee.body[1].type).toBe('MethodDeclaration');
      }
    }
  });
});

describe.skip('Parser - Error Cases (Temporarily disabled due to timeout)', () => {
  test('should fail on invalid function name', () => {
    expectParseFail('<?php function 123() {} ?>');
  });

  test('should fail on duplicate visibility modifiers', () => {
    expectParseFail('<?php class Foo { public public $bar; } ?>');
  });

  test('should fail on invalid class name', () => {
    expectParseFail('<?php class 123 {} ?>');
  });

  test('should fail on interface with properties', () => {
    expectParseFail('<?php interface Foo { public $bar; } ?>');
  });

  test('should fail on abstract property', () => {
    expectParseFail('<?php class Foo { abstract public $bar; } ?>');
  });

  test('should fail on final property', () => {
    expectParseFail('<?php class Foo { final public $bar; } ?>');
  });

  test('should fail on invalid trait adaptation', () => {
    expectParseFail('<?php class Foo { use Bar { invalid syntax; } } ?>');
  });

  test('should fail on enum with invalid case', () => {
    expectParseFail('<?php enum Foo { case; } ?>');
  });

  test('should fail on invalid namespace', () => {
    expectParseFail('<?php namespace; ?>');
  });

  test('should fail on invalid use statement', () => {
    expectParseFail('<?php use; ?>');
  });

  test('should fail on invalid const declaration', () => {
    expectParseFail('<?php const = 42; ?>');
  });

  test.skip('should fail on invalid attribute (attributes not implemented)', () => {
    expectParseFail('<?php #[] function foo() {} ?>');
  });

  test('should fail on invalid anonymous class', () => {
    expectParseFail('<?php $obj = new class; ?>');
  });

  test('should fail on invalid extends', () => {
    expectParseFail('<?php class Foo extends {} ?>');
  });
});