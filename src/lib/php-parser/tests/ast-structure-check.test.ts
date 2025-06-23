import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePhp } from './test-helpers';

describe('AST Structure Check', () => {
  test('check actual AST structure of small-test.php', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    
    const result = parsePhp(testPhpContent);
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    // Print full AST structure with limited depth
    function printAST(node: any, depth = 0, maxDepth = 3) {
      if (depth > maxDepth) return;
      
      const indent = '  '.repeat(depth);
      
      if (node.type === 'PhpProgram' && node.statements) {
        node.statements.forEach((stmt: any) => printAST(stmt, depth + 2, maxDepth));
      } else if (node.type === 'NamespaceDeclaration') {
        if (node.name) {
        }
        if (node.statements) {
            node.statements.forEach((stmt: any) => printAST(stmt, depth + 2, maxDepth));
        }
      } else if (node.name?.name) {
      }
    }
    
    printAST(result.value, 0, 4);
    
    // Check if namespace is at top level
    const hasTopLevelNamespace = result.value.statements.some(
      (stmt: any) => stmt.type === 'NamespaceDeclaration'
    );
    
    
    if (hasTopLevelNamespace) {
      const ns = result.value.statements.find(
        (stmt: any) => stmt.type === 'NamespaceDeclaration'
      );
    }
  });
});