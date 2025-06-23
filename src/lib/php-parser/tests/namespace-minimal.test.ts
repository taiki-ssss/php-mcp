import { describe, expect, test } from 'vitest';
import { parsePhp } from './test-helpers';
import { walk } from '../analyzer/walker';

describe('Minimal Namespace Tests', () => {
  test('test 1: simple namespace', () => {
    const code = `<?php
namespace MyApp\\Models;
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
  
  test('test 2: namespace with empty line', () => {
    const code = `<?php
namespace MyApp\\Models;

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
  
  test('test 3: namespace with use statement', () => {
    const code = `<?php
namespace MyApp\\Models;

use Exception;
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