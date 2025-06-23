import { describe, expect, test } from 'vitest';
import { parsePhp } from './test-helpers';
import { walk } from '../analyzer/walker';
import { tokenize } from '../lexer/tokenizer';
import { parse } from '../parser/parser';

describe('Namespace Parsing Debug', () => {
  test('should parse namespace from simple PHP code', () => {
    const code = `<?php
namespace MyApp\\Models;

class User {}
`;
    
    const result = parsePhp(code);
    
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    // Check AST structure
    
    // Walk through AST to find namespace
    const namespaces: string[] = [];
    walk(result.value, (node) => {
      if (node.type === 'NamespaceDeclaration') {
        if (node.name) {
          namespaces.push(node.name.parts.join('\\'));
        }
      }
    });
    
    expect(namespaces).toContain('MyApp\\Models');
  });
  
  test('should parse namespace in test file', () => {
    const testCode = `<?php
namespace MyApp\\Models;

use Exception;

interface PaymentInterface {
    public function processPayment(float $amount): bool;
}

class User implements PaymentInterface {
    private int $id;
    
    public function processPayment(float $amount): bool {
        return true;
    }
}
`;
    
    const result = parsePhp(testCode);
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    // Debug: print full AST
    
    // Check top-level statements
    
    // Expect the first statement to be namespace
    expect(result.value.statements[0]?.type).toBe('NamespaceDeclaration');
    
    // Check that the namespace contains the expected declarations
    if (result.value.statements[0]?.type === 'NamespaceDeclaration') {
      const ns = result.value.statements[0];
      expect(ns.name?.parts).toEqual(['MyApp', 'Models']);
      
      // The namespace should contain use, interface, and class declarations
      const statementTypes = ns.statements.map(s => s.type);
      expect(statementTypes).toContain('UseStatement');
      expect(statementTypes).toContain('InterfaceDeclaration');
      expect(statementTypes).toContain('ClassDeclaration');
    }
  });
});