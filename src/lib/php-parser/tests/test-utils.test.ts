import { describe, expect, test, vi } from 'vitest';
import {
  expectTokens,
  expectTokenValues,
  expectParseFail,
  expectParseSuccess,
  getFirstStatement,
  getFirstExpression,
  findNodeByType,
  PHP_SNIPPETS
} from './test-utils';
import * as testHelpers from './test-helpers';
import { err, ok } from '../utils/result';
import type { Node, Statement, ExpressionStatement, BinaryExpression, BlockStatement, Identifier } from '../core/ast';

// Mock the test-helpers module
vi.mock('./test-helpers', () => ({
  tokenizePhp: vi.fn(),
  parsePhp: vi.fn()
}));

describe('test-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('expectTokens', () => {
    test('should pass when tokens match expected types', () => {
      const mockTokens = [
        { type: 'T_OPEN_TAG', value: '<?php' },
        { type: 'T_WHITESPACE', value: ' ' },
        { type: 'T_ECHO', value: 'echo' },
        { type: 'T_WHITESPACE', value: ' ' },
        { type: 'T_STRING', value: '"Hello"' },
        { type: 'T_SEMICOLON', value: ';' }
      ];
      
      vi.mocked(testHelpers.tokenizePhp).mockReturnValue(ok(mockTokens));
      
      expect(() => {
        expectTokens('<?php echo "Hello";', ['T_OPEN_TAG', 'T_ECHO', 'T_STRING', 'T_SEMICOLON']);
      }).not.toThrow();
    });

    test('should throw when tokenization fails', () => {
      vi.mocked(testHelpers.tokenizePhp).mockReturnValue(err('Tokenization error'));
      
      expect(() => {
        expectTokens('invalid code', []);
      }).toThrow('Tokenization failed: Tokenization error');
    });
  });

  describe('expectTokenValues', () => {
    test('should pass when token types and values match', () => {
      const mockTokens = [
        { type: 'T_OPEN_TAG', value: '<?php' },
        { type: 'T_WHITESPACE', value: ' ' },
        { type: 'T_VARIABLE', value: '$x' },
        { type: 'T_ASSIGN', value: '=' },
        { type: 'T_NUMBER', value: '42' }
      ];
      
      vi.mocked(testHelpers.tokenizePhp).mockReturnValue(ok(mockTokens));
      
      expect(() => {
        expectTokenValues('<?php $x = 42', [
          ['T_OPEN_TAG', '<?php'],
          ['T_VARIABLE', '$x'],
          ['T_ASSIGN', '='],
          ['T_NUMBER', '42']
        ]);
      }).not.toThrow();
    });

    test('should throw when tokenization fails', () => {
      vi.mocked(testHelpers.tokenizePhp).mockReturnValue(err('Tokenization error'));
      
      expect(() => {
        expectTokenValues('invalid code', []);
      }).toThrow('Tokenization failed: Tokenization error');
    });
  });

  describe('expectParseFail', () => {
    test('should pass when parse fails', () => {
      vi.mocked(testHelpers.parsePhp).mockReturnValue({ success: false });
      
      expect(() => {
        expectParseFail('<?php class {');
      }).not.toThrow();
    });

    test('should fail when parse succeeds', () => {
      vi.mocked(testHelpers.parsePhp).mockReturnValue({ success: true });
      
      expect(() => {
        expectParseFail('<?php echo "valid";');
      }).toThrow();
    });
  });

  describe('expectParseSuccess', () => {
    test('should return statements when parse succeeds', () => {
      const mockStatements: Statement[] = [
        { type: 'ExpressionStatement', expression: { type: 'NumberLiteral', value: '42' } }
      ];
      
      vi.mocked(testHelpers.parsePhp).mockReturnValue(ok({ statements: mockStatements }));
      
      const result = expectParseSuccess('<?php 42;');
      expect(result).toEqual(mockStatements);
    });

    test('should throw when parse fails', () => {
      vi.mocked(testHelpers.parsePhp).mockReturnValue(err('Parse error'));
      
      expect(() => {
        expectParseSuccess('invalid code');
      }).toThrow('Parse failed: Parse error');
    });
  });

  describe('getFirstStatement', () => {
    test('should return first statement', () => {
      const mockStatement: Statement = {
        type: 'ExpressionStatement',
        expression: { type: 'NumberLiteral', value: '42' }
      };
      
      vi.mocked(testHelpers.parsePhp).mockReturnValue(ok({ statements: [mockStatement] }));
      
      const result = getFirstStatement('<?php 42;');
      expect(result).toEqual(mockStatement);
    });

    test('should throw when no statements', () => {
      vi.mocked(testHelpers.parsePhp).mockReturnValue(ok({ statements: [] }));
      
      expect(() => {
        getFirstStatement('<?php ?>');
      }).toThrow('No statements in AST');
    });
  });

  describe('getFirstExpression', () => {
    test('should return expression from ExpressionStatement', () => {
      const mockExpression = { type: 'NumberLiteral', value: '42' };
      const mockStatement: ExpressionStatement = {
        type: 'ExpressionStatement',
        expression: mockExpression
      };
      
      vi.mocked(testHelpers.parsePhp).mockReturnValue(ok({ statements: [mockStatement] }));
      
      const result = getFirstExpression('<?php 42;');
      expect(result).toEqual(mockExpression);
    });

    test('should throw when first statement is not ExpressionStatement', () => {
      const mockStatement: Statement = {
        type: 'IfStatement',
        test: { type: 'BooleanLiteral', value: true },
        consequent: { type: 'BlockStatement', statements: [] }
      };
      
      vi.mocked(testHelpers.parsePhp).mockReturnValue(ok({ statements: [mockStatement] }));
      
      expect(() => {
        getFirstExpression('<?php if (true) {} ?>');
      }).toThrow('Expected ExpressionStatement, got IfStatement');
    });
  });

  describe('findNodeByType', () => {
    test('should find node when it is the root node', () => {
      const node: Identifier = {
        type: 'Identifier',
        name: 'test'
      };
      
      const result = findNodeByType<Identifier>(node, 'Identifier');
      expect(result).toEqual(node);
    });

    test('should find node in nested structure', () => {
      const targetNode: Identifier = {
        type: 'Identifier',
        name: 'target'
      };
      
      const ast: BinaryExpression = {
        type: 'BinaryExpression',
        left: { type: 'NumberLiteral', value: '1' },
        operator: '+',
        right: targetNode
      };
      
      const result = findNodeByType<Identifier>(ast, 'Identifier');
      expect(result).toEqual(targetNode);
    });

    test('should find node in array', () => {
      const targetNode: Identifier = {
        type: 'Identifier',
        name: 'target'
      };
      
      const ast: BlockStatement = {
        type: 'BlockStatement',
        statements: [
          { type: 'ExpressionStatement', expression: { type: 'NumberLiteral', value: '1' } },
          { type: 'ExpressionStatement', expression: targetNode }
        ]
      };
      
      const result = findNodeByType<Identifier>(ast, 'Identifier');
      expect(result).toEqual(targetNode);
    });

    test('should return null when node not found', () => {
      const ast: Node = {
        type: 'NumberLiteral',
        value: '42'
      };
      
      const result = findNodeByType<Identifier>(ast, 'Identifier');
      expect(result).toBeNull();
    });

    test('should handle complex nested structures', () => {
      const targetNode: Identifier = {
        type: 'Identifier',
        name: 'deep'
      };
      
      const ast: any = {
        type: 'Program',
        statements: [{
          type: 'FunctionDeclaration',
          name: { type: 'Identifier', name: 'foo' },
          body: {
            type: 'BlockStatement',
            statements: [{
              type: 'ExpressionStatement',
              expression: {
                type: 'BinaryExpression',
                left: targetNode,
                operator: '+',
                right: { type: 'NumberLiteral', value: '1' }
              }
            }]
          }
        }]
      };
      
      const result = findNodeByType<Identifier>(ast, 'Identifier');
      expect(result?.name).toBe('foo'); // Should find the first one
    });

    test('should skip non-node values in objects', () => {
      const targetNode: Identifier = {
        type: 'Identifier',
        name: 'target'
      };
      
      const ast: any = {
        type: 'CustomNode',
        stringValue: 'not a node',
        numberValue: 42,
        boolValue: true,
        nullValue: null,
        child: targetNode
      };
      
      const result = findNodeByType<Identifier>(ast, 'Identifier');
      expect(result).toEqual(targetNode);
    });

    test('should handle arrays with non-node items', () => {
      const targetNode: Identifier = {
        type: 'Identifier',
        name: 'target'
      };
      
      const ast: any = {
        type: 'CustomNode',
        items: [
          'string',
          42,
          null,
          { notANode: true },
          targetNode
        ]
      };
      
      const result = findNodeByType<Identifier>(ast, 'Identifier');
      expect(result).toEqual(targetNode);
    });
  });

  describe('PHP_SNIPPETS', () => {
    test('should contain all expected snippets', () => {
      expect(PHP_SNIPPETS.EMPTY).toBe('<?php ?>');
      expect(PHP_SNIPPETS.ECHO).toBe('<?php echo "Hello"; ?>');
      expect(PHP_SNIPPETS.VARIABLE).toBe('<?php $x = 42; ?>');
      expect(PHP_SNIPPETS.FUNCTION).toBe('<?php function foo() { return 42; } ?>');
      expect(PHP_SNIPPETS.CLASS).toBe('<?php class Foo {} ?>');
      expect(PHP_SNIPPETS.IF_STATEMENT).toBe('<?php if ($x > 0) { echo "positive"; } ?>');
      expect(PHP_SNIPPETS.FOR_LOOP).toBe('<?php for ($i = 0; $i < 10; $i++) { echo $i; } ?>');
      expect(PHP_SNIPPETS.WHILE_LOOP).toBe('<?php while ($x > 0) { $x--; } ?>');
      expect(PHP_SNIPPETS.FOREACH).toBe('<?php foreach ($arr as $key => $value) { echo $value; } ?>');
      expect(PHP_SNIPPETS.MATCH_EXPRESSION).toBe('<?php $result = match($x) { 1 => "one", 2 => "two", default => "other" }; ?>');
      expect(PHP_SNIPPETS.ARROW_FUNCTION).toBe('<?php $fn = fn($x) => $x * 2; ?>');
      expect(PHP_SNIPPETS.ENUM).toBe('<?php enum Status { case ACTIVE; case INACTIVE; } ?>');
      expect(PHP_SNIPPETS.READONLY_PROPERTY).toBe('<?php class Foo { public readonly string $bar; } ?>');
      expect(PHP_SNIPPETS.TERNARY).toBe('<?php $result = $x > 0 ? "positive" : "negative"; ?>');
      expect(PHP_SNIPPETS.NULL_COALESCING).toBe('<?php $value = $x ?? "default"; ?>');
      expect(PHP_SNIPPETS.NAMESPACE).toBe('<?php namespace App\\Models; class User {} ?>');
      expect(PHP_SNIPPETS.USE_STATEMENT).toBe('<?php use App\\Models\\User; ?>');
      expect(PHP_SNIPPETS.SYNTAX_ERROR).toBe('<?php class { ?>');
      expect(PHP_SNIPPETS.UNCLOSED_STRING).toBe('<?php $x = "unclosed string; ?>');
      expect(PHP_SNIPPETS.INVALID_VARIABLE).toBe('<?php $ = 42; ?>');
    });
  });
});