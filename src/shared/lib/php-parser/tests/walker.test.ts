import { describe, expect, test } from 'vitest';
import {
  walk, transform, findFirst, findNodes,
  is, WalkContext, WalkerFunction, walkAsync
} from '../analyzer/walker';
import type { Node, VariableExpression, BinaryExpression, BlockStatement, 
  IfStatement, FunctionDeclaration, Identifier, NumberLiteral, WhileStatement,
  ForStatement, ForeachStatement, ReturnStatement, ThrowStatement, TryStatement,
  CatchClause, ClassDeclaration, UnaryExpression, AssignmentExpression,
  CallExpression, MemberExpression, ArrayExpression, FunctionExpression,
  ArrowFunctionExpression, ConditionalExpression, ElseIfClause, Program,
  ExpressionStatement } from '../core/ast';

describe('Walker Module', () => {
  describe('walk', () => {
    test('should walk single node', () => {
      const visited: string[] = [];
      const node: Node = {
        type: 'VariableExpression',
        name: 'test'
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(['VariableExpression']);
    });

    test('should walk array of nodes', () => {
      const visited: string[] = [];
      const nodes: Node[] = [
        { type: 'VariableExpression', name: 'a' },
        { type: 'Identifier', name: 'b' }
      ];

      walk(nodes, (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(['VariableExpression', 'Identifier']);
    });

    test('should walk nested nodes', () => {
      const visited: string[] = [];
      const node: BinaryExpression = {
        type: 'BinaryExpression',
        left: { type: 'VariableExpression', name: 'a' },
        operator: '+',
        right: { type: 'NumberLiteral', value: '5' }
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(['BinaryExpression', 'VariableExpression', 'NumberLiteral']);
    });

    test('should skip child nodes when returning skip', () => {
      const visited: string[] = [];
      const node: BinaryExpression = {
        type: 'BinaryExpression',
        left: { type: 'VariableExpression', name: 'a' },
        operator: '+',
        right: { type: 'NumberLiteral', value: '5' }
      };

      walk(node, (n) => {
        visited.push(n.type);
        if (n.type === 'BinaryExpression') {
          return 'skip';
        }
      });

      expect(visited).toEqual(['BinaryExpression']);
    });

    test('should stop walking when returning stop', () => {
      const visited: string[] = [];
      const nodes: Node[] = [
        { type: 'VariableExpression', name: 'a' },
        { type: 'Identifier', name: 'b' },
        { type: 'NumberLiteral', value: '5' }
      ];

      const result = walk(nodes, (n) => {
        visited.push(n.type);
        if (n.type === 'Identifier') {
          return 'stop';
        }
      });

      expect(visited).toEqual(['VariableExpression', 'Identifier']);
      expect(result).toBe('stop');
    });

    test('should return value when walker returns value', () => {
      const node: VariableExpression = {
        type: 'VariableExpression',
        name: 'test'
      };

      const result = walk(node, (n) => {
        if (n.type === 'VariableExpression') {
          return (n as VariableExpression).name;
        }
      });

      expect(result).toBe('test');
    });

    test('should provide context with parents and depth', () => {
      const contexts: Array<{ type: string; depth: number; parentType?: string }> = [];
      const node: BinaryExpression = {
        type: 'BinaryExpression',
        left: { type: 'VariableExpression', name: 'a' },
        operator: '+',
        right: { type: 'NumberLiteral', value: '5' }
      };

      walk(node, (n, ctx) => {
        contexts.push({
          type: n.type,
          depth: ctx.depth,
          parentType: ctx.parents[ctx.parents.length - 1]?.type
        });
      });

      expect(contexts).toEqual([
        { type: 'BinaryExpression', depth: 0, parentType: undefined },
        { type: 'VariableExpression', depth: 1, parentType: 'BinaryExpression' },
        { type: 'NumberLiteral', depth: 1, parentType: 'BinaryExpression' }
      ]);
    });

    test('should pass user context', () => {
      const node: Node = { type: 'Identifier', name: 'test' };
      let receivedContext: any;

      walk(node, (n, ctx) => {
        receivedContext = ctx.userContext;
      }, { custom: 'data' });

      expect(receivedContext).toEqual({ custom: 'data' });
    });
  });


  describe('transform', () => {
    test('should transform nodes', () => {
      const node: VariableExpression = {
        type: 'VariableExpression',
        name: 'old'
      };

      const result = transform(node, (n) => {
        if (n.type === 'VariableExpression') {
          return { ...n, name: 'new' };
        }
        return n;
      });

      expect(result).toEqual({
        type: 'VariableExpression',
        name: 'new'
      });
    });

    test('should remove nodes by returning null', () => {
      const node: BlockStatement = {
        type: 'BlockStatement',
        statements: [
          { type: 'VariableExpression', name: 'a' },
          { type: 'Identifier', name: 'b' },
          { type: 'VariableExpression', name: 'c' }
        ]
      };

      const result = transform(node, (n) => {
        if (n.type === 'VariableExpression') {
          return null;
        }
        return n;
      });

      expect(result).toEqual({
        type: 'BlockStatement',
        statements: [
          { type: 'Identifier', name: 'b' }
        ]
      });
    });

    test('should transform with context', () => {
      const node: BinaryExpression = {
        type: 'BinaryExpression',
        left: { type: 'VariableExpression', name: 'a' },
        operator: '+',
        right: { type: 'NumberLiteral', value: '5' }
      };

      const result = transform(node, (n, ctx) => {
        if (n.type === 'VariableExpression' && ctx.depth > 0) {
          return { ...n, name: 'nested' };
        }
        return n;
      });

      if (result && result.type === 'BinaryExpression') {
        expect((result.left as VariableExpression).name).toBe('nested');
      }
    });
  });

  describe('find functions', () => {
    const createTestAst = (): BlockStatement => ({
      type: 'BlockStatement',
      statements: [
        {
          type: 'FunctionDeclaration',
          name: { type: 'Identifier', name: 'foo' },
          parameters: [],
          body: {
            type: 'BlockStatement',
            statements: [
              { type: 'VariableExpression', name: 'x' }
            ]
          }
        },
        { type: 'VariableExpression', name: 'y' },
        { type: 'Identifier', name: 'z' }
      ]
    });

    test('findNodes should find all matching nodes', () => {
      const ast = createTestAst();
      const vars = findNodes(ast, (node): node is VariableExpression => 
        node.type === 'VariableExpression'
      );

      expect(vars).toHaveLength(2);
      expect(vars.map(v => v.name)).toEqual(['x', 'y']);
    });

    test('findFirst should find first matching node', () => {
      const ast = createTestAst();
      const firstVar = findFirst(ast, (node): node is VariableExpression => 
        node.type === 'VariableExpression'
      );

      expect(firstVar).toBeDefined();
      expect(firstVar?.name).toBe('x');
    });

  });


  describe('is type guards', () => {
    test('is.Statement should identify statements', () => {
      expect(is.Statement({ type: 'ExpressionStatement' } as any)).toBe(true);
      expect(is.Statement({ type: 'FunctionDeclaration' } as any)).toBe(true);
      expect(is.Statement({ type: 'VariableExpression' } as any)).toBe(false);
    });

    test('is.Expression should identify expressions', () => {
      expect(is.Expression({ type: 'BinaryExpression' } as any)).toBe(true);
      expect(is.Expression({ type: 'StringLiteral' } as any)).toBe(true);
      expect(is.Expression({ type: 'Identifier' } as any)).toBe(true);
      expect(is.Expression({ type: 'VariableExpression' } as any)).toBe(true);
      expect(is.Expression({ type: 'NameExpression' } as any)).toBe(true);
      expect(is.Expression({ type: 'ExpressionStatement' } as any)).toBe(false);
    });

    test('is.Declaration should identify declarations', () => {
      expect(is.Declaration({ type: 'FunctionDeclaration' } as any)).toBe(true);
      expect(is.Declaration({ type: 'ClassDeclaration' } as any)).toBe(true);
      expect(is.Declaration({ type: 'VariableExpression' } as any)).toBe(false);
    });

    test('is.Literal should identify literals', () => {
      expect(is.Literal({ type: 'StringLiteral' } as any)).toBe(true);
      expect(is.Literal({ type: 'NumberLiteral' } as any)).toBe(true);
      expect(is.Literal({ type: 'BooleanLiteral' } as any)).toBe(true);
      expect(is.Literal({ type: 'NullLiteral' } as any)).toBe(true);
      expect(is.Literal({ type: 'VariableExpression' } as any)).toBe(false);
    });
  });

  describe('walkAsync', () => {
    test('should walk single node asynchronously', async () => {
      const visited: string[] = [];
      const node: Node = {
        type: 'VariableExpression',
        name: 'test'
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(['VariableExpression']);
    });

    test('should walk array of nodes asynchronously', async () => {
      const visited: string[] = [];
      const nodes: Node[] = [
        { type: 'VariableExpression', name: 'a' },
        { type: 'Identifier', name: 'b' }
      ];

      await walkAsync(nodes, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(['VariableExpression', 'Identifier']);
    });

    test('should handle stop signal in async walk', async () => {
      const visited: string[] = [];
      const nodes: Node[] = [
        { type: 'VariableExpression', name: 'a' },
        { type: 'Identifier', name: 'b' },
        { type: 'NumberLiteral', value: '5' }
      ];

      await walkAsync(nodes, async (n) => {
        visited.push(n.type);
        if (n.type === 'Identifier') {
          return 'stop';
        }
      });

      expect(visited).toEqual(['VariableExpression', 'Identifier']);
    });

    test('should return value from async walker', async () => {
      const node: VariableExpression = {
        type: 'VariableExpression',
        name: 'test'
      };

      const result = await walkAsync(node, async (n) => {
        if (n.type === 'VariableExpression') {
          return (n as VariableExpression).name;
        }
      });

      expect(result).toBe('test');
    });

    test('should handle skip in async walk', async () => {
      const visited: string[] = [];
      const node: BinaryExpression = {
        type: 'BinaryExpression',
        left: { type: 'VariableExpression', name: 'a' },
        operator: '+',
        right: { type: 'NumberLiteral', value: '5' }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
        if (n.type === 'BinaryExpression') {
          return 'skip';
        }
      });

      expect(visited).toEqual(['BinaryExpression']);
    });

    test('should walk IfStatement with elseifs asynchronously', async () => {
      const visited: string[] = [];
      const node: IfStatement = {
        type: 'IfStatement',
        test: { type: 'BooleanLiteral', value: true },
        consequent: { type: 'BlockStatement', statements: [] },
        elseifs: [{
          type: 'ElseIfClause',
          test: { type: 'BooleanLiteral', value: false },
          consequent: { type: 'BlockStatement', statements: [] }
        }],
        alternate: { type: 'BlockStatement', statements: [] }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('IfStatement');
      expect(visited).toContain('ElseIfClause');
    });

    test('should walk WhileStatement asynchronously', async () => {
      const visited: string[] = [];
      const node: WhileStatement = {
        type: 'WhileStatement',
        test: { type: 'BooleanLiteral', value: true },
        body: {
          type: 'BlockStatement',
          statements: [{ type: 'BreakStatement' }]
        }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('WhileStatement');
      expect(visited).toContain('BooleanLiteral');
      expect(visited).toContain('BlockStatement');
      expect(visited).toContain('BreakStatement');
    });

    test('should walk ForStatement with all parts asynchronously', async () => {
      const visited: string[] = [];
      const node: ForStatement = {
        type: 'ForStatement',
        init: {
          type: 'AssignmentExpression',
          left: { type: 'VariableExpression', name: 'i' },
          operator: '=',
          right: { type: 'NumberLiteral', value: '0' }
        },
        test: {
          type: 'BinaryExpression',
          left: { type: 'VariableExpression', name: 'i' },
          operator: '<',
          right: { type: 'NumberLiteral', value: '10' }
        },
        update: {
          type: 'UnaryExpression',
          operator: '++',
          argument: { type: 'VariableExpression', name: 'i' }
        },
        body: { type: 'BlockStatement', statements: [] }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ForStatement');
      expect(visited).toContain('AssignmentExpression');
      expect(visited).toContain('BinaryExpression');
      expect(visited).toContain('UnaryExpression');
    });

    test('should walk ForeachStatement with key asynchronously', async () => {
      const visited: string[] = [];
      const node: ForeachStatement = {
        type: 'ForeachStatement',
        expression: { type: 'VariableExpression', name: 'array' },
        key: { type: 'VariableExpression', name: 'k' },
        value: { type: 'VariableExpression', name: 'v' },
        body: { type: 'BlockStatement', statements: [] }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ForeachStatement');
      expect(visited.filter(t => t === 'VariableExpression')).toHaveLength(3);
    });

    test('should walk ReturnStatement with value asynchronously', async () => {
      const visited: string[] = [];
      const node: ReturnStatement = {
        type: 'ReturnStatement',
        value: { type: 'NumberLiteral', value: '42' }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ReturnStatement');
      expect(visited).toContain('NumberLiteral');
    });

    test('should walk ThrowStatement asynchronously', async () => {
      const visited: string[] = [];
      const node: ThrowStatement = {
        type: 'ThrowStatement',
        expression: { type: 'StringLiteral', value: 'error' }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ThrowStatement');
      expect(visited).toContain('StringLiteral');
    });

    test('should walk TryStatement with finalizer asynchronously', async () => {
      const visited: string[] = [];
      const node: TryStatement = {
        type: 'TryStatement',
        block: { type: 'BlockStatement', statements: [] },
        handlers: [{
          type: 'CatchClause',
          param: { type: 'VariableExpression', name: 'e' },
          body: { type: 'BlockStatement', statements: [] }
        }],
        finalizer: { type: 'BlockStatement', statements: [] }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('TryStatement');
      expect(visited).toContain('CatchClause');
      expect(visited.filter(t => t === 'BlockStatement').length).toBeGreaterThanOrEqual(3);
    });

    test('should walk FunctionDeclaration with returnType asynchronously', async () => {
      const visited: string[] = [];
      const node: FunctionDeclaration = {
        type: 'FunctionDeclaration',
        name: { type: 'Identifier', name: 'foo' },
        parameters: [{ type: 'Parameter', name: { type: 'Identifier', name: 'x' } }],
        returnType: { type: 'TypeReference', name: 'string' },
        body: { type: 'BlockStatement', statements: [] }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('FunctionDeclaration');
      expect(visited).toContain('TypeReference');
      expect(visited).toContain('Parameter');
    });

    test('should walk ClassDeclaration with superClass and interfaces asynchronously', async () => {
      const visited: string[] = [];
      const node: ClassDeclaration = {
        type: 'ClassDeclaration',
        name: { type: 'Identifier', name: 'MyClass' },
        superClass: { type: 'Identifier', name: 'BaseClass' },
        interfaces: [
          { type: 'Identifier', name: 'Interface1' },
          { type: 'Identifier', name: 'Interface2' }
        ],
        body: []
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ClassDeclaration');
      expect(visited.filter(t => t === 'Identifier')).toHaveLength(4);
    });

    test('should walk BinaryExpression asynchronously', async () => {
      const visited: string[] = [];
      const node: BinaryExpression = {
        type: 'BinaryExpression',
        left: { type: 'NumberLiteral', value: '1' },
        operator: '+',
        right: { type: 'NumberLiteral', value: '2' }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(['BinaryExpression', 'NumberLiteral', 'NumberLiteral']);
    });

    test('should walk UnaryExpression asynchronously', async () => {
      const visited: string[] = [];
      const node: UnaryExpression = {
        type: 'UnaryExpression',
        operator: '!',
        argument: { type: 'BooleanLiteral', value: true }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('UnaryExpression');
      expect(visited).toContain('BooleanLiteral');
    });

    test('should walk AssignmentExpression asynchronously', async () => {
      const visited: string[] = [];
      const node: AssignmentExpression = {
        type: 'AssignmentExpression',
        left: { type: 'VariableExpression', name: 'x' },
        operator: '=',
        right: { type: 'NumberLiteral', value: '10' }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('AssignmentExpression');
      expect(visited).toContain('VariableExpression');
      expect(visited).toContain('NumberLiteral');
    });

    test('should walk CallExpression asynchronously', async () => {
      const visited: string[] = [];
      const node: CallExpression = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'foo' },
        arguments: [
          { value: { type: 'NumberLiteral', value: '1' } },
          { value: { type: 'StringLiteral', value: 'test' } }
        ]
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('CallExpression');
      expect(visited).toContain('Identifier');
      expect(visited).toContain('NumberLiteral');
      expect(visited).toContain('StringLiteral');
    });

    test('should walk MemberExpression asynchronously', async () => {
      const visited: string[] = [];
      const node: MemberExpression = {
        type: 'MemberExpression',
        object: { type: 'VariableExpression', name: 'obj' },
        property: { type: 'Identifier', name: 'prop' },
        computed: false
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('MemberExpression');
      expect(visited).toContain('VariableExpression');
      expect(visited).toContain('Identifier');
    });

    test('should walk ArrayExpression asynchronously', async () => {
      const visited: string[] = [];
      const node: ArrayExpression = {
        type: 'ArrayExpression',
        elements: [
          { type: 'NumberLiteral', value: '1' },
          { type: 'StringLiteral', value: 'test' }
        ]
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ArrayExpression');
      expect(visited).toContain('NumberLiteral');
      expect(visited).toContain('StringLiteral');
    });

    test('should walk FunctionExpression with returnType asynchronously', async () => {
      const visited: string[] = [];
      const node: FunctionExpression = {
        type: 'FunctionExpression',
        parameters: [{ type: 'Parameter', name: { type: 'Identifier', name: 'x' } }],
        returnType: { type: 'TypeReference', name: 'number' },
        body: { type: 'BlockStatement', statements: [] }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('FunctionExpression');
      expect(visited).toContain('TypeReference');
      expect(visited).toContain('Parameter');
    });

    test('should walk ArrowFunctionExpression asynchronously', async () => {
      const visited: string[] = [];
      const node: ArrowFunctionExpression = {
        type: 'ArrowFunctionExpression',
        parameters: [],
        body: { type: 'NumberLiteral', value: '42' }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ArrowFunctionExpression');
      expect(visited).toContain('NumberLiteral');
    });

    test('should walk ConditionalExpression with consequent asynchronously', async () => {
      const visited: string[] = [];
      const node: ConditionalExpression = {
        type: 'ConditionalExpression',
        test: { type: 'BooleanLiteral', value: true },
        consequent: { type: 'NumberLiteral', value: '1' },
        alternate: { type: 'NumberLiteral', value: '2' }
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ConditionalExpression');
      expect(visited).toContain('BooleanLiteral');
      expect(visited.filter(t => t === 'NumberLiteral')).toHaveLength(2);
    });

    test('should walk generic node type asynchronously', async () => {
      const visited: string[] = [];
      // Custom node type that isn't explicitly handled
      const node: any = {
        type: 'CustomNodeType',
        child: { type: 'Identifier', name: 'test' },
        children: [
          { type: 'NumberLiteral', value: '1' },
          { type: 'StringLiteral', value: 'test' }
        ]
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('CustomNodeType');
      expect(visited).toContain('Identifier');
      expect(visited).toContain('NumberLiteral');
      expect(visited).toContain('StringLiteral');
    });

    test('should handle sync walker function in walkAsync', async () => {
      const visited: string[] = [];
      const node: Node = {
        type: 'Identifier',
        name: 'test'
      };

      // Using sync function in async walk
      await walkAsync(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(['Identifier']);
    });

    test('should walk Program node asynchronously', async () => {
      const visited: string[] = [];
      const node: Program = {
        type: 'Program',
        statements: [
          { type: 'ExpressionStatement', expression: { type: 'NumberLiteral', value: '1' } },
          { type: 'ExpressionStatement', expression: { type: 'StringLiteral', value: 'test' } }
        ]
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('Program');
      expect(visited.filter(t => t === 'ExpressionStatement')).toHaveLength(2);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle nodes with complex nested arrays', () => {
      const visited: string[] = [];
      const node: any = {
        type: 'ComplexNode',
        items: [
          { type: 'Item1', nested: [{ type: 'Nested1' }] },
          { type: 'Item2', nested: [{ type: 'Nested2' }] }
        ]
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ComplexNode');
      expect(visited).toContain('Item1');
      expect(visited).toContain('Item2');
      expect(visited).toContain('Nested1');
      expect(visited).toContain('Nested2');
    });

    test('should handle transform removing root node', () => {
      const node: Node = { type: 'Identifier', name: 'test' };
      const result = transform(node, () => null);
      expect(result).toBeNull();
    });

    test('should handle stop in nested async walk', async () => {
      const visited: string[] = [];
      const node: BlockStatement = {
        type: 'BlockStatement',
        statements: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'BinaryExpression',
              left: { type: 'NumberLiteral', value: '1' },
              operator: '+',
              right: { type: 'NumberLiteral', value: '2' }
            }
          }
        ]
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
        if (n.type === 'BinaryExpression') {
          return 'stop';
        }
      });

      expect(visited).toContain('BlockStatement');
      expect(visited).toContain('ExpressionStatement');
      expect(visited).toContain('BinaryExpression');
      expect(visited).not.toContain('NumberLiteral');
    });

    test('should handle ReturnStatement without value', () => {
      const visited: string[] = [];
      const node: ReturnStatement = {
        type: 'ReturnStatement'
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(['ReturnStatement']);
    });

    test('should handle ConditionalExpression without consequent', () => {
      const visited: string[] = [];
      const node: ConditionalExpression = {
        type: 'ConditionalExpression',
        test: { type: 'BooleanLiteral', value: true },
        alternate: { type: 'NumberLiteral', value: '2' }
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ConditionalExpression');
      expect(visited).toContain('BooleanLiteral');
      expect(visited).toContain('NumberLiteral');
    });

    test('should handle stop signal in generic node walk', () => {
      const visited: string[] = [];
      const node: any = {
        type: 'CustomNode',
        items: [
          { type: 'Item1' },
          { type: 'Item2' },
          { type: 'Item3' }
        ]
      };

      walk(node, (n) => {
        visited.push(n.type);
        if (n.type === 'Item2') {
          return 'stop';
        }
      });

      expect(visited).toContain('CustomNode');
      expect(visited).toContain('Item1');
      expect(visited).toContain('Item2');
      expect(visited).not.toContain('Item3');
    });

    test('should handle stop in async array walk', async () => {
      const visited: string[] = [];
      const node: any = {
        type: 'CustomNodeAsync',
        children: [
          { type: 'Child1' },
          { type: 'Child2' },
          { type: 'Child3' }
        ]
      };

      await walkAsync(node, async (n) => {
        visited.push(n.type);
        if (n.type === 'Child2') {
          return 'stop';
        }
      });

      expect(visited).toContain('CustomNodeAsync');
      expect(visited).toContain('Child1');
      expect(visited).toContain('Child2');
      expect(visited).not.toContain('Child3');
    });

    test('should handle ForStatement without optional parts', () => {
      const visited: string[] = [];
      const node: ForStatement = {
        type: 'ForStatement',
        body: { type: 'BlockStatement', statements: [] }
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ForStatement');
      expect(visited).toContain('BlockStatement');
    });

    test('should handle ForeachStatement without key', () => {
      const visited: string[] = [];
      const node: ForeachStatement = {
        type: 'ForeachStatement',
        expression: { type: 'VariableExpression', name: 'array' },
        value: { type: 'VariableExpression', name: 'v' },
        body: { type: 'BlockStatement', statements: [] }
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ForeachStatement');
      expect(visited.filter(t => t === 'VariableExpression')).toHaveLength(2);
    });

    test('should handle TryStatement without finalizer', () => {
      const visited: string[] = [];
      const node: TryStatement = {
        type: 'TryStatement',
        block: { type: 'BlockStatement', statements: [] },
        handlers: [{
          type: 'CatchClause',
          param: { type: 'VariableExpression', name: 'e' },
          body: { type: 'BlockStatement', statements: [] }
        }]
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('TryStatement');
      expect(visited).toContain('CatchClause');
    });

    test('should handle FunctionDeclaration without returnType', () => {
      const visited: string[] = [];
      const node: FunctionDeclaration = {
        type: 'FunctionDeclaration',
        name: { type: 'Identifier', name: 'foo' },
        parameters: [],
        body: { type: 'BlockStatement', statements: [] }
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('FunctionDeclaration');
      expect(visited).toContain('Identifier');
      expect(visited).toContain('BlockStatement');
    });

    test('should handle ClassDeclaration without superClass and interfaces', () => {
      const visited: string[] = [];
      const node: ClassDeclaration = {
        type: 'ClassDeclaration',
        name: { type: 'Identifier', name: 'MyClass' },
        body: []
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('ClassDeclaration');
      expect(visited).toContain('Identifier');
    });

    test('should handle FunctionExpression without returnType', () => {
      const visited: string[] = [];
      const node: FunctionExpression = {
        type: 'FunctionExpression',
        parameters: [],
        body: { type: 'BlockStatement', statements: [] }
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('FunctionExpression');
      expect(visited).toContain('BlockStatement');
    });

    test('should handle IfStatement without elseifs and alternate', () => {
      const visited: string[] = [];
      const node: IfStatement = {
        type: 'IfStatement',
        test: { type: 'BooleanLiteral', value: true },
        consequent: { type: 'BlockStatement', statements: [] }
      };

      walk(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toContain('IfStatement');
      expect(visited).toContain('BooleanLiteral');
      expect(visited).toContain('BlockStatement');
    });

    test('should return stop from walk on single node', () => {
      const node: Node = {
        type: 'Identifier',
        name: 'test'
      };

      const result = walk(node, () => 'stop');
      expect(result).toBe('stop');
    });

    test('should handle transform on arrays with items being removed', () => {
      const nodes: Node[] = [
        { type: 'VariableExpression', name: 'a' },
        { type: 'VariableExpression', name: 'b' },
        { type: 'VariableExpression', name: 'c' }
      ];

      const result = transform(nodes[0], (n) => {
        if (n.type === 'VariableExpression' && (n as VariableExpression).name === 'b') {
          return null;
        }
        return n;
      });

      expect(result).toEqual({ type: 'VariableExpression', name: 'a' });
    });

    test('should handle walkAsync returning stop from single node', async () => {
      const node: Node = {
        type: 'Identifier',
        name: 'test'
      };

      const result = await walkAsync(node, async () => 'stop');
      expect(result).toBeUndefined(); // stop doesn't return value from single node
    });

    test('should handle transform with non-node values in arrays', () => {
      const node: any = {
        type: 'CustomNode',
        items: [
          { type: 'Node1' },
          'not a node',
          { type: 'Node2' }
        ]
      };

      const transformed = transform(node, (n) => n);
      expect(transformed).toEqual(node);
    });
  });
});