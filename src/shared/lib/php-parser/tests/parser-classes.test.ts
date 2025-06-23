import { describe, expect, test } from 'vitest';
import { expectParseSuccess, expectParseFail, getFirstStatement } from './test-utils';
import type { ClassDeclaration } from '../core/ast';

describe('Parser - Class Declarations', () => {
  describe('Basic classes', () => {
    test('should parse empty class', () => {
      const stmt = getFirstStatement('<?php class Foo {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.name.name).toBe('Foo');
        expect(stmt.body).toHaveLength(0);
      }
    });

    test('should parse class with extends', () => {
      const stmt = getFirstStatement('<?php class Foo extends Bar {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.superClass?.parts).toEqual(['Bar']);
      }
    });

    test('should parse class with implements', () => {
      const stmt = getFirstStatement('<?php class Foo implements Bar, Baz {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.interfaces).toHaveLength(2);
        expect(stmt.interfaces?.[0].parts).toEqual(['Bar']);
        expect(stmt.interfaces?.[1].parts).toEqual(['Baz']);
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

    test('should parse readonly class (PHP 8.1+)', () => {
      const stmt = getFirstStatement('<?php readonly class Foo {} ?>');
      expect(stmt.type).toBe('ClassDeclaration');
      if (stmt.type === 'ClassDeclaration') {
        expect(stmt.modifiers).toContain('readonly');
      }
    });
  });

  describe('Class properties', () => {
    test('should parse public property', () => {
      const stmt = getFirstStatement('<?php class Foo { public $bar; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('PropertyDeclaration');
      if (stmt.body[0].type === 'PropertyDeclaration') {
        expect(stmt.body[0].modifiers).toContain('public');
        expect(stmt.body[0].name.name).toBe('bar');
      }
    });

    test('should parse typed property', () => {
      const stmt = getFirstStatement('<?php class Foo { public string $bar; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'PropertyDeclaration') {
        expect(stmt.body[0].typeAnnotation?.type).toBe('SimpleType');
        if (stmt.body[0].typeAnnotation?.type === 'SimpleType') {
          expect(stmt.body[0].typeAnnotation.name).toBe('string');
        }
      }
    });

    test('should parse property with default value', () => {
      const stmt = getFirstStatement('<?php class Foo { public $bar = "hello"; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'PropertyDeclaration') {
        expect(stmt.body[0].initializer?.type).toBe('StringLiteral');
      }
    });

    test('should parse static property', () => {
      const stmt = getFirstStatement('<?php class Foo { public static $bar; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'PropertyDeclaration') {
        expect(stmt.body[0].modifiers).toContain('static');
      }
    });

    test('should parse readonly property', () => {
      const stmt = getFirstStatement('<?php class Foo { public readonly string $bar; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'PropertyDeclaration') {
        expect(stmt.body[0].modifiers).toContain('readonly');
      }
    });
  });

  describe('Class methods', () => {
    test('should parse public method', () => {
      const stmt = getFirstStatement('<?php class Foo { public function bar() {} } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('MethodDeclaration');
      if (stmt.body[0].type === 'MethodDeclaration') {
        expect(stmt.body[0].modifiers).toContain('public');
        expect(stmt.body[0].name.name).toBe('bar');
      }
    });

    test('should parse abstract method', () => {
      const stmt = getFirstStatement('<?php abstract class Foo { abstract public function bar(); } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'MethodDeclaration') {
        expect(stmt.body[0].modifiers).toContain('abstract');
        expect(stmt.body[0].body).toBeUndefined();
      }
    });

    test('should parse final method', () => {
      const stmt = getFirstStatement('<?php class Foo { final public function bar() {} } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'MethodDeclaration') {
        expect(stmt.body[0].modifiers).toContain('final');
      }
    });

    test('should parse constructor', () => {
      const stmt = getFirstStatement('<?php class Foo { public function __construct() {} } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'MethodDeclaration') {
        expect(stmt.body[0].name.name).toBe('__construct');
      }
    });

    test('should parse constructor property promotion', () => {
      const stmt = getFirstStatement('<?php class Foo { public function __construct(private string $bar) {} } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'MethodDeclaration') {
        expect(stmt.body[0].parameters).toHaveLength(1);
        expect(stmt.body[0].parameters[0].promoted).toContain('private');
      }
    });
  });

  describe('Class constants', () => {
    test('should parse public constant', () => {
      const stmt = getFirstStatement('<?php class Foo { public const BAR = 42; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('ConstantDeclaration');
      if (stmt.body[0].type === 'ConstantDeclaration') {
        expect(stmt.body[0].modifiers).toContain('public');
        expect(stmt.body[0].name.name).toBe('BAR');
      }
    });

    test('should parse typed constant', () => {
      const stmt = getFirstStatement('<?php class Foo { public const int BAR = 42; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'ConstantDeclaration') {
        expect(stmt.body[0].typeAnnotation?.type).toBe('SimpleType');
      }
    });
  });

  describe('Trait use', () => {
    test('should parse trait use', () => {
      const stmt = getFirstStatement('<?php class Foo { use Bar; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('TraitUseStatement');
      if (stmt.body[0].type === 'TraitUseStatement') {
        expect(stmt.body[0].traits).toHaveLength(1);
        expect(stmt.body[0].traits[0].parts).toEqual(['Bar']);
      }
    });

    test('should parse multiple trait use', () => {
      const stmt = getFirstStatement('<?php class Foo { use Bar, Baz; } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'TraitUseStatement') {
        expect(stmt.body[0].traits).toHaveLength(2);
      }
    });

    test('should parse trait use with adaptations', () => {
      const stmt = getFirstStatement('<?php class Foo { use Bar { bar as private; } } ?>') as ClassDeclaration;
      expect(stmt.body).toHaveLength(1);
      if (stmt.body[0].type === 'TraitUseStatement') {
        expect(stmt.body[0].adaptations).toHaveLength(1);
      }
    });
  });
});

describe('Parser - Interface Declarations', () => {
  test('should parse empty interface', () => {
    const stmt = getFirstStatement('<?php interface Foo {} ?>');
    expect(stmt.type).toBe('InterfaceDeclaration');
    if (stmt.type === 'InterfaceDeclaration') {
      expect(stmt.name.name).toBe('Foo');
      expect(stmt.body).toHaveLength(0);
    }
  });

  test('should parse interface with extends', () => {
    const stmt = getFirstStatement('<?php interface Foo extends Bar, Baz {} ?>');
    expect(stmt.type).toBe('InterfaceDeclaration');
    if (stmt.type === 'InterfaceDeclaration') {
      expect(stmt.extends).toHaveLength(2);
      expect(stmt.extends?.[0].parts).toEqual(['Bar']);
      expect(stmt.extends?.[1].parts).toEqual(['Baz']);
    }
  });

  test('should parse interface with methods', () => {
    const stmt = getFirstStatement('<?php interface Foo { public function bar(); } ?>');
    expect(stmt.type).toBe('InterfaceDeclaration');
    if (stmt.type === 'InterfaceDeclaration') {
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('MethodDeclaration');
    }
  });

  test('should parse interface with constants', () => {
    const stmt = getFirstStatement('<?php interface Foo { public const BAR = 42; } ?>');
    expect(stmt.type).toBe('InterfaceDeclaration');
    if (stmt.type === 'InterfaceDeclaration') {
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('ConstantDeclaration');
    }
  });
});

describe('Parser - Trait Declarations', () => {
  test('should parse empty trait', () => {
    const stmt = getFirstStatement('<?php trait Foo {} ?>');
    expect(stmt.type).toBe('TraitDeclaration');
    if (stmt.type === 'TraitDeclaration') {
      expect(stmt.name.name).toBe('Foo');
      expect(stmt.body).toHaveLength(0);
    }
  });

  test('should parse trait with properties', () => {
    const stmt = getFirstStatement('<?php trait Foo { private $bar; } ?>');
    expect(stmt.type).toBe('TraitDeclaration');
    if (stmt.type === 'TraitDeclaration') {
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('PropertyDeclaration');
    }
  });

  test('should parse trait with methods', () => {
    const stmt = getFirstStatement('<?php trait Foo { public function bar() {} } ?>');
    expect(stmt.type).toBe('TraitDeclaration');
    if (stmt.type === 'TraitDeclaration') {
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('MethodDeclaration');
    }
  });

  test('should parse trait using other traits', () => {
    const stmt = getFirstStatement('<?php trait Foo { use Bar; } ?>');
    expect(stmt.type).toBe('TraitDeclaration');
    if (stmt.type === 'TraitDeclaration') {
      expect(stmt.body).toHaveLength(1);
      expect(stmt.body[0].type).toBe('TraitUseStatement');
    }
  });
});

describe('Parser - Enum Declarations', () => {
  test('should parse simple enum', () => {
    const stmt = getFirstStatement('<?php enum Foo { case BAR; case BAZ; } ?>');
    expect(stmt.type).toBe('EnumDeclaration');
    if (stmt.type === 'EnumDeclaration') {
      expect(stmt.name.name).toBe('Foo');
      expect(stmt.body).toHaveLength(2);
      expect(stmt.body[0].type).toBe('EnumCase');
      expect(stmt.body[1].type).toBe('EnumCase');
    }
  });

  test('should parse backed enum', () => {
    const stmt = getFirstStatement('<?php enum Foo: string { case BAR = "bar"; case BAZ = "baz"; } ?>');
    expect(stmt.type).toBe('EnumDeclaration');
    if (stmt.type === 'EnumDeclaration') {
      expect(stmt.scalarType).toBe('string');
      expect(stmt.body).toHaveLength(2);
      if (stmt.body[0].type === 'EnumCase') {
        expect(stmt.body[0].value?.type).toBe('StringLiteral');
      }
    }
  });

  test('should parse enum with methods', () => {
    const stmt = getFirstStatement('<?php enum Foo { case BAR; public function label(): string {} } ?>');
    expect(stmt.type).toBe('EnumDeclaration');
    if (stmt.type === 'EnumDeclaration') {
      expect(stmt.body).toHaveLength(2);
      expect(stmt.body[0].type).toBe('EnumCase');
      expect(stmt.body[1].type).toBe('MethodDeclaration');
    }
  });

  test('should parse enum implementing interface', () => {
    const stmt = getFirstStatement('<?php enum Foo implements Bar { case BAZ; } ?>');
    expect(stmt.type).toBe('EnumDeclaration');
    if (stmt.type === 'EnumDeclaration') {
      expect(stmt.interfaces).toHaveLength(1);
      expect(stmt.interfaces?.[0].parts).toEqual(['Bar']);
    }
  });
});