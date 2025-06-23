import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePhp } from './test-helpers';
import { walk } from '../analyzer/walker';

describe('Namespace Integration Debug', () => {
  test('should find namespace in small-test.php', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    
    
    const result = parsePhp(testPhpContent);
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    result.value.statements.forEach((stmt, index) => {
      if (stmt.type === 'NamespaceDeclaration') {
        const ns = stmt as any;
      }
    });
    
    // Walk through all nodes
    const foundNamespaces: string[] = [];
    let nodeCount = 0;
    
    walk(result.value, (node) => {
      nodeCount++;
      if (node.type === 'NamespaceDeclaration') {
        if ((node as any).name) {
          foundNamespaces.push((node as any).name.parts.join('\\'));
        }
      }
    });
    
    
    // Check if namespace exists at all
    const hasNamespace = JSON.stringify(result.value).includes('NamespaceDeclaration');
    
    // Print first few nodes
  });
});