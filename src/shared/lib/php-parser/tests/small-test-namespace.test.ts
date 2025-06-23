import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tokenize } from '../lexer/tokenizer';
import { parse } from '../parser/parser';
import { TokenKind } from '../core/token';
import { walk } from '../analyzer/walker';
import { parsePhp } from './test-helpers';

describe('Small Test File Namespace', () => {
  test('check namespace in small-test.php', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    
    
    // Parse with filtered tokens
    const allTokens = tokenize(testPhpContent);
    const filteredTokens = allTokens.filter(t =>
      t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline
    );
    
    
    // Check for PHP comments
    const hasComments = filteredTokens.some(t => t.kind === 'Comment' || t.kind === 'DocComment');
    
    const ast = parse(filteredTokens);
    
    
    // Walk to find all namespaces
    const namespaces: string[] = [];
    walk(ast, (node) => {
      if (node.type === 'NamespaceDeclaration' && (node as any).name) {
        namespaces.push((node as any).name.parts.join('\\'));
      }
    });
    
    
    // The test expectation
    expect(namespaces).toContain('MyApp\\Models');
  });
  
  test('check namespace with parsePhp helper', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    
    const result = parsePhp(testPhpContent);
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    
    // Walk to find all namespaces
    const namespaces: string[] = [];
    walk(result.value, (node) => {
      if (node.type === 'NamespaceDeclaration' && (node as any).name) {
        namespaces.push((node as any).name.parts.join('\\'));
      }
    });
    
    
    // The test expectation
    expect(namespaces).toContain('MyApp\\Models');
  });
});