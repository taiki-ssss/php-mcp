import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePhp } from './test-helpers';
import { walk } from '../analyzer/walker';

describe('Final Debug', () => {
  test('debug small-test.php parsing step by step', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    
    // Test with just the first few lines
    const lines = testPhpContent.split('\n');
    
    // Test 1: Just namespace
    const code1 = lines.slice(0, 3).join('\n');
    const result1 = parsePhp(code1);
    if (result1.success) {
    }
    
    // Test 2: Namespace + use
    const code2 = lines.slice(0, 5).join('\n');
    const result2 = parsePhp(code2);
    if (result2.success) {
    }
    
    // Test 3: Full file
    const result3 = parsePhp(testPhpContent);
    if (result3.success) {
      
      // Walk to find namespaces
      const namespaces: string[] = [];
      walk(result3.value, (node) => {
        if (node.type === 'NamespaceDeclaration') {
          if ((node as any).name) {
            namespaces.push((node as any).name.parts.join('\\'));
          }
        }
      });
      
    }
  });
});