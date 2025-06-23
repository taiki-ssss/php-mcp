import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { parsePhp, tokenizePhp } from '../index';
import { walk } from '../analyzer/walker';
import { createVisitor } from '../analyzer/visitor';
import { transform } from '../../utils/ast-helpers';

describe('Integration Tests', () => {
  const testPhpPath = '/Users/yamamoto/Desktop/php-mcp/stub/test.php';
  const testPhpContent = readFileSync(testPhpPath, 'utf-8');

  describe('Full file parsing', () => {
    test('should successfully parse test.php', () => {
      const result = parsePhp(testPhpContent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.type).toBe('PhpProgram');
        expect(result.value.statements.length).toBeGreaterThan(0);
      }
    });

    test('should tokenize test.php without errors', () => {
      const result = tokenizePhp(testPhpContent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBeGreaterThan(100);

        // Check for various token types
        const tokenTypes = new Set(result.value.map(t => t.type));
        expect(tokenTypes.has('T_OPEN_TAG')).toBe(true);
        expect(tokenTypes.has('T_VARIABLE')).toBe(true);
        expect(tokenTypes.has('T_FUNCTION')).toBe(true);
        expect(tokenTypes.has('T_CLASS')).toBe(true);
        expect(tokenTypes.has('T_NAMESPACE')).toBe(true);
      }
    });
  });

  describe('AST structure validation', () => {
    test('should find all major constructs in test.php', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const constructs = {
        functions: [] as string[],
        classes: [] as string[],
        interfaces: [] as string[],
        traits: [] as string[],
        namespaces: [] as string[],
        enums: [] as string[]
      };

      walk(result.value, (node) => {
        switch (node.type) {
          case 'FunctionDeclaration':
            if (node.name) constructs.functions.push(node.name.name);
            break;
          case 'ClassDeclaration':
            if (node.name) constructs.classes.push(node.name.name);
            break;
          case 'InterfaceDeclaration':
            if (node.name) constructs.interfaces.push(node.name.name);
            break;
          case 'TraitDeclaration':
            if (node.name) constructs.traits.push(node.name.name);
            break;
          case 'NamespaceDeclaration':
            if (node.name) constructs.namespaces.push(node.name.parts.join('\\'));
            break;
          case 'EnumDeclaration':
            if (node.name) constructs.enums.push(node.name.name);
            break;
        }
      });

      // Verify expected constructs from test.php
      expect(constructs.functions).toContain('greet');
      expect(constructs.functions).toContain('add');
      expect(constructs.functions).toContain('generateNumbers');

      expect(constructs.classes).toContain('User');
      expect(constructs.classes).toContain('Product');
      expect(constructs.classes).toContain('Vehicle');
      expect(constructs.classes).toContain('Article');

      expect(constructs.interfaces).toContain('PaymentInterface');
      expect(constructs.traits).toContain('Timestampable');
      expect(constructs.namespaces).toContain('MyApp\\Models');
      expect(constructs.enums).toContain('Status');
    });

    test('should parse modern PHP features', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const features = {
        arrowFunctions: 0,
        matchExpressions: 0,
        nullCoalescing: 0,
        readonlyProperties: 0,
        generators: 0
      };

      walk(result.value, (node) => {
        switch (node.type) {
          case 'ArrowFunctionExpression':
            features.arrowFunctions++;
            break;
          case 'MatchExpression':
            features.matchExpressions++;
            break;
          case 'CoalesceExpression':
            features.nullCoalescing++;
            break;
          case 'PropertyDeclaration':
            if (node.modifiers.includes('readonly')) features.readonlyProperties++;
            break;
          case 'YieldExpression':
            features.generators++;
            break;
        }
      });

      expect(features.arrowFunctions).toBeGreaterThan(0);
      expect(features.matchExpressions).toBeGreaterThan(0);
      expect(features.nullCoalescing).toBeGreaterThan(0);
      expect(features.readonlyProperties).toBeGreaterThan(0);
      expect(features.generators).toBeGreaterThan(0);
    });
  });

  describe('Visitor pattern usage', () => {
    test('should collect all variables and their usage', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const variables = new Map<string, number>();

      const visitor = createVisitor({
        VariableExpression(node) {
          if (typeof node.name === 'string') {
            variables.set(node.name, (variables.get(node.name) || 0) + 1);
          }
        }
      });

      visitor.visit(result.value);

      // Check some expected variables
      expect(variables.has('name')).toBe(true);
      expect(variables.has('number')).toBe(true);
      expect(variables.has('fruits')).toBe(true);
      expect(variables.has('user')).toBe(true);

      // Verify usage counts
      expect(variables.get('number')).toBeGreaterThan(1); // Used in condition and match
    });

    test('should find all method calls', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const methodCalls: Array<{ object: string; method: string }> = [];

      const visitor = createVisitor({
        CallExpression(node) {
          if (node.callee.type === 'MemberExpression') {
            const object = node.callee.object.type === 'VariableExpression'
              ? node.callee.object.name as string
              : node.callee.object.type === 'ThisExpression'
                ? 'this'
                : 'unknown';

            const method = node.callee.property.type === 'Identifier'
              ? node.callee.property.name
              : 'unknown';

            methodCalls.push({ object, method });
          }
        }
      });

      visitor.visit(result.value);

      // Check for expected method calls
      expect(methodCalls.some(c => c.object === 'user' && c.method === 'getName')).toBe(true);
      expect(methodCalls.some(c => c.object === 'this')).toBe(true);
    });
  });

  describe('Transformer usage', () => {
    test('should transform all string literals to uppercase', () => {
      const code = `<?php
        $greeting = "hello";
        echo "world";
      ?>`;

      const result = parsePhp(code);
      if (!result.success) throw new Error('Parse failed');

      const transformed = transform(result.value, {
        StringLiteral(node: any) {
          return {
            ...node,
            value: node.value.toUpperCase()
          };
        }
      });

      const strings: string[] = [];
      if (transformed) walk(transformed, (node) => {
        if (node.type === 'StringLiteral') {
          strings.push(node.value);
        }
      });

      expect(strings).toEqual(['HELLO', 'WORLD']);
    });

    test('should add type hints to untyped parameters', () => {
      const code = `<?php
        function foo($param1, string $param2, $param3) {
          return $param1 + $param3;
        }
      ?>`;

      const result = parsePhp(code);
      if (!result.success) throw new Error('Parse failed');

      const transformed = transform(result.value, {
        Parameter(node: any) {
          if (!node.typeAnnotation) {
            return {
              ...node,
              typeAnnotation: {
                type: 'TypeReference',
                name: 'mixed',
                nullable: false
              }
            };
          }
          return node;
        }
      });

      const parameters: Array<{ name: string; hasType: boolean }> = [];
      if (transformed) walk(transformed, (node) => {
        if (node.type === 'Parameter') {
          const paramName = typeof node.name === 'string'
            ? node.name
            : node.name.type === 'VariableExpression'
              ? node.name.name as string
              : 'unknown';
          parameters.push({
            name: paramName,
            hasType: !!node.typeAnnotation
          });
        }
      });

      expect(parameters.every(p => p.hasType)).toBe(true);
    });
  });

  describe('Complex analysis scenarios', () => {
    test('should find all class hierarchies', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const hierarchies: Array<{ child: string; parent: string | null }> = [];

      walk(result.value, (node) => {
        if (node.type === 'ClassDeclaration' && node.name) {
          hierarchies.push({
            child: node.name.name,
            parent: node.superClass?.parts.join('\\') || null
          });
        }
      });

      // Vehicle is abstract, so there might be classes extending it
      const abstractClasses = hierarchies.filter(h => h.child === 'Vehicle');
      expect(abstractClasses).toHaveLength(1);
    });

    test('should analyze exception handling', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const exceptionHandling = {
        tryBlocks: 0,
        catchBlocks: 0,
        finallyBlocks: 0,
        throwStatements: 0,
        caughtExceptions: [] as string[]
      };

      walk(result.value, (node) => {
        switch (node.type) {
          case 'TryStatement':
            exceptionHandling.tryBlocks++;
            if (node.finalizer) exceptionHandling.finallyBlocks++;
            break;
          case 'CatchClause':
            exceptionHandling.catchBlocks++;
            node.types.forEach(type => {
              if (type.parts) {
                exceptionHandling.caughtExceptions.push(type.parts.join('\\'));
              }
            });
            break;
          case 'ThrowStatement':
            exceptionHandling.throwStatements++;
            break;
        }
      });

      expect(exceptionHandling.tryBlocks).toBeGreaterThan(0);
      expect(exceptionHandling.catchBlocks).toBeGreaterThan(0);
      expect(exceptionHandling.finallyBlocks).toBeGreaterThan(0);
      expect(exceptionHandling.throwStatements).toBeGreaterThan(0);
      expect(exceptionHandling.caughtExceptions).toContain('Exception');
    });

    test('should count all node types', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const nodeTypeCounts = new Map<string, number>();

      walk(result.value, (node) => {
        nodeTypeCounts.set(node.type, (nodeTypeCounts.get(node.type) || 0) + 1);
      });

      // Log statistics for debugging
      const sortedTypes = Array.from(nodeTypeCounts.entries())
        .sort((a, b) => b[1] - a[1]);

      // Verify we have a reasonable distribution of node types
      expect(nodeTypeCounts.size).toBeGreaterThan(20);
      expect(nodeTypeCounts.get('VariableExpression')).toBeGreaterThan(10);
      expect(nodeTypeCounts.get('StringLiteral')).toBeGreaterThan(5);
      expect(nodeTypeCounts.get('ExpressionStatement')).toBeGreaterThan(5);
    });
  });

  describe('Performance', () => {
    test('should parse large file efficiently', () => {
      const startTime = performance.now();
      const result = parsePhp(testPhpContent);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should parse in less than 1 second
    });

    test('should walk large AST efficiently', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const startTime = performance.now();
      let nodeCount = 0;

      walk(result.value, () => {
        nodeCount++;
      });

      const endTime = performance.now();

      expect(nodeCount).toBeGreaterThan(100);
      expect(endTime - startTime).toBeLessThan(100); // Should walk in less than 100ms
    });
  });

  describe('Edge cases from real PHP code', () => {
    test('should handle mixed HTML and PHP', () => {
      const code = `
        <html>
        <body>
          <?php echo "Hello"; ?>
          <h1><?= $title ?></h1>
          <?php
            foreach ($items as $item) {
              echo "<li>$item</li>";
            }
          ?>
        </body>
        </html>
      `;

      const result = parsePhp(code);
      expect(result.success).toBe(true);

      if (result.success) {
        let hasInlineHTML = false;
        walk(result.value, (node) => {
          if (node.type === 'InlineHTMLStatement') {
            hasInlineHTML = true;
          }
        });
        expect(hasInlineHTML).toBe(true);
      }
    });

    test('should handle complex namespace usage', () => {
      const result = parsePhp(testPhpContent);
      if (!result.success) throw new Error('Parse failed');

      const namespaceUsage = {
        declarations: [] as string[],
        qualifiedNames: [] as string[]
      };

      walk(result.value, (node) => {
        if (node.type === 'NamespaceDeclaration' && node.name) {
          namespaceUsage.declarations.push(node.name.parts.join('\\'));
        }
        if (node.type === 'QualifiedName') {
          namespaceUsage.qualifiedNames.push(node.parts.join('\\'));
        }
      });

      expect(namespaceUsage.declarations).toContain('MyApp\\Models');
      expect(namespaceUsage.qualifiedNames.length).toBeGreaterThan(0);
    });
  });
});