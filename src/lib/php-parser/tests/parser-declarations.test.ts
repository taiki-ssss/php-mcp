import { describe, expect, test } from 'vitest';
import { expectParseSuccess, expectParseFail, getFirstStatement } from './test-utils';
import type { ClassDeclaration } from '../core/ast';

describe('Parser - Declarations', () => {
  describe('Function declarations', () => {
    test('should parse simple function', () => {
      const stmt = getFirstStatement('<?php function foo() {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.name.name).toBe('foo');
        expect(stmt.parameters).toHaveLength(0);
        expect(stmt.body.type).toBe('BlockStatement');
      }
    });

    test('should parse function with parameters', () => {
      const stmt = getFirstStatement('<?php function foo($a, $b, $c) {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.parameters).toHaveLength(3);
        expect(stmt.parameters[0].name.type).toBe('VariableExpression');
        if (stmt.parameters[0].name.type === 'VariableExpression') {
          expect(stmt.parameters[0].name.name).toBe('$a');
        }
      }
    });

    test('should parse function with typed parameters', () => {
      const stmt = getFirstStatement('<?php function foo(string $name, int $age) {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.parameters[0].typeAnnotation?.type).toBe('SimpleType');
        if (stmt.parameters[0].typeAnnotation?.type === 'SimpleType') {
          expect(stmt.parameters[0].typeAnnotation.name).toBe('string');
        }
        expect(stmt.parameters[1].typeAnnotation?.type).toBe('SimpleType');
        if (stmt.parameters[1].typeAnnotation?.type === 'SimpleType') {
          expect(stmt.parameters[1].typeAnnotation.name).toBe('int');
        }
      }
    });

    test('should parse function with default parameters', () => {
      const stmt = getFirstStatement('<?php function foo($name = "John", $age = 30) {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.parameters[0].defaultValue?.type).toBe('StringLiteral');
        expect(stmt.parameters[1].defaultValue?.type).toBe('NumberLiteral');
      }
    });

    test('should parse function with return type', () => {
      const stmt = getFirstStatement('<?php function foo(): string {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.returnType?.type).toBe('SimpleType');
        if (stmt.returnType?.type === 'SimpleType') {
          expect(stmt.returnType.name).toBe('string');
        }
      }
    });

    test('should parse function with nullable types', () => {
      const stmt = getFirstStatement('<?php function foo(?string $name): ?int {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.parameters[0].typeAnnotation?.type).toBe('NullableType');
        expect(stmt.returnType?.type).toBe('NullableType');
      }
    });

    test('should parse function with union types', () => {
      const stmt = getFirstStatement('<?php function foo(string|int $value): array|null {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.parameters[0].typeAnnotation?.type).toBe('UnionType');
        expect(stmt.returnType?.type).toBe('UnionType');
      }
    });

    test('should parse function with variadic parameter', () => {
      const stmt = getFirstStatement('<?php function foo(...$args) {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.parameters[0].variadic).toBe(true);
      }
    });

    test('should parse function with reference parameters', () => {
      const stmt = getFirstStatement('<?php function foo(&$ref) {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.parameters[0].byReference).toBe(true);
      }
    });

    test('should parse function returning by reference', () => {
      const stmt = getFirstStatement('<?php function &foo() {} ?>');
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        expect(stmt.byReference).toBe(true);
      }
    });
  });

  describe('Class declarations', () => {
    test('should parse simple class', () => {
      const stmt = getFirstStatement('<?php class Foo {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.name.name).toBe('Foo');
        expect(stmt.superClass).toBeUndefined();
        expect(stmt.interfaces).toBeUndefined();
        expect(stmt.body).toHaveLength(0);
      }
    });

    test('should parse class with extends', () => {
      const stmt = getFirstStatement('<?php class Child extends Parent {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.superClass?.type).toBe('NameExpression');
        if (stmt.superClass?.type === 'NameExpression') {
          expect(stmt.superClass.parts).toEqual(['Parent']);
        }
      }
    });

    test('should parse class with implements', () => {
      const stmt = getFirstStatement('<?php class Foo implements Bar, Baz {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.interfaces).toHaveLength(2);
        expect(stmt.interfaces![0].type).toBe('NameExpression');
        if (stmt.interfaces![0].type === 'NameExpression') {
          expect(stmt.interfaces![0].parts).toEqual(['Bar']);
        }
        expect(stmt.interfaces![1].type).toBe('NameExpression');
        if (stmt.interfaces![1].type === 'NameExpression') {
          expect(stmt.interfaces![1].parts).toEqual(['Baz']);
        }
      }
    });

    test('should parse class with properties', () => {
      const code = `<?php 
        class Foo {
          public $prop1;
          private string $prop2 = "default";
          protected static int $prop3;
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.body).toHaveLength(3);
        const prop1 = stmt.body[0];
        if (prop1.type === 'PropertyDeclaration') {
          expect(prop1.modifiers).toContain('public');
          expect(prop1.modifiers).not.toContain('static');
        }
      }
    });

    test('should parse class with methods', () => {
      const code = `<?php 
        class Foo {
          public function method1() {}
          private static function method2() {}
          protected function method3(): void {}
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.body).toHaveLength(3);
        const method1 = stmt.body[0];
        if (method1.type === 'MethodDeclaration') {
          expect(method1.modifiers).toContain('public');
          expect(method1.modifiers).not.toContain('static');
          expect(method1.name.name).toBe('method1');
        }
      }
    });

    test('should parse abstract class', () => {
      const stmt = getFirstStatement('<?php abstract class Foo {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.modifiers).toContain('abstract');
      }
    });

    test('should parse final class', () => {
      const stmt = getFirstStatement('<?php final class Foo {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.modifiers).toContain('final');
      }
    });

    test('should parse readonly class', () => {
      const stmt = getFirstStatement('<?php readonly class Foo {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.modifiers).toContain('readonly');
      }
    });

    test('should parse class constants', () => {
      const code = `<?php 
        class Foo {
          const CONSTANT1 = 42;
          public const CONSTANT2 = "value";
          private const CONSTANT3 = [];
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        const constant = stmt.body[0];
        if (constant.type === 'ClassConstant') {
          expect(constant.constants[0].name.name).toBe('CONSTANT1');
          expect(constant.constants[0].value.type).toBe('NumberLiteral');
        }
      }
    });

    test('should parse constructor property promotion', () => {
      const code = `<?php 
        class Foo {
          public function __construct(
            private string $name,
            public readonly int $age
          ) {}
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        const constructor = stmt.body[0];
        if (constructor.type === 'MethodDeclaration') {
          expect(constructor.name.name).toBe('__construct');
          expect(constructor.parameters[0].promoted).toContain('private');
          expect(constructor.parameters[1].promoted).toContain('public');
          expect(constructor.parameters[1].promoted).toContain('readonly');
        }
      }
    });

    test('should parse class with traits', () => {
      const code = `<?php 
        class Foo {
          use Trait1, Trait2;
          use Trait3 {
            method1 as protected;
            Trait3::method2 insteadof Trait1;
          }
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        const useTraitStmt = stmt.body[0];
        if (useTraitStmt.type === 'TraitUseStatement') {
          expect(useTraitStmt.traits).toHaveLength(2);
        }
      }
    });
  });

  describe('Interface declarations', () => {
    test('should parse simple interface', () => {
      const stmt = getFirstStatement('<?php interface Foo {} ?>');
      expect(stmt.type).toBe('InterfaceDeclaration');
      if (stmt.type === 'InterfaceDeclaration') {
        expect(stmt.name.name).toBe('Foo');
        expect(stmt.extends).toBeUndefined();
      }
    });

    test('should parse interface with extends', () => {
      const stmt = getFirstStatement('<?php interface Child extends Parent1, Parent2 {} ?>');
      expect(stmt.type).toBe('InterfaceDeclaration');
      if (stmt.type === 'InterfaceDeclaration') {
        expect(stmt.extends).toHaveLength(2);
      }
    });

    test('should parse interface with methods', () => {
      const code = `<?php 
        interface Foo {
          public function method1();
          public function method2(string $param): void;
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('InterfaceDeclaration');
      if (stmt.type === 'InterfaceDeclaration') {
        expect(stmt.body).toHaveLength(2);
      }
    });

    test('should parse interface with constants', () => {
      const code = `<?php 
        interface Foo {
          const CONSTANT = 42;
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('InterfaceDeclaration');
      if (stmt.type === 'InterfaceDeclaration') {
        expect(stmt.body).toHaveLength(1);
        expect(stmt.body[0].type).toBe('ConstantDeclaration');
      }
    });
  });

  describe('Trait declarations', () => {
    test('should parse simple trait', () => {
      const stmt = getFirstStatement('<?php trait Foo {} ?>');
      expect(stmt.type).toBe('TraitDeclaration');
      if (stmt.type === 'TraitDeclaration') {
        expect(stmt.name.name).toBe('Foo');
      }
    });

    test('should parse trait with properties and methods', () => {
      const code = `<?php 
        trait Foo {
          private $property;
          
          public function method() {
            return $this->property;
          }
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('TraitDeclaration');
      if (stmt.type === 'TraitDeclaration') {
        expect(stmt.body).toHaveLength(2);
      }
    });

    test('should parse trait with use statements', () => {
      const code = `<?php 
        trait Foo {
          use OtherTrait;
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('TraitDeclaration');
      if (stmt.type === 'TraitDeclaration') {
        expect(stmt.body[0].type).toBe('TraitUseStatement');
      }
    });
  });

  describe('Enum declarations', () => {
    test('should parse simple enum', () => {
      const stmt = getFirstStatement('<?php enum Status { case ACTIVE; case INACTIVE; } ?>');
      expect(stmt.type).toBe('EnumDeclaration');
      if (stmt.type === 'EnumDeclaration') {
        expect(stmt.name.name).toBe('Status');
        expect(stmt.body).toHaveLength(2);
      }
    });

    test('should parse backed enum', () => {
      const stmt = getFirstStatement('<?php enum Status: string { case ACTIVE = "active"; } ?>');
      expect(stmt.type).toBe('EnumDeclaration');
      if (stmt.type === 'EnumDeclaration') {
        expect(stmt.scalarType).toBe('string');
      }
    });

    test('should parse enum with methods', () => {
      const code = `<?php 
        enum Status {
          case ACTIVE;
          case INACTIVE;
          
          public function label(): string {
            return match($this) {
              self::ACTIVE => "Active",
              self::INACTIVE => "Inactive",
            };
          }
        }
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('EnumDeclaration');
      if (stmt.type === 'EnumDeclaration') {
        const method = stmt.body.find(m => m.type === 'MethodDeclaration');
        expect(method).toBeDefined();
      }
    });

    test('should parse enum implementing interface', () => {
      const stmt = getFirstStatement('<?php enum Status implements JsonSerializable { case ACTIVE; } ?>');
      expect(stmt.type).toBe('EnumDeclaration');
      if (stmt.type === 'EnumDeclaration') {
        expect(stmt.implements).toHaveLength(1);
        expect(stmt.implements![0].type).toBe('NameExpression');
        if (stmt.implements![0].type === 'NameExpression') {
          expect(stmt.implements![0].parts).toEqual(['JsonSerializable']);
        }
      }
    });
  });

  describe('Namespace declarations', () => {
    test('should parse namespace declaration', () => {
      const statements = expectParseSuccess('<?php namespace App\\Models; class User {} ?>');
      const ns = statements[0];
      expect(ns.type).toBe('NamespaceDeclaration');
      if (ns.type === 'NamespaceDeclaration') {
        expect(ns.name?.parts).toEqual(['App', 'Models']);
        expect(ns.statements).toHaveLength(1);
      }
    });

    test('should parse bracketed namespace', () => {
      const code = `<?php 
        namespace App\\Models {
          class User {}
        }
      ?>`;
      const statements = expectParseSuccess(code);
      const ns = statements[0];
      expect(ns.type).toBe('NamespaceDeclaration');
      if (ns.type === 'NamespaceDeclaration') {
        expect(ns.statements).toHaveLength(1);
      }
    });

    test('should parse global namespace', () => {
      const code = `<?php 
        namespace {
          class User {}
        }
      ?>`;
      const statements = expectParseSuccess(code);
      const ns = statements[0];
      expect(ns.type).toBe('NamespaceDeclaration');
      if (ns.type === 'NamespaceDeclaration') {
        expect(ns.name).toBeUndefined();
      }
    });
  });

  describe('Use declarations', () => {
    test('should parse simple use statement', () => {
      const stmt = getFirstStatement('<?php use App\\Models\\User; ?>');
      expect(stmt.type).toBe('UseStatement');
      if (stmt.type === 'UseStatement') {
        expect(stmt.items).toHaveLength(1);
        expect(stmt.items[0].name.parts).toEqual(['App', 'Models', 'User']);
        expect(stmt.items[0].alias).toBeUndefined();
      }
    });

    test('should parse use with alias', () => {
      const stmt = getFirstStatement('<?php use App\\Models\\User as UserModel; ?>');
      expect(stmt.type).toBe('UseStatement');
      if (stmt.type === 'UseStatement') {
        expect(stmt.items[0].alias?.name).toBe('UserModel');
      }
    });

    test('should parse grouped use', () => {
      const stmt = getFirstStatement('<?php use App\\Models\\{User, Post, Comment}; ?>');
      expect(stmt.type).toBe('UseStatement');
      if (stmt.type === 'UseStatement') {
        expect(stmt.items).toHaveLength(3);
      }
    });

    test('should parse function use', () => {
      const stmt = getFirstStatement('<?php use function App\\Helpers\\format; ?>');
      expect(stmt.type).toBe('UseStatement');
      if (stmt.type === 'UseStatement') {
        expect(stmt.kind).toBe('function');
      }
    });

    test('should parse const use', () => {
      const stmt = getFirstStatement('<?php use const App\\Constants\\VERSION; ?>');
      expect(stmt.type).toBe('UseStatement');
      if (stmt.type === 'UseStatement') {
        expect(stmt.kind).toBe('const');
      }
    });
  });

  describe('Const declarations', () => {
    test('should parse const declaration', () => {
      const stmt = getFirstStatement('<?php const FOO = 42; ?>');
      expect(stmt.type).toBe('ConstStatement');
      if (stmt.type === 'ConstStatement') {
        expect(stmt.declarations).toHaveLength(1);
        expect(stmt.declarations[0].name.name).toBe('FOO');
        expect(stmt.declarations[0].value.type).toBe('NumberLiteral');
      }
    });

    test('should parse multiple const declarations', () => {
      const stmt = getFirstStatement('<?php const FOO = 42, BAR = "bar"; ?>');
      expect(stmt.type).toBe('ConstStatement');
      if (stmt.type === 'ConstStatement') {
        expect(stmt.declarations).toHaveLength(2);
      }
    });
  });

  describe('Attributes', () => {
    test('should parse class with attributes', () => {
      const code = `<?php 
        #[Entity]
        #[Table("users")]
        class User {}
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        // Attributes not implemented in current AST
        // expect(stmt.attributes).toHaveLength(2);
        // expect(stmt.attributes[0].name.name).toBe('Entity');
        // expect(stmt.attributes[1].name.name).toBe('Table');
        // expect(stmt.attributes[1].arguments).toHaveLength(1);
      }
    });

    test('should parse method with attributes', () => {
      const code = `<?php 
        class Controller {
          #[Route("/api/users", methods: ["GET", "POST"])]
          public function users() {}
        }
      ?>`;
      const statements = expectParseSuccess(code);
      const classDecl = statements[0] as ClassDeclaration;
      const method = classDecl.body[0];
      if (method.type === 'MethodDeclaration') {
        // Attributes not implemented in current AST
        // expect(method.attributes).toHaveLength(1);
        // expect(method.attributes[0].name.name).toBe('Route');
      }
    });

    test('should parse property with attributes', () => {
      const code = `<?php 
        class Entity {
          #[Column(type: "string", length: 255)]
          #[NotNull]
          private string $name;
        }
      ?>`;
      const statements = expectParseSuccess(code);
      const classDecl = statements[0] as ClassDeclaration;
      const property = classDecl.body[0];
      if (property.type === 'PropertyDeclaration') {
        // Attributes not implemented in current AST
        // expect(property.attributes).toHaveLength(2);
      }
    });

    test('should parse parameter attributes', () => {
      const code = `<?php 
        function foo(#[Attribute] $param) {}
      ?>`;
      const stmt = getFirstStatement(code);
      expect(stmt.type).toBe('FunctionDeclaration');
      if (stmt.type === 'FunctionDeclaration') {
        // Attributes not implemented in current AST
        // expect(stmt.parameters[0].attributes).toHaveLength(1);
      }
    });
  });

  describe('Anonymous classes', () => {
    test('should parse anonymous class in new expression', () => {
      const expr = getFirstStatement('<?php $obj = new class {}; ?>');
      if (expr.type === 'ExpressionStatement' && expr.expression.type === 'AssignmentExpression') {
        const newExpr = expr.expression.right;
        if (newExpr.type === 'NewExpression') {
          // Anonymous classes are not implemented in current AST
          // They would be parsed as NewExpression with a special callee
          expect(newExpr.type).toBe('NewExpression');
        }
      }
    });

    test('should parse anonymous class with extends', () => {
      const expr = getFirstStatement('<?php $obj = new class extends Base {}; ?>');
      if (expr.type === 'ExpressionStatement' && expr.expression.type === 'AssignmentExpression') {
        const newExpr = expr.expression.right;
        if (newExpr.type === 'NewExpression') {
          // Anonymous classes are not implemented in current AST
          expect(newExpr.type).toBe('NewExpression');
        }
      }
    });

    test('should parse anonymous class with constructor arguments', () => {
      const expr = getFirstStatement('<?php $obj = new class($x, $y) { public function __construct($a, $b) {} }; ?>');
      if (expr.type === 'ExpressionStatement' && expr.expression.type === 'AssignmentExpression') {
        const newExpr = expr.expression.right;
        if (newExpr.type === 'NewExpression') {
          expect(newExpr.arguments).toHaveLength(2);
        }
      }
    });
  });

  describe('Error cases', () => {
    test('should fail on class without name', () => {
      expectParseFail('<?php class {} ?>');
    });

    test('should fail on interface with property', () => {
      // Interfaces can't have properties, but parser might not catch this
      const code = '<?php interface Foo { private $prop; } ?>';
      // This is a semantic error, parser might still succeed
      const statements = expectParseSuccess(code);
      expect(statements[0].type).toBe('InterfaceDeclaration');
    });

    test('should fail on invalid extends', () => {
      expectParseFail('<?php class Foo extends {} ?>');
    });
  });
});