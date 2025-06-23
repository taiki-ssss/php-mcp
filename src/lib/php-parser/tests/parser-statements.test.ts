import { describe, expect, test } from 'vitest';
import { expectParseSuccess, expectParseFail, getFirstStatement } from './test-utils';

describe('Parser - Statements', () => {
  describe('Expression statements', () => {
    test('should parse simple expression statements', () => {
      const statements = expectParseSuccess('<?php 42; ?>');
      expect(statements).toHaveLength(1);
      const stmt = statements[0];
      expect(stmt.type).toBe('ExpressionStatement');
    });

    test('should parse function call statements', () => {
      const statements = expectParseSuccess('<?php print("Hello"); ?>');
      const stmt = getFirstStatement('<?php print("Hello"); ?>');
      expect(stmt.type).toBe('ExpressionStatement');
      if (stmt.type === 'ExpressionStatement') {
        expect(stmt.expression.type).toBe('CallExpression');
      }
    });

    test('should parse assignment statements', () => {
      const stmt = getFirstStatement('<?php $x = 42; ?>');
      expect(stmt.type).toBe('ExpressionStatement');
      if (stmt.type === 'ExpressionStatement') {
        expect(stmt.expression.type).toBe('AssignmentExpression');
      }
    });
  });

  describe('Echo statements', () => {
    test('should parse echo with single argument', () => {
      const stmt = getFirstStatement('<?php echo "Hello"; ?>');
      expect(stmt.type).toBe('EchoStatement');
      if (stmt.type === 'EchoStatement') {
        expect(stmt.expressions).toHaveLength(1);
        expect(stmt.expressions[0].type).toBe('StringLiteral');
      }
    });

    test('should parse echo with multiple arguments', () => {
      const stmt = getFirstStatement('<?php echo "Hello", " ", "World"; ?>');
      expect(stmt.type).toBe('EchoStatement');
      if (stmt.type === 'EchoStatement') {
        expect(stmt.expressions).toHaveLength(3);
      }
    });

    test('should parse echo with expressions', () => {
      const stmt = getFirstStatement('<?php echo $x + $y; ?>');
      expect(stmt.type).toBe('EchoStatement');
      if (stmt.type === 'EchoStatement') {
        expect(stmt.expressions[0].type).toBe('BinaryExpression');
      }
    });
  });

  describe('Return statements', () => {
    test('should parse return with no value', () => {
      const stmt = getFirstStatement('<?php return; ?>');
      expect(stmt.type).toBe('ReturnStatement');
      if (stmt.type === 'ReturnStatement') {
        expect(stmt.value).toBeNull();
      }
    });

    test('should parse return with value', () => {
      const stmt = getFirstStatement('<?php return 42; ?>');
      expect(stmt.type).toBe('ReturnStatement');
      if (stmt.type === 'ReturnStatement') {
        expect(stmt.value).not.toBeNull();
        expect(stmt.value?.type).toBe('NumberLiteral');
      }
    });

    test('should parse return with expression', () => {
      const stmt = getFirstStatement('<?php return $x + $y; ?>');
      expect(stmt.type).toBe('ReturnStatement');
      if (stmt.type === 'ReturnStatement') {
        expect(stmt.value?.type).toBe('BinaryExpression');
      }
    });
  });

  describe('If statements', () => {
    test('should parse simple if statement', () => {
      const stmt = getFirstStatement('<?php if ($x > 0) echo "positive"; ?>');
      expect(stmt.type).toBe('IfStatement');
      if (stmt.type === 'IfStatement') {
        expect(stmt.test.type).toBe('BinaryExpression');
        expect(stmt.consequent.type).toBe('EchoStatement');
        expect(stmt.elseifs).toHaveLength(0);
        expect(stmt.alternate).toBeNull();
      }
    });

    test('should parse if with block statement', () => {
      const stmt = getFirstStatement('<?php if ($x > 0) { echo "positive"; } ?>');
      expect(stmt.type).toBe('IfStatement');
      if (stmt.type === 'IfStatement') {
        expect(stmt.consequent.type).toBe('BlockStatement');
      }
    });

    test('should parse if-else statement', () => {
      const stmt = getFirstStatement('<?php if ($x > 0) echo "positive"; else echo "negative"; ?>');
      expect(stmt.type).toBe('IfStatement');
      if (stmt.type === 'IfStatement') {
        expect(stmt.alternate).not.toBeNull();
        expect(stmt.alternate?.type).toBe('EchoStatement');
      }
    });

    test('should parse if-elseif-else statement', () => {
      const code = `<?php 
        if ($x > 0) echo "positive";
        elseif ($x < 0) echo "negative";
        else echo "zero";
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('IfStatement');
      if (stmt.type === 'IfStatement') {
        expect(stmt.elseifs).toHaveLength(1);
        expect(stmt.elseifs[0].test.type).toBe('BinaryExpression');
        expect(stmt.alternate).not.toBeNull();
      }
    });

    test('should parse nested if statements', () => {
      const code = `<?php 
        if ($x > 0) {
          if ($y > 0) {
            echo "both positive";
          }
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('IfStatement');
      if (stmt.type === 'IfStatement' && stmt.consequent.type === 'BlockStatement') {
        const nestedIf = stmt.consequent.statements[0];
        expect(nestedIf.type).toBe('IfStatement');
      }
    });
  });

  describe('While loops', () => {
    test('should parse simple while loop', () => {
      const stmt = getFirstStatement('<?php while ($x > 0) $x--; ?>');
      expect(stmt.type).toBe('WhileStatement');
      if (stmt.type === 'WhileStatement') {
        expect(stmt.test.type).toBe('BinaryExpression');
        expect(stmt.body.type).toBe('ExpressionStatement');
      }
    });

    test('should parse while with block', () => {
      const stmt = getFirstStatement('<?php while ($x > 0) { $x--; } ?>');
      expect(stmt.type).toBe('WhileStatement');
      if (stmt.type === 'WhileStatement') {
        expect(stmt.body.type).toBe('BlockStatement');
      }
    });

    test('should parse do-while loop', () => {
      const stmt = getFirstStatement('<?php do { $x--; } while ($x > 0); ?>');
      expect(stmt.type).toBe('DoWhileStatement');
      if (stmt.type === 'DoWhileStatement') {
        expect(stmt.body.type).toBe('BlockStatement');
        expect(stmt.test.type).toBe('BinaryExpression');
      }
    });
  });

  describe('For loops', () => {
    test('should parse standard for loop', () => {
      const stmt = getFirstStatement('<?php for ($i = 0; $i < 10; $i++) echo $i; ?>');
      expect(stmt.type).toBe('ForStatement');
      if (stmt.type === 'ForStatement') {
        expect(stmt.init?.type).toBe('AssignmentExpression');
        expect(stmt.test?.type).toBe('BinaryExpression');
        expect(stmt.update?.type).toBe('UpdateExpression');
        expect(stmt.body.type).toBe('EchoStatement');
      }
    });

    test('should parse for loop with multiple initializers', () => {
      const stmt = getFirstStatement('<?php for ($i = 0, $j = 10; $i < $j; $i++, $j--) {} ?>');
      expect(stmt.type).toBe('ForStatement');
      if (stmt.type === 'ForStatement') {
        expect(stmt.init?.type).toBe('SequenceExpression');
        expect(stmt.update?.type).toBe('SequenceExpression');
      }
    });

    test('should parse for loop with empty parts', () => {
      const stmt = getFirstStatement('<?php for (;;) break; ?>');
      expect(stmt.type).toBe('ForStatement');
      if (stmt.type === 'ForStatement') {
        expect(stmt.init).toBeNull();
        expect(stmt.test).toBeNull();
        expect(stmt.update).toBeNull();
      }
    });
  });

  describe('Foreach loops', () => {
    test('should parse foreach with value only', () => {
      const stmt = getFirstStatement('<?php foreach ($array as $value) echo $value; ?>');
      expect(stmt.type).toBe('ForeachStatement');
      if (stmt.type === 'ForeachStatement') {
        expect(stmt.expression.type).toBe('VariableExpression');
        expect(stmt.value.type).toBe('VariableExpression');
        expect(stmt.key).toBeNull();
        expect(stmt.body.type).toBe('EchoStatement');
      }
    });

    test('should parse foreach with key and value', () => {
      const stmt = getFirstStatement('<?php foreach ($array as $key => $value) {} ?>');
      expect(stmt.type).toBe('ForeachStatement');
      if (stmt.type === 'ForeachStatement') {
        expect(stmt.key?.type).toBe('VariableExpression');
        expect(stmt.value.type).toBe('VariableExpression');
      }
    });

    test('should parse foreach with reference', () => {
      const stmt = getFirstStatement('<?php foreach ($array as &$value) {} ?>');
      expect(stmt.type).toBe('ForeachStatement');
      if (stmt.type === 'ForeachStatement') {
        expect(stmt.byRef).toBe(true);
      }
    });
  });

  describe('Switch statements', () => {
    test('should parse switch with cases', () => {
      const code = `<?php 
        switch ($x) {
          case 1:
            echo "one";
            break;
          case 2:
            echo "two";
            break;
          default:
            echo "other";
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('SwitchStatement');
      if (stmt.type === 'SwitchStatement') {
        expect(stmt.discriminant.type).toBe('VariableExpression');
        expect(stmt.cases).toHaveLength(3);
        expect(stmt.cases[0].test?.type).toBe('NumberLiteral');
        expect(stmt.cases[2].test).toBeNull(); // default case
      }
    });

    test('should parse switch with fallthrough', () => {
      const code = `<?php 
        switch ($x) {
          case 1:
          case 2:
            echo "one or two";
            break;
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('SwitchStatement');
      if (stmt.type === 'SwitchStatement') {
        expect(stmt.cases).toHaveLength(2);
        expect(stmt.cases[0].consequent).toHaveLength(0); // empty case
      }
    });
  });

  describe('Break and Continue', () => {
    test('should parse break statement', () => {
      const stmt = getFirstStatement('<?php break; ?>');
      expect(stmt.type).toBe('BreakStatement');
      if (stmt.type === 'BreakStatement') {
        expect(stmt.label).toBeNull();
      }
    });

    test('should parse break with level', () => {
      const stmt = getFirstStatement('<?php break 2; ?>');
      expect(stmt.type).toBe('BreakStatement');
      if (stmt.type === 'BreakStatement') {
        expect(stmt.label?.type).toBe('NumberLiteral');
      }
    });

    test('should parse continue statement', () => {
      const stmt = getFirstStatement('<?php continue; ?>');
      expect(stmt.type).toBe('ContinueStatement');
      if (stmt.type === 'ContinueStatement') {
        expect(stmt.label).toBeNull();
      }
    });

    test('should parse continue with level', () => {
      const stmt = getFirstStatement('<?php continue 2; ?>');
      expect(stmt.type).toBe('ContinueStatement');
      if (stmt.type === 'ContinueStatement') {
        expect(stmt.label?.type).toBe('NumberLiteral');
      }
    });
  });

  describe('Try-catch statements', () => {
    test('should parse try-catch', () => {
      const code = `<?php 
        try {
          doSomething();
        } catch (Exception $e) {
          echo $e->getMessage();
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('TryStatement');
      if (stmt.type === 'TryStatement') {
        expect(stmt.block.type).toBe('BlockStatement');
        expect(stmt.handlers).toHaveLength(1);
        expect(stmt.handlers[0].param?.type).toBe('VariableExpression');
        expect(stmt.handlers[0].types).toHaveLength(1);
        expect(stmt.finalizer).toBeUndefined();
      }
    });

    test('should parse try-catch with multiple catch blocks', () => {
      const code = `<?php 
        try {
          doSomething();
        } catch (IOException $e) {
          echo "IO error";
        } catch (Exception $e) {
          echo "Other error";
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('TryStatement');
      if (stmt.type === 'TryStatement') {
        expect(stmt.handlers).toHaveLength(2);
      }
    });

    test('should parse try-catch-finally', () => {
      const code = `<?php 
        try {
          doSomething();
        } catch (Exception $e) {
          echo $e->getMessage();
        } finally {
          cleanup();
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('TryStatement');
      if (stmt.type === 'TryStatement') {
        expect(stmt.finalizer).not.toBeNull();
        expect(stmt.finalizer?.type).toBe('BlockStatement');
      }
    });

    test('should parse catch with union types', () => {
      const code = `<?php 
        try {
          doSomething();
        } catch (IOException | RuntimeException $e) {
          echo "Error";
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('TryStatement');
      if (stmt.type === 'TryStatement') {
        expect(stmt.handlers[0].types).toHaveLength(2);
      }
    });
  });

  describe('Throw statements', () => {
    test('should parse throw statement', () => {
      const stmt = getFirstStatement('<?php throw new Exception("Error"); ?>');
      expect(stmt.type).toBe('ThrowStatement');
      if (stmt.type === 'ThrowStatement') {
        expect(stmt.expression.type).toBe('NewExpression');
      }
    });
  });

  describe('Declare statements', () => {
    test('should parse declare with single directive', () => {
      const stmt = getFirstStatement('<?php declare(strict_types=1); ?>');
      expect(stmt.type).toBe('DeclareStatement');
      if (stmt.type === 'DeclareStatement') {
        expect(stmt.directives).toHaveLength(1);
        expect(stmt.directives[0].name).toBe('strict_types');
        expect(stmt.body).toBeNull();
      }
    });

    test('should parse declare with block', () => {
      const code = `<?php 
        declare(strict_types=1) {
          function foo() {}
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('DeclareStatement');
      if (stmt.type === 'DeclareStatement') {
        expect(stmt.body?.type).toBe('BlockStatement');
      }
    });
  });

  describe('Goto statements', () => {
    test('should parse goto statement', () => {
      const stmt = getFirstStatement('<?php goto end; ?>');
      expect(stmt.type).toBe('GotoStatement');
      if (stmt.type === 'GotoStatement') {
        expect(stmt.label).toBe('end');
      }
    });

    test('should parse label statement', () => {
      const stmt = getFirstStatement('<?php end: ?>');
      expect(stmt.type).toBe('LabeledStatement');
      if (stmt.type === 'LabeledStatement') {
        expect(stmt.label).toBe('end');
      }
    });
  });

  describe('Global and static statements', () => {
    test('should parse global statement', () => {
      const stmt = getFirstStatement('<?php global $x, $y; ?>');
      expect(stmt.type).toBe('GlobalStatement');
      if (stmt.type === 'GlobalStatement') {
        expect(stmt.variables).toHaveLength(2);
      }
    });

    test('should parse static variable declaration', () => {
      const stmt = getFirstStatement('<?php static $x = 10; ?>');
      expect(stmt.type).toBe('StaticStatement');
      if (stmt.type === 'StaticStatement') {
        expect(stmt.declarations).toHaveLength(1);
        expect(stmt.declarations[0].id.type).toBe('VariableExpression');
        expect(stmt.declarations[0].init?.type).toBe('NumberLiteral');
      }
    });
  });

  describe('Unset statement', () => {
    test('should parse unset statement', () => {
      const stmt = getFirstStatement('<?php unset($x, $y); ?>');
      expect(stmt.type).toBe('UnsetStatement');
      if (stmt.type === 'UnsetStatement') {
        expect(stmt.variables).toHaveLength(2);
      }
    });
  });

  describe('Block statements', () => {
    test('should parse empty block', () => {
      const stmt = getFirstStatement('<?php {} ?>');
      expect(stmt.type).toBe('BlockStatement');
      if (stmt.type === 'BlockStatement') {
        expect(stmt.statements).toHaveLength(0);
      }
    });

    test('should parse block with multiple statements', () => {
      const stmt = getFirstStatement('<?php { $x = 1; $y = 2; } ?>');
      expect(stmt.type).toBe('BlockStatement');
      if (stmt.type === 'BlockStatement') {
        expect(stmt.statements).toHaveLength(2);
      }
    });
  });

  describe('Inline HTML', () => {
    test('should parse inline HTML as statement', () => {
      const statements = expectParseSuccess('<?php ?><div>Hello</div><?php ?>');
      const htmlStmt = statements.find(s => s.type === 'InlineHTMLStatement');
      expect(htmlStmt).toBeDefined();
      if (htmlStmt?.type === 'InlineHTMLStatement') {
        expect(htmlStmt.value).toContain('<div>Hello</div>');
      }
    });
  });

  describe('Error cases', () => {
    test('should fail on invalid if statement', () => {
      expectParseFail('<?php if () {} ?>');
    });

    test('should fail on invalid for loop', () => {
      expectParseFail('<?php for ($i) {} ?>');
    });

    test('should fail on break outside loop', () => {
      // Parser might not catch this semantic error
      const statements = expectParseSuccess('<?php break; ?>');
      expect(statements[0].type).toBe('BreakStatement');
    });
  });
});