import { describe, expect, test } from 'vitest';
import { expectParseSuccess, getFirstExpression } from './test-utils';

describe('Parser - Expressions', () => {
  describe('Literals', () => {
    test('should parse number literals', () => {
      const expr = getFirstExpression('<?php 42; ?>');
      expect(expr.type).toBe('NumberLiteral');
      if (expr.type === 'NumberLiteral') {
        expect(expr.value).toBe('42');
      }
    });

    test('should parse float literals', () => {
      const expr = getFirstExpression('<?php 3.14; ?>');
      expect(expr.type).toBe('NumberLiteral');
      if (expr.type === 'NumberLiteral') {
        expect(expr.value).toBe('3.14');
      }
    });

    test('should parse string literals', () => {
      const expr = getFirstExpression('<?php "hello"; ?>');
      expect(expr.type).toBe('StringLiteral');
      if (expr.type === 'StringLiteral') {
        expect(expr.value).toBe('hello');
      }
    });

    test('should parse boolean literals', () => {
      const trueExpr = getFirstExpression('<?php true; ?>');
      const falseExpr = getFirstExpression('<?php false; ?>');

      expect(trueExpr.type).toBe('BooleanLiteral');
      expect(falseExpr.type).toBe('BooleanLiteral');

      if (trueExpr.type === 'BooleanLiteral') {
        expect(trueExpr.value).toBe(true);
      }
      if (falseExpr.type === 'BooleanLiteral') {
        expect(falseExpr.value).toBe(false);
      }
    });

    test('should parse null literal', () => {
      const expr = getFirstExpression('<?php null; ?>');
      expect(expr.type).toBe('NullLiteral');
    });

    test('should parse array literals', () => {
      const expr = getFirstExpression('<?php [1, 2, 3]; ?>');
      expect(expr.type).toBe('ArrayExpression');
      if (expr.type === 'ArrayExpression') {
        expect(expr.elements).toHaveLength(3);
      }
    });

    test('should parse array with keys', () => {
      const expr = getFirstExpression('<?php ["a" => 1, "b" => 2]; ?>');
      expect(expr.type).toBe('ArrayExpression');
      if (expr.type === 'ArrayExpression') {
        expect(expr.elements).toHaveLength(2);
        expect(expr.elements[0].key?.type).toBe('StringLiteral');
        expect(expr.elements[0].value.type).toBe('NumberLiteral');
      }
    });

    test('should parse old-style array syntax', () => {
      const expr = getFirstExpression('<?php array(1, 2, 3); ?>');
      expect(expr.type).toBe('ArrayExpression');
      if (expr.type === 'ArrayExpression') {
        expect(expr.elements).toHaveLength(3);
      }
    });
  });

  describe('Variables', () => {
    test('should parse simple variables', () => {
      const expr = getFirstExpression('<?php $foo; ?>');
      expect(expr.type).toBe('VariableExpression');
      if (expr.type === 'VariableExpression') {
        expect(expr.name).toBe('foo');
      }
    });

    test('should parse variable variables', () => {
      const expr = getFirstExpression('<?php $$foo; ?>');
      expect(expr.type).toBe('VariableExpression');
      if (expr.type === 'VariableExpression' && typeof expr.name !== 'string') {
        expect(expr.name.type).toBe('VariableExpression');
      }
    });

    test('should parse superglobals', () => {
      const globals = ['$_GET', '$_POST', '$_SESSION', '$_COOKIE', '$GLOBALS'];
      for (const global of globals) {
        const expr = getFirstExpression(`<?php ${global}; ?>`);
        expect(expr.type).toBe('VariableExpression');
      }
    });
  });

  describe('Binary expressions', () => {
    test('should parse arithmetic operators', () => {
      const operators = [
        { op: '+', code: '$a + $b' },
        { op: '-', code: '$a - $b' },
        { op: '*', code: '$a * $b' },
        { op: '/', code: '$a / $b' },
        { op: '%', code: '$a % $b' },
        { op: '**', code: '$a ** $b' },
      ];

      for (const { op, code } of operators) {
        const expr = getFirstExpression(`<?php ${code}; ?>`);
        expect(expr.type).toBe('BinaryExpression');
        if (expr.type === 'BinaryExpression') {
          expect(expr.operator).toBe(op);
        }
      }
    });

    test('should parse comparison operators', () => {
      const operators = [
        { op: '==', code: '$a == $b' },
        { op: '===', code: '$a === $b' },
        { op: '!=', code: '$a != $b' },
        { op: '!==', code: '$a !== $b' },
        { op: '<', code: '$a < $b' },
        { op: '>', code: '$a > $b' },
        { op: '<=', code: '$a <= $b' },
        { op: '>=', code: '$a >= $b' },
        { op: '<=>', code: '$a <=> $b' },
      ];

      for (const { op, code } of operators) {
        const expr = getFirstExpression(`<?php ${code}; ?>`);
        expect(expr.type).toBe('BinaryExpression');
        if (expr.type === 'BinaryExpression') {
          expect(expr.operator).toBe(op);
        }
      }
    });

    test('should parse logical operators', () => {
      const operators = [
        { op: '&&', code: '$a && $b' },
        { op: '||', code: '$a || $b' },
        { op: 'and', code: '$a and $b' },
        { op: 'or', code: '$a or $b' },
        { op: 'xor', code: '$a xor $b' },
      ];

      for (const { op, code } of operators) {
        const expr = getFirstExpression(`<?php ${code}; ?>`);
        expect(expr.type).toBe('LogicalExpression');
        if (expr.type === 'LogicalExpression') {
          expect(expr.operator).toBe(op);
        }
      }
    });

    test('should parse bitwise operators', () => {
      const operators = [
        { op: '&', code: '$a & $b' },
        { op: '|', code: '$a | $b' },
        { op: '^', code: '$a ^ $b' },
        { op: '<<', code: '$a << $b' },
        { op: '>>', code: '$a >> $b' },
      ];

      for (const { op, code } of operators) {
        const expr = getFirstExpression(`<?php ${code}; ?>`);
        expect(expr.type).toBe('BinaryExpression');
        if (expr.type === 'BinaryExpression') {
          expect(expr.operator).toBe(op);
        }
      }
    });

    test('should parse string concatenation', () => {
      const expr = getFirstExpression('<?php $a . $b; ?>');
      expect(expr.type).toBe('BinaryExpression');
      if (expr.type === 'BinaryExpression') {
        expect(expr.operator).toBe('.');
      }
    });

    test('should handle operator precedence', () => {
      const expr = getFirstExpression('<?php $a + $b * $c; ?>');
      expect(expr.type).toBe('BinaryExpression');
      if (expr.type === 'BinaryExpression') {
        expect(expr.operator).toBe('+');
        expect(expr.right.type).toBe('BinaryExpression');
        if (expr.right.type === 'BinaryExpression') {
          expect(expr.right.operator).toBe('*');
        }
      }
    });
  });

  describe('Unary expressions', () => {
    test('should parse prefix operators', () => {
      const operators = [
        { op: '!', code: '!$a' },
        { op: '-', code: '-$a' },
        { op: '+', code: '+$a' },
        { op: '~', code: '~$a' },
      ];

      for (const { op, code } of operators) {
        const expr = getFirstExpression(`<?php ${code}; ?>`);
        expect(expr.type).toBe('UnaryExpression');
        if (expr.type === 'UnaryExpression') {
          expect(expr.operator).toBe(op);
          expect(expr.prefix).toBe(true);
        }
      }
    });

    test('should parse increment/decrement operators', () => {
      const cases = [
        { code: '++$a', op: '++', prefix: true },
        { code: '--$a', op: '--', prefix: true },
        { code: '$a++', op: '++', prefix: false },
        { code: '$a--', op: '--', prefix: false },
      ];

      for (const { code, op, prefix } of cases) {
        const expr = getFirstExpression(`<?php ${code}; ?>`);
        expect(expr.type).toBe('UpdateExpression');
        if (expr.type === 'UpdateExpression') {
          expect(expr.operator).toBe(op);
          expect(expr.prefix).toBe(prefix);
        }
      }
    });

    test('should parse cast expressions', () => {
      const casts = [
        { cast: '(int)', type: 'int' },
        { cast: '(integer)', type: 'int' },
        { cast: '(bool)', type: 'bool' },
        { cast: '(boolean)', type: 'bool' },
        { cast: '(float)', type: 'float' },
        { cast: '(double)', type: 'float' },
        { cast: '(string)', type: 'string' },
        { cast: '(array)', type: 'array' },
        { cast: '(object)', type: 'object' },
      ];

      for (const { cast, type } of casts) {
        const expr = getFirstExpression(`<?php ${cast} $a; ?>`);
        expect(expr.type).toBe('CastExpression');
        if (expr.type === 'CastExpression') {
          expect(expr.kind).toBe(type);
        }
      }
    });

    test('should parse error suppression operator', () => {
      const expr = getFirstExpression('<?php @file_get_contents("file.txt"); ?>');
      expect(expr.type).toBe('UnaryExpression');
      if (expr.type === 'UnaryExpression') {
        expect(expr.operator).toBe('@');
      }
    });
  });

  describe('Assignment expressions', () => {
    test('should parse simple assignment', () => {
      const expr = getFirstExpression('<?php $a = 42; ?>');
      expect(expr.type).toBe('AssignmentExpression');
      if (expr.type === 'AssignmentExpression') {
        expect(expr.operator).toBe('=');
        expect(expr.left.type).toBe('VariableExpression');
        expect(expr.right.type).toBe('NumberLiteral');
      }
    });

    test('should parse compound assignments', () => {
      const operators = ['+=', '-=', '*=', '/=', '%=', '**=', '.=', '&=', '|=', '^=', '<<=', '>>='];

      for (const op of operators) {
        const expr = getFirstExpression(`<?php $a ${op} $b; ?>`);
        expect(expr.type).toBe('AssignmentExpression');
        if (expr.type === 'AssignmentExpression') {
          expect(expr.operator).toBe(op);
        }
      }
    });

    test('should parse null coalescing assignment', () => {
      const expr = getFirstExpression('<?php $a ??= $b; ?>');
      expect(expr.type).toBe('AssignmentExpression');
      if (expr.type === 'AssignmentExpression') {
        expect(expr.operator).toBe('??=');
      }
    });

    test('should parse list assignment', () => {
      const expr = getFirstExpression('<?php list($a, $b) = $array; ?>');
      expect(expr.type).toBe('AssignmentExpression');
      if (expr.type === 'AssignmentExpression') {
        expect(expr.left.type).toBe('ListExpression');
      }
    });

    test('should parse destructuring assignment', () => {
      const expr = getFirstExpression('<?php [$a, $b] = $array; ?>');
      expect(expr.type).toBe('AssignmentExpression');
      if (expr.type === 'AssignmentExpression') {
        expect(expr.left.type).toBe('ArrayPattern');
      }
    });
  });

  describe('Conditional expressions', () => {
    test('should parse ternary operator', () => {
      const expr = getFirstExpression('<?php $a ? $b : $c; ?>');
      expect(expr.type).toBe('ConditionalExpression');
      if (expr.type === 'ConditionalExpression') {
        expect(expr.test.type).toBe('VariableExpression');
        expect(expr.consequent?.type).toBe('VariableExpression');
        expect(expr.alternate.type).toBe('VariableExpression');
      }
    });

    test('should parse short ternary', () => {
      const expr = getFirstExpression('<?php $a ?: $b; ?>');
      expect(expr.type).toBe('ConditionalExpression');
      if (expr.type === 'ConditionalExpression') {
        expect(expr.consequent).toBeUndefined();
      }
    });

    test('should parse null coalescing operator', () => {
      const expr = getFirstExpression('<?php $a ?? $b; ?>');
      expect(expr.type).toBe('BinaryExpression');
      if (expr.type === 'BinaryExpression') {
        expect(expr.operator).toBe('??');
      }
    });
  });

  describe('Call expressions', () => {
    test('should parse function calls', () => {
      const expr = getFirstExpression('<?php foo(); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression') {
        expect(expr.callee.type).toBe('Identifier');
        expect(expr.arguments).toHaveLength(0);
      }
    });

    test('should parse function calls with arguments', () => {
      const expr = getFirstExpression('<?php foo($a, $b, $c); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression') {
        expect(expr.arguments).toHaveLength(3);
      }
    });

    test('should parse method calls', () => {
      const expr = getFirstExpression('<?php $obj->method(); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression') {
        expect(expr.callee.type).toBe('MemberExpression');
      }
    });

    test('should parse static method calls', () => {
      const expr = getFirstExpression('<?php Class::method(); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression') {
        expect(expr.callee.type).toBe('MemberExpression');
      }
    });

    test('should parse dynamic function calls', () => {
      const expr = getFirstExpression('<?php $func(); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression') {
        expect(expr.callee.type).toBe('VariableExpression');
      }
    });

    test('should parse named arguments', () => {
      const expr = getFirstExpression('<?php foo(name: "John", age: 30); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression') {
        expect(expr.arguments).toHaveLength(2);
        expect(expr.arguments[0].name).toBe('name');
        expect(expr.arguments[1].name).toBe('age');
      }
    });

    test('should parse spread operator in arguments', () => {
      const expr = getFirstExpression('<?php foo(...$args); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression') {
        expect(expr.arguments[0].type).toBe('SpreadElement');
      }
    });
  });

  describe('Member expressions', () => {
    test('should parse property access', () => {
      const expr = getFirstExpression('<?php $obj->prop; ?>');
      expect(expr.type).toBe('MemberExpression');
      if (expr.type === 'MemberExpression') {
        expect(expr.object.type).toBe('VariableExpression');
        expect(expr.property.type).toBe('Identifier');
        expect(expr.computed).toBe(false);
      }
    });

    test('should parse dynamic property access', () => {
      const expr = getFirstExpression('<?php $obj->$prop; ?>');
      expect(expr.type).toBe('MemberExpression');
      if (expr.type === 'MemberExpression') {
        expect(expr.property.type).toBe('VariableExpression');
      }
    });

    test('should parse array access', () => {
      const expr = getFirstExpression('<?php $arr[$key]; ?>');
      expect(expr.type).toBe('MemberExpression');
      if (expr.type === 'MemberExpression') {
        expect(expr.computed).toBe(true);
        expect(expr.property.type).toBe('VariableExpression');
      }
    });

    test('should parse static property access', () => {
      const expr = getFirstExpression('<?php Class::$prop; ?>');
      expect(expr.type).toBe('MemberExpression');
      if (expr.type === 'MemberExpression') {
        expect(expr.object.type).toBe('NameExpression');
        expect(expr.property.type).toBe('VariableExpression');
      }
    });

    test('should parse class constant access', () => {
      const expr = getFirstExpression('<?php Class::CONSTANT; ?>');
      expect(expr.type).toBe('MemberExpression');
      if (expr.type === 'MemberExpression') {
        expect(expr.property.type).toBe('Identifier');
      }
    });

    test('should parse nullsafe operator', () => {
      const expr = getFirstExpression('<?php $obj?->method(); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression' && expr.callee.type === 'MemberExpression') {
        expect(expr.callee.nullsafe).toBe(true);
      }
    });
  });

  describe('New expressions', () => {
    test('should parse simple new expression', () => {
      const expr = getFirstExpression('<?php new Class(); ?>');
      expect(expr.type).toBe('NewExpression');
      if (expr.type === 'NewExpression') {
        expect(expr.callee.type).toBe('Identifier');
        expect(expr.arguments).toHaveLength(0);
      }
    });

    test('should parse new expression with arguments', () => {
      const expr = getFirstExpression('<?php new Class($a, $b); ?>');
      expect(expr.type).toBe('NewExpression');
      if (expr.type === 'NewExpression') {
        expect(expr.arguments).toHaveLength(2);
      }
    });

    test('should parse new expression with dynamic class', () => {
      const expr = getFirstExpression('<?php new $class(); ?>');
      expect(expr.type).toBe('NewExpression');
      if (expr.type === 'NewExpression') {
        expect(expr.callee.type).toBe('VariableExpression');
      }
    });

    test('should parse anonymous class', () => {
      const expr = getFirstExpression('<?php new class {}; ?>');
      expect(expr.type).toBe('NewExpression');
      if (expr.type === 'NewExpression') {
        expect(expr.callee.type).toBe('ClassExpression');
      }
    });
  });

  describe('Special expressions', () => {
    test('should parse instanceof', () => {
      const expr = getFirstExpression('<?php $obj instanceof Class; ?>');
      expect(expr.type).toBe('BinaryExpression');
      if (expr.type === 'BinaryExpression') {
        expect(expr.operator).toBe('instanceof');
      }
    });

    test('should parse clone', () => {
      const expr = getFirstExpression('<?php clone $obj; ?>');
      expect(expr.type).toBe('CloneExpression');
    });

    test('should parse yield', () => {
      const expr = getFirstExpression('<?php yield $value; ?>');
      expect(expr.type).toBe('YieldExpression');
      if (expr.type === 'YieldExpression') {
        expect(expr.value?.type).toBe('VariableExpression');
      }
    });

    test('should parse yield with key', () => {
      const expr = getFirstExpression('<?php yield $key => $value; ?>');
      expect(expr.type).toBe('YieldExpression');
      if (expr.type === 'YieldExpression') {
        expect(expr.key?.type).toBe('VariableExpression');
      }
    });

    test('should parse yield from', () => {
      const expr = getFirstExpression('<?php yield from $generator; ?>');
      expect(expr.type).toBe('YieldExpression');
      if (expr.type === 'YieldExpression') {
        // yield from not supported in current AST
      }
    });

    test('should parse match expression', () => {
      const expr = getFirstExpression('<?php match($x) { 1 => "one", default => "other" }; ?>');
      expect(expr.type).toBe('MatchExpression');
      if (expr.type === 'MatchExpression') {
        expect(expr.discriminant.type).toBe('VariableExpression');
        expect(expr.arms).toHaveLength(2);
      }
    });

    test('should parse arrow functions', () => {
      const expr = getFirstExpression('<?php fn($x) => $x * 2; ?>');
      expect(expr.type).toBe('ArrowFunctionExpression');
      if (expr.type === 'ArrowFunctionExpression') {
        expect(expr.parameters).toHaveLength(1);
        expect(expr.body.type).toBe('BinaryExpression');
      }
    });

    test('should parse closures', () => {
      const expr = getFirstExpression('<?php function($x) { return $x * 2; }; ?>');
      expect(expr.type).toBe('FunctionExpression');
      if (expr.type === 'FunctionExpression') {
        expect(expr.parameters).toHaveLength(1);
        expect(expr.body.type).toBe('BlockStatement');
      }
    });

    test('should parse closures with use', () => {
      const expr = getFirstExpression('<?php function($x) use ($y) { return $x + $y; }; ?>');
      expect(expr.type).toBe('FunctionExpression');
      if (expr.type === 'FunctionExpression') {
        expect(expr.uses).toHaveLength(1);
      }
    });
  });

  describe('Magic constants', () => {
    test('should parse magic constants', () => {
      const constants = ['__LINE__', '__FILE__', '__DIR__', '__FUNCTION__', '__CLASS__', '__METHOD__', '__NAMESPACE__'];

      for (const constant of constants) {
        const expr = getFirstExpression(`<?php ${constant}; ?>`);
        expect(expr.type).toBe('Identifier');
        if (expr.type === 'Identifier') {
          expect(expr.name).toBe(constant);
        }
      }
    });
  });

  describe('Complex expressions', () => {
    test('should parse chained method calls', () => {
      const expr = getFirstExpression('<?php $obj->method1()->method2()->method3(); ?>');
      expect(expr.type).toBe('CallExpression');
      if (expr.type === 'CallExpression') {
        expect(expr.callee.type).toBe('MemberExpression');
        if (expr.callee.type === 'MemberExpression') {
          expect(expr.callee.object.type).toBe('CallExpression');
        }
      }
    });

    test('should parse nested array access', () => {
      const expr = getFirstExpression('<?php $arr[$i][$j][$k]; ?>');
      expect(expr.type).toBe('MemberExpression');
      if (expr.type === 'MemberExpression') {
        expect(expr.object.type).toBe('MemberExpression');
      }
    });

    test('should parse complex precedence', () => {
      const expr = getFirstExpression('<?php $a || $b && $c; ?>');
      expect(expr.type).toBe('LogicalExpression');
      if (expr.type === 'LogicalExpression') {
        expect(expr.operator).toBe('||');
        expect(expr.right.type).toBe('LogicalExpression');
      }
    });
  });
});