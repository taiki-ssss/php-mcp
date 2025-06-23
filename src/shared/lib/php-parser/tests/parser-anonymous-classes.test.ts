import { describe, expect, test } from 'vitest';
import { expectParseSuccess, expectParseFail, getFirstStatement } from './test-utils';

describe('Parser - Anonymous Classes', () => {
  test('should parse simple anonymous class', () => {
    const stmt = getFirstStatement('<?php $foo = new class {}; ?>');
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const newExpr = stmt.expression.right;
      expect(newExpr.type).toBe('NewExpression');
      if (newExpr.type === 'NewExpression' && newExpr.callee.type === 'ClassExpression') {
        expect(newExpr.callee.body).toEqual([]);
      }
    }
  });

  test('should parse anonymous class with extends', () => {
    const stmt = getFirstStatement('<?php $foo = new class extends Bar {}; ?>');
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const newExpr = stmt.expression.right;
      if (newExpr.type === 'NewExpression' && newExpr.callee.type === 'ClassExpression') {
        expect(newExpr.callee.superClass?.parts).toEqual(['Bar']);
      }
    }
  });

  test('should parse anonymous class with implements', () => {
    const stmt = getFirstStatement('<?php $foo = new class implements Foo, Bar {}; ?>');
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const newExpr = stmt.expression.right;
      if (newExpr.type === 'NewExpression' && newExpr.callee.type === 'ClassExpression') {
        expect(newExpr.callee.interfaces).toHaveLength(2);
        expect(newExpr.callee.interfaces?.[0].parts).toEqual(['Foo']);
        expect(newExpr.callee.interfaces?.[1].parts).toEqual(['Bar']);
      }
    }
  });

  test('should parse anonymous class with constructor arguments', () => {
    const code = `<?php $foo = new class($arg1, $arg2) {
      private $prop1;
      private $prop2;
      public function __construct($a, $b) {
        $this->prop1 = $a;
        $this->prop2 = $b;
      }
    }; ?>`;
    const statements = expectParseSuccess(code);
    expect(statements).toHaveLength(1);
    expect(statements[0].type).toBe('ExpressionStatement');
  });

  test('should parse anonymous class with methods', () => {
    const code = `<?php $foo = new class {
      public function bar() {
        return 42;
      }
      
      private function baz() {
        return "hello";
      }
    }; ?>`;
    const stmt = getFirstStatement(code);
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const newExpr = stmt.expression.right;
      if (newExpr.type === 'NewExpression' && newExpr.callee.type === 'ClassExpression') {
        expect(newExpr.callee.body).toHaveLength(2);
        expect(newExpr.callee.body[0].type).toBe('MethodDeclaration');
        expect(newExpr.callee.body[1].type).toBe('MethodDeclaration');
      }
    }
  });

  test('should parse anonymous class with properties', () => {
    const code = `<?php $foo = new class {
      public string $bar = "hello";
      private int $baz = 42;
      protected ?array $qux = null;
    }; ?>`;
    const stmt = getFirstStatement(code);
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const newExpr = stmt.expression.right;
      if (newExpr.type === 'NewExpression' && newExpr.callee.type === 'ClassExpression') {
        expect(newExpr.callee.body).toHaveLength(3);
        expect(newExpr.callee.body[0].type).toBe('PropertyDeclaration');
        expect(newExpr.callee.body[1].type).toBe('PropertyDeclaration');
        expect(newExpr.callee.body[2].type).toBe('PropertyDeclaration');
      }
    }
  });

  test('should parse anonymous class with traits', () => {
    const code = `<?php $foo = new class {
      use TraitA, TraitB {
        TraitA::method1 as protected;
        TraitB::method2 insteadof TraitA;
      }
    }; ?>`;
    const stmt = getFirstStatement(code);
    expect(stmt.type).toBe('ExpressionStatement');
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
      const newExpr = stmt.expression.right;
      if (newExpr.type === 'NewExpression' && newExpr.callee.type === 'ClassExpression') {
        expect(newExpr.callee.body).toHaveLength(1);
        expect(newExpr.callee.body[0].type).toBe('TraitUseStatement');
      }
    }
  });
});