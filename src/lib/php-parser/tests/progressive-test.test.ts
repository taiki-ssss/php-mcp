import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePhp } from './test-helpers';

describe('Progressive Test', () => {
  test('add code progressively to find breaking point', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    const lines = testPhpContent.split('\n');
    
    // Test progressively
    const tests = [
      { lines: 8, desc: 'namespace + use + interface' },
      { lines: 12, desc: '+ trait' },
      { lines: 17, desc: '+ enum' },
      { lines: 22, desc: '+ abstract class' },
      { lines: 30, desc: '+ User class' },
      { lines: 50, desc: '+ functions' },
      { lines: lines.length, desc: 'full file' }
    ];
    
    for (const test of tests) {
      const code = lines.slice(0, test.lines).join('\n');
      
      const result = parsePhp(code);
      if (result.success) {
        
        // Check if namespace is at top level
        const hasNamespace = result.value.statements.some(s => s.type === 'NamespaceDeclaration');
      } else {
      }
    }
  });
});