import { describe, expect, test } from 'vitest';
import { parsePhp } from './test-helpers';
import { walk } from '../analyzer/walker';

describe('Complex Namespace Tests', () => {
  test('namespace with interface', () => {
    const code = `<?php
namespace MyApp\\Models;

use Exception;

interface PaymentInterface {
    public function processPayment(float $amount): bool;
}
`;
    
    const result = parsePhp(code);
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    
    const namespaces: string[] = [];
    walk(result.value, (node) => {
      if (node.type === 'NamespaceDeclaration' && (node as any).name) {
        namespaces.push((node as any).name.parts.join('\\'));
      }
    });
    
    expect(namespaces).toContain('MyApp\\Models');
  });
  
  test('exact copy of small-test.php beginning', () => {
    // Copy exact content from small-test.php
    const code = `<?php
namespace MyApp\\Models;

use Exception;

interface PaymentInterface {
    public function processPayment(float $amount): bool;
}

trait Timestampable {
    private \\DateTime $createdAt;
}

enum Status: string {
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
}
`;
    
    const result = parsePhp(code);
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    
    const namespaces: string[] = [];
    walk(result.value, (node) => {
      if (node.type === 'NamespaceDeclaration' && (node as any).name) {
        namespaces.push((node as any).name.parts.join('\\'));
      }
    });
    
    expect(namespaces).toContain('MyApp\\Models');
  });
});