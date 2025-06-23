import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tokenize } from '../lexer/tokenizer';
import { parse } from '../parser/parser';
import { walk } from '../analyzer/walker';

describe('Namespace Parsing Without Filter', () => {
  test('parse small-test.php without token filtering', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    
    // Tokenize without filtering
    const tokens = tokenize(testPhpContent);
    
    
    // Parse with all tokens
    const ast = parse(tokens);
    
    ast.statements.forEach((stmt, index) => {
      if (stmt.type === 'NamespaceDeclaration') {
        const ns = stmt as any;
      }
    });
    
    // Walk and find namespaces
    const namespaces: string[] = [];
    walk(ast, (node) => {
      if (node.type === 'NamespaceDeclaration' && (node as any).name) {
        namespaces.push((node as any).name.parts.join('\\'));
      }
    });
    
    expect(namespaces).toContain('MyApp\\Models');
  });
});