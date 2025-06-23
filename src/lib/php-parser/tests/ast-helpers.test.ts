import { describe, expect, test } from 'vitest';
import { transform } from '../utils/ast-helpers';
import type { Node, VariableExpression, IfStatement, BlockStatement, BinaryExpression } from '../core/ast';

describe('AST Helpers', () => {
  describe('transform', () => {
    test('should transform specific node types', () => {
      const ast: Node = {
        type: 'PhpProgram',
        children: [{
          type: 'ExpressionStatement',
          expression: {
            type: 'VariableExpression',
            name: 'foo'
          }
        }]
      };

      const result = transform(ast, {
        VariableExpression: (node) => ({
          ...node,
          name: node.name.toUpperCase()
        })
      });

      expect(result).not.toBeNull();
      if (result && result.type === 'PhpProgram' && result.children[0].type === 'ExpressionStatement') {
        const expr = result.children[0].expression;
        if (expr.type === 'VariableExpression') {
          expect(expr.name).toBe('FOO');
        }
      }
    });

    test('should remove nodes by returning null', () => {
      const ast: Node = {
        type: 'PhpProgram',
        children: [{
          type: 'IfStatement',
          condition: {
            type: 'BooleanLiteral',
            value: true
          },
          then: {
            type: 'BlockStatement',
            statements: []
          }
        }, {
          type: 'ExpressionStatement',
          expression: {
            type: 'VariableExpression',
            name: 'bar'
          }
        }]
      };

      const result = transform(ast, {
        IfStatement: () => null
      });

      expect(result).not.toBeNull();
      if (result && result.type === 'PhpProgram') {
        expect(result.children).toHaveLength(1);
        expect(result.children[0].type).toBe('ExpressionStatement');
      }
    });

    test('should provide context to handlers', () => {
      const ast: Node = {
        type: 'PhpProgram',
        children: [{
          type: 'BlockStatement',
          statements: [{
            type: 'IfStatement',
            condition: {
              type: 'BooleanLiteral',
              value: true
            },
            then: {
              type: 'BlockStatement',
              statements: []
            }
          }]
        }]
      };

      let contextParentType: string | undefined;
      
      transform(ast, {
        IfStatement: (node, context) => {
          contextParentType = context.parent?.type;
          return node;
        }
      });

      expect(contextParentType).toBe('BlockStatement');
    });

    test('should handle nested transformations', () => {
      const ast: Node = {
        type: 'PhpProgram',
        children: [{
          type: 'ExpressionStatement',
          expression: {
            type: 'BinaryExpression',
            left: {
              type: 'VariableExpression',
              name: 'a'
            },
            operator: '+',
            right: {
              type: 'VariableExpression',
              name: 'b'
            }
          }
        }]
      };

      const result = transform(ast, {
        VariableExpression: (node) => ({
          ...node,
          name: `$${node.name}`
        })
      });

      expect(result).not.toBeNull();
      if (result && result.type === 'PhpProgram' && result.children[0].type === 'ExpressionStatement') {
        const expr = result.children[0].expression;
        if (expr.type === 'BinaryExpression') {
          if (expr.left.type === 'VariableExpression') {
            expect(expr.left.name).toBe('$a');
          }
          if (expr.right.type === 'VariableExpression') {
            expect(expr.right.name).toBe('$b');
          }
        }
      }
    });

    test('should only transform nodes with handlers', () => {
      const ast: Node = {
        type: 'PhpProgram',
        children: [{
          type: 'ExpressionStatement',
          expression: {
            type: 'VariableExpression',
            name: 'foo'
          }
        }, {
          type: 'ExpressionStatement',
          expression: {
            type: 'NumberLiteral',
            value: 42
          }
        }]
      };

      const result = transform(ast, {
        VariableExpression: (node) => ({
          ...node,
          name: 'changed'
        })
      });

      expect(result).not.toBeNull();
      if (result && result.type === 'PhpProgram') {
        const first = result.children[0];
        const second = result.children[1];
        
        if (first.type === 'ExpressionStatement' && first.expression.type === 'VariableExpression') {
          expect(first.expression.name).toBe('changed');
        }
        
        if (second.type === 'ExpressionStatement' && second.expression.type === 'NumberLiteral') {
          expect(second.expression.value).toBe(42);
        }
      }
    });

    test('should handle removing root node', () => {
      const ast: Node = {
        type: 'IfStatement',
        condition: {
          type: 'BooleanLiteral',
          value: false
        },
        then: {
          type: 'BlockStatement',
          statements: []
        }
      };

      const result = transform(ast, {
        IfStatement: () => null
      });

      expect(result).toBeNull();
    });
  });
});