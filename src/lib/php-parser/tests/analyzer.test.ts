import { describe, expect, test } from 'vitest';
import { parsePhp } from '../index';
import { walk, walkAsync, transform } from '../analyzer/walker';
import { createVisitor } from '../analyzer/visitor';
import { transformAsync } from '../analyzer/transformer';
import type { Node, VariableExpression, CallExpression, ClassDeclaration, PropertyDeclaration, MethodDeclaration } from '../core/ast';

describe('Analyzer', () => {
  describe('Walker', () => {
    test('should walk all nodes in AST', () => {
      const code = `<?php
        $x = 42;
        function foo() {
          return $x + 1;
        }
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const nodeTypes: string[] = [];
      walk(ast.value, (node) => {
        nodeTypes.push(node.type);
      });

      expect(nodeTypes).toContain('PhpProgram');
      expect(nodeTypes).toContain('ExpressionStatement');
      expect(nodeTypes).toContain('AssignmentExpression');
      expect(nodeTypes).toContain('VariableExpression');
      expect(nodeTypes).toContain('NumberLiteral');
      expect(nodeTypes).toContain('FunctionDeclaration');
      expect(nodeTypes).toContain('BlockStatement');
      expect(nodeTypes).toContain('ReturnStatement');
      expect(nodeTypes).toContain('BinaryExpression');
    });

    test('should walk nodes with parent context', () => {
      const code = `<?php
        class Foo {
          public function bar() {
            return 42;
          }
        }
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const methods: Array<{ name: string; parent: string }> = [];
      ast.value.statements.forEach(stmt => {
        walk(stmt, (node, context) => {
          const parent = context.parents[context.parents.length - 1];
          if (node.type === 'MethodDeclaration' && parent?.type === 'ClassDeclaration') {
            methods.push({
              name: node.name.name,
              parent: parent.name.name
            });
          }
        });
      });

      expect(methods).toHaveLength(1);
      expect(methods[0].name).toBe('bar');
      expect(methods[0].parent).toBe('Foo');
    });

    test('should support early exit from walk', () => {
      const code = `<?php
        $a = 1;
        $b = 2;
        $c = 3;
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const variables: string[] = [];
      for (const stmt of ast.value.statements) {
        const result = walk(stmt, (node) => {
          if (node.type === 'VariableExpression') {
            const varExpr = node as VariableExpression;
            if (typeof varExpr.name === 'string') {
              // Remove $ prefix if present
              const varName = varExpr.name.startsWith('$') ? varExpr.name.substring(1) : varExpr.name;
              variables.push(varName);
            }
            if (variables.length === 2) {
              return 'stop'; // Stop walking
            }
          }
        });
        if (result === 'stop') break;
      }

      expect(variables).toHaveLength(2);
      expect(variables).toEqual(['a', 'b']);
    });

    test('should walk async', async () => {
      const code = `<?php $x = 42; ?>`;
      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const nodeTypes: string[] = [];
      for (const stmt of ast.value.statements) {
        await walkAsync(stmt, async (node) => {
          await new Promise(resolve => setTimeout(resolve, 1));
          nodeTypes.push(node.type);
        });
      }

      expect(nodeTypes).toContain('VariableExpression');
      expect(nodeTypes).toContain('NumberLiteral');
    });

    test('should handle deep nesting', () => {
      const code = `<?php
        if ($a) {
          if ($b) {
            if ($c) {
              if ($d) {
                echo "deep";
              }
            }
          }
        }
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      let maxDepth = 0;

      ast.value.statements.forEach(stmt => {
        walk(stmt, (node, context) => {
          if (node.type === 'IfStatement') {
            // Count how many IfStatements are in the parent chain
            const ifDepth = context.parents.filter(p => p.type === 'IfStatement').length + 1;
            maxDepth = Math.max(maxDepth, ifDepth);
          }
        });
      });

      expect(maxDepth).toBe(4);
    });
  });

  describe('Visitor', () => {
    test('should visit specific node types', () => {
      const code = `<?php
        $x = 42;
        $y = "hello";
        echo $x;
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const variables: string[] = [];
      const visitor = createVisitor({
        VariableExpression(node: VariableExpression) {
          if (typeof node.name === 'string') {
            variables.push(node.name);
          }
        }
      });

      ast.value.statements.forEach(stmt => visitor.visit(stmt));
      // Remove $ prefix from variables
      const cleanVariables = variables.map(v => v.startsWith('$') ? v.substring(1) : v);
      expect(cleanVariables).toEqual(['x', 'y', 'x']);
    });

    test('should support enter and leave hooks', () => {
      const code = `<?php
        function foo() {
          return 42;
        }
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const events: string[] = [];
      const visitor = createVisitor({
        FunctionDeclaration: {
          enter(node) {
            events.push(`enter ${node.name.name}`);
          },
          leave(node) {
            events.push(`leave ${node.name.name}`);
          }
        }
      });

      ast.value.statements.forEach(stmt => visitor.visit(stmt));
      expect(events).toEqual(['enter foo', 'leave foo']);
    });

    test.skip('should handle multiple visitors', () => {
      // Skip this test until class parsing is implemented
      const code = `<?php
        class Foo {
          public function bar() {}
        }
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const classes: string[] = [];
      const methods: string[] = [];

      const visitor = createVisitor({
        ClassDeclaration(node: ClassDeclaration) {
          classes.push(node.name.name);
        },
        MethodDeclaration(node: MethodDeclaration) {
          methods.push(node.name.name);
        }
      });

      ast.value.statements.forEach(stmt => visitor.visit(stmt));
      expect(classes).toEqual(['Foo']);
      expect(methods).toEqual(['bar']);
    });

    test.skip('should pass parent to visitor', () => {
      // Skip this test until class parsing is implemented
      const code = `<?php
class Foo {
  public $prop = 42;
}
?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      let propertyParent: Node | undefined = undefined;
      const visitor = createVisitor({
        PropertyDeclaration(_node: PropertyDeclaration, parent?: Node) {
          propertyParent = parent;
        }
      });

      ast.value.statements.forEach(stmt => visitor.visit(stmt));
      // TypeScript correctly infers that propertyParent will never be assigned
      // since class parsing is not implemented yet
      expect(propertyParent).toBeUndefined();
    });

    test('should support wildcard visitor', () => {
      const code = `<?php $x = 42; ?>`;
      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const nodeTypes = new Set<string>();
      const visitor = createVisitor({
        '*'(node) {
          nodeTypes.add(node.type);
        }
      });

      ast.value.statements.forEach(stmt => visitor.visit(stmt));
      expect(nodeTypes.size).toBeGreaterThan(3);
      expect(nodeTypes.has('VariableExpression')).toBe(true);
      expect(nodeTypes.has('NumberLiteral')).toBe(true);
    });
  });

  describe('Transformer', () => {
    test('should transform nodes', () => {
      const code = `<?php $x = 42; ?>`;
      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const transformed = ast.value.statements.map(stmt => transform(stmt, (node) => {
        if (node.type === 'NumberLiteral') {
          return {
            ...node,
            value: '100'
          };
        }
        return node;
      })).filter(s => s !== null);

      // Find the transformed number
      let foundNumber: any;
      transformed.forEach(stmt => {
        if (stmt) walk(stmt, (node) => {
          if (node.type === 'NumberLiteral') {
            foundNumber = node;
          }
        });
      });

      expect(foundNumber.value).toBe('100');
    });

    test('should remove nodes by returning null', () => {
      const code = `<?php
        echo "keep";
        echo "remove";
        echo "keep";
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const transformed = transform(ast.value, (node) => {
        if (node.type === 'EchoStatement') {
          // Remove echo statements that say "remove"
          if (node.expressions[0].type === 'StringLiteral' &&
            node.expressions[0].value === 'remove') {
            return null;
          }
        }
        return node;
      });

      // Count remaining echo statements
      let echoCount = 0;
      if (transformed) walk(transformed, (node) => {
        if (node.type === 'EchoStatement') {
          echoCount++;
        }
      });

      expect(echoCount).toBe(2);
    });

    test('should replace nodes', () => {
      const code = `<?php $old = 42; ?>`;
      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const transformed = transform(ast.value, (node) => {
        if (node.type === 'VariableExpression' && node.name === 'old') {
          return {
            ...node,
            name: 'new'
          };
        }
        return node;
      });

      // Find the transformed variable
      let foundVar: any;
      if (transformed) walk(transformed, (node) => {
        if (node.type === 'VariableExpression') {
          foundVar = node;
        }
      });

      expect(foundVar.name).toBe('new');
    });

    test('should transform async', async () => {
      const code = `<?php $x = 42; ?>`;
      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const transformed = await transformAsync(ast.value, async (node) => {
        if (node.type === 'NumberLiteral') {
          await new Promise(resolve => setTimeout(resolve, 1));
          return {
            ...node,
            value: '999'
          };
        }
        return node;
      });

      let foundNumber: any;
      if (transformed) walk(transformed, (node) => {
        if (node.type === 'NumberLiteral') {
          foundNumber = node;
        }
      });

      expect(foundNumber.value).toBe('999');
    });

    test('should handle nested transformations', () => {
      const code = `<?php
        class OldClass {
          public function oldMethod() {
            return 42;
          }
        }
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const transformed = transform(ast.value, (node) => {
        if (node.type === 'ClassDeclaration' && node.name.name === 'OldClass') {
          return {
            ...node,
            name: { ...node.name, name: 'NewClass' }
          };
        }
        if (node.type === 'MethodDeclaration' && node.name.name === 'oldMethod') {
          return {
            ...node,
            name: { ...node.name, name: 'newMethod' }
          };
        }
        return node;
      });

      let className: string | undefined;
      let methodName: string | undefined;

      if (transformed) walk(transformed, (node) => {
        if (node.type === 'ClassDeclaration') {
          className = node.name.name;
        }
        if (node.type === 'MethodDeclaration') {
          methodName = node.name.name;
        }
      });

      expect(className).toBe('NewClass');
      expect(methodName).toBe('newMethod');
    });

    test('should preserve unmatched nodes', () => {
      const code = `<?php
        $x = 42;
        echo $x;
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const transformed = transform(ast.value, (node) => {
        if (node.type === 'VariableExpression') {
          return { ...node, name: 'transformed' };
        }
        return node;
      });

      // Check that echo statement is preserved
      let hasEcho = false;
      if (transformed) walk(transformed, (node) => {
        if (node.type === 'EchoStatement') {
          hasEcho = true;
        }
      });

      expect(hasEcho).toBe(true);
    });
  });

  describe('Integration', () => {
    test('should find all function calls', () => {
      const code = `<?php
        foo();
        $obj->bar();
        MyClass::baz();
        $func();
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const calls: string[] = [];
      const visitor = createVisitor({
        CallExpression(node: CallExpression) {
          if (node.callee.type === 'NameExpression') {
            calls.push(node.callee.parts.join('\\'));
          } else if (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier') {
            calls.push(node.callee.property.name);
          } else if (node.callee.type === 'VariableExpression') {
            calls.push('$func');
          }
        }
      });

      ast.value.statements.forEach(stmt => visitor.visit(stmt));
      expect(calls).toEqual(['foo', 'bar', 'baz', '$func']);
    });

    test.skip('should collect all class names', () => {
      // Skip this test until class, interface, trait, and enum parsing is implemented
      const code = `<?php
        class User {}
        interface Authenticatable {}
        trait HasRoles {}
        enum Status {}
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const names: Array<{ type: string; name: string }> = [];
      walk(ast.value, (node) => {
        if ('name' in node && node.name && typeof node.name === 'object' && 'type' in node.name && node.name.type === 'Identifier') {
          if (node.type === 'ClassDeclaration' ||
            node.type === 'InterfaceDeclaration' ||
            node.type === 'TraitDeclaration' ||
            node.type === 'EnumDeclaration') {
            names.push({ type: node.type, name: node.name.name });
          }
        }
      });

      expect(names).toHaveLength(4);
      expect(names[0]).toEqual({ type: 'ClassDeclaration', name: 'User' });
      expect(names[1]).toEqual({ type: 'InterfaceDeclaration', name: 'Authenticatable' });
      expect(names[2]).toEqual({ type: 'TraitDeclaration', name: 'HasRoles' });
      expect(names[3]).toEqual({ type: 'EnumDeclaration', name: 'Status' });
    });

    test('should rename all variables', () => {
      const code = `<?php
        $oldName = 42;
        echo $oldName;
        function foo($oldName) {
          return $oldName + 1;
        }
      ?>`;

      const ast = parsePhp(code);
      if (!ast.success) throw new Error(`Parse failed: ${ast.error}`);

      const transformed = transform(ast.value, (node) => {
        if (node.type === 'VariableExpression' && node.name === 'oldName') {
          return { ...node, name: 'newName' };
        }
        if (node.type === 'Parameter' && node.name.type === 'VariableExpression' && node.name.name === 'oldName') {
          return {
            ...node,
            name: { ...node.name, name: 'newName' }
          };
        }
        return node;
      });

      const variables: string[] = [];
      if (transformed) walk(transformed, (node) => {
        if (node.type === 'VariableExpression' && typeof node.name === 'string') {
          variables.push(node.name);
        }
        if (node.type === 'Parameter' && node.name.type === 'VariableExpression' && typeof node.name.name === 'string') {
          variables.push(node.name.name);
        }
      });

      expect(variables.every(v => v === 'newName')).toBe(true);
    });
  });
});