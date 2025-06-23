import { describe, expect, test } from 'vitest';
import {
  NodeVisitorAbstract,
  TypedNodeVisitor,
  CompositeVisitor,
  VariableCollector,
  RenameVisitor,
  RemoveNodeVisitor,
  visitors,
  createVisitor,
  NodeVisitor
} from '../analyzer/visitor';
import type { Node, Identifier, VariableExpression, ExpressionStatement } from '../core/ast';

describe('Visitor Pattern (Legacy)', () => {
  describe('NodeVisitorAbstract', () => {
    test('should be instantiable', () => {
      class TestVisitor extends NodeVisitorAbstract {}
      const visitor = new TestVisitor();
      expect(visitor).toBeInstanceOf(NodeVisitorAbstract);
    });
  });

  describe('TypedNodeVisitor', () => {
    test('should handle specific node types', () => {
      const visitor = new TypedNodeVisitor();
      let variableCount = 0;
      let identifierCount = 0;

      visitor
        .on('VariableExpression', (node) => {
          variableCount++;
        })
        .on('Identifier', (node) => {
          identifierCount++;
        });

      const varNode: VariableExpression = {
        type: 'VariableExpression',
        name: 'test'
      };

      const idNode: Identifier = {
        type: 'Identifier',
        name: 'test'
      };

      visitor.enterNode(varNode);
      visitor.enterNode(idNode);

      expect(variableCount).toBe(1);
      expect(identifierCount).toBe(1);
    });

    test('should return undefined for unhandled types', () => {
      const visitor = new TypedNodeVisitor();
      const node: Node = { type: 'UnhandledType' } as any;
      
      const result = visitor.enterNode(node);
      expect(result).toBeUndefined();
    });

    test('should return handler result', () => {
      const visitor = new TypedNodeVisitor();
      visitor.on('VariableExpression', (node) => false);

      const node: VariableExpression = {
        type: 'VariableExpression',
        name: 'test'
      };

      const result = visitor.enterNode(node);
      expect(result).toBe(false);
    });
  });

  describe('CompositeVisitor', () => {
    test('should compose multiple visitors', () => {
      let visitor1Called = false;
      let visitor2Called = false;

      const visitor1: NodeVisitor = {
        enterNode: () => {
          visitor1Called = true;
          return undefined;
        }
      };

      const visitor2: NodeVisitor = {
        enterNode: () => {
          visitor2Called = true;
          return undefined;
        }
      };

      const composite = new CompositeVisitor(visitor1, visitor2);
      const node: Node = { type: 'TestNode' } as any;

      composite.enterNode(node);

      expect(visitor1Called).toBe(true);
      expect(visitor2Called).toBe(true);
    });

    test('should stop on first non-undefined result', () => {
      const visitor1: NodeVisitor = {
        enterNode: () => false
      };

      const visitor2: NodeVisitor = {
        enterNode: () => {
          throw new Error('Should not be called');
        }
      };

      const composite = new CompositeVisitor(visitor1, visitor2);
      const node: Node = { type: 'TestNode' } as any;

      const result = composite.enterNode(node);
      expect(result).toBe(false);
    });

    test('should handle leaveNode', () => {
      let leaveCalled = false;
      
      const visitor: NodeVisitor = {
        leaveNode: () => {
          leaveCalled = true;
          return undefined;
        }
      };

      const composite = new CompositeVisitor(visitor);
      const node: Node = { type: 'TestNode' } as any;

      composite.leaveNode(node);
      expect(leaveCalled).toBe(true);
    });

    test('should stop on first non-undefined result in leaveNode', () => {
      const modifiedNode = { type: 'ModifiedNode' } as any;
      
      const visitor1: NodeVisitor = {
        leaveNode: () => modifiedNode
      };

      const visitor2: NodeVisitor = {
        leaveNode: () => {
          throw new Error('Should not be called');
        }
      };

      const composite = new CompositeVisitor(visitor1, visitor2);
      const node: Node = { type: 'TestNode' } as any;

      const result = composite.leaveNode(node);
      expect(result).toBe(modifiedNode);
    });

    test('should handle visitors without methods', () => {
      const visitor1: NodeVisitor = {};
      const visitor2: NodeVisitor = {
        enterNode: () => false
      };

      const composite = new CompositeVisitor(visitor1, visitor2);
      const node: Node = { type: 'TestNode' } as any;

      const result = composite.enterNode(node);
      expect(result).toBe(false);
    });
  });

  describe('VariableCollector', () => {
    test('should collect variable names', () => {
      const collector = new VariableCollector();

      const var1: VariableExpression = {
        type: 'VariableExpression',
        name: 'foo'
      };

      const var2: VariableExpression = {
        type: 'VariableExpression',
        name: 'bar'
      };

      collector.enterNode(var1);
      collector.enterNode(var2);

      expect(collector.variables).toEqual(['foo', 'bar']);
    });

    test('should ignore non-string variable names', () => {
      const collector = new VariableCollector();

      const var1: VariableExpression = {
        type: 'VariableExpression',
        name: { type: 'ComplexName' } as any
      };

      collector.enterNode(var1);
      expect(collector.variables).toEqual([]);
    });

    test('should ignore non-variable nodes', () => {
      const collector = new VariableCollector();
      const node: Identifier = {
        type: 'Identifier',
        name: 'test'
      };

      collector.enterNode(node);
      expect(collector.variables).toEqual([]);
    });
  });

  describe('RenameVisitor', () => {
    test('should rename identifiers', () => {
      const visitor = new RenameVisitor('oldName', 'newName');
      
      const node: Identifier = {
        type: 'Identifier',
        name: 'oldName'
      };

      const result = visitor.enterNode(node);
      expect(result).toEqual({
        type: 'Identifier',
        name: 'newName'
      });
    });

    test('should rename variable expressions', () => {
      const visitor = new RenameVisitor('oldVar', 'newVar');
      
      const node: VariableExpression = {
        type: 'VariableExpression',
        name: 'oldVar'
      };

      const result = visitor.enterNode(node);
      expect(result).toEqual({
        type: 'VariableExpression',
        name: 'newVar'
      });
    });

    test('should ignore non-matching names', () => {
      const visitor = new RenameVisitor('oldName', 'newName');
      
      const node: Identifier = {
        type: 'Identifier',
        name: 'differentName'
      };

      const result = visitor.enterNode(node);
      expect(result).toBeUndefined();
    });

    test('should ignore non-string variable names', () => {
      const visitor = new RenameVisitor('oldVar', 'newVar');
      
      const node: VariableExpression = {
        type: 'VariableExpression',
        name: { type: 'ComplexName' } as any
      };

      const result = visitor.enterNode(node);
      expect(result).toBeUndefined();
    });
  });

  describe('RemoveNodeVisitor', () => {
    test('should remove nodes matching predicate', () => {
      const visitor = new RemoveNodeVisitor(
        node => node.type === 'VariableExpression'
      );

      const node: VariableExpression = {
        type: 'VariableExpression',
        name: 'test'
      };

      const result = visitor.enterNode(node);
      expect(result).toBeNull();
    });

    test('should keep nodes not matching predicate', () => {
      const visitor = new RemoveNodeVisitor(
        node => node.type === 'VariableExpression'
      );

      const node: Identifier = {
        type: 'Identifier',
        name: 'test'
      };

      const result = visitor.enterNode(node);
      expect(result).toBeUndefined();
    });
  });

  describe('visitors factory', () => {
    test('should create variable collector', () => {
      const collector = visitors.collectVariables();
      expect(collector).toBeInstanceOf(VariableCollector);
    });

    test('should create rename visitor', () => {
      const visitor = visitors.rename('old', 'new');
      expect(visitor).toBeInstanceOf(RenameVisitor);
    });

    test('should create remove visitor', () => {
      const visitor = visitors.remove(node => true);
      expect(visitor).toBeInstanceOf(RemoveNodeVisitor);
    });

    test('should create custom visitor', () => {
      let called = false;
      const visitor = visitors.create({
        enter: (node) => {
          called = true;
        }
      });
      
      const node: Node = { type: 'TestNode' } as any;
      visitor.enterNode?.(node);
      
      expect(called).toBe(true);
    });
  });

  describe('createVisitor helper', () => {
    test('should create visitor with handlers', () => {
      let varCount = 0;
      let idCount = 0;

      const visitor = createVisitor({
        VariableExpression: (node) => {
          varCount++;
        },
        Identifier: {
          enter: (node) => {
            idCount++;
          },
          leave: (node) => {
            idCount++;
          }
        }
      });

      const ast: Node[] = [
        { type: 'VariableExpression', name: 'test' } as VariableExpression,
        { type: 'Identifier', name: 'test' } as Identifier
      ];

      visitor.visit(ast);

      expect(varCount).toBe(1);
      expect(idCount).toBe(2); // enter + leave
    });

    test('should handle wildcard handler', () => {
      let nodeCount = 0;

      const visitor = createVisitor({
        '*': (node) => {
          nodeCount++;
        }
      });

      const ast: Node = {
        type: 'ExpressionStatement',
        expression: {
          type: 'VariableExpression',
          name: 'test'
        }
      } as ExpressionStatement;

      visitor.visit(ast);
      expect(nodeCount).toBe(2); // parent + child
    });

    test('should walk nested structures', () => {
      const visitedTypes: string[] = [];

      const visitor = createVisitor({
        '*': (node) => {
          visitedTypes.push(node.type);
        }
      });

      const ast: Node = {
        type: 'BlockStatement',
        statements: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'BinaryExpression',
              left: { type: 'VariableExpression', name: 'a' },
              operator: '+',
              right: { type: 'NumberLiteral', value: '5' }
            }
          }
        ]
      } as any;

      visitor.visit(ast);
      
      expect(visitedTypes).toEqual([
        'BlockStatement',
        'ExpressionStatement',
        'BinaryExpression',
        'VariableExpression',
        'NumberLiteral'
      ]);
    });

    test('should handle array of nodes', () => {
      let count = 0;
      
      const visitor = createVisitor({
        '*': () => count++
      });

      const nodes: Node[] = [
        { type: 'Identifier', name: 'a' } as Identifier,
        { type: 'Identifier', name: 'b' } as Identifier
      ];

      visitor.visit(nodes);
      expect(count).toBe(2);
    });
  });
});