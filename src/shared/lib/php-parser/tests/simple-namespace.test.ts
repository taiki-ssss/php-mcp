import { describe, expect, test } from 'vitest';
import { tokenize } from '../lexer/tokenizer';
import { parse } from '../parser/parser';
import { TokenKind } from '../core/token';

describe('Simple Namespace Test', () => {
  test('parse namespace with and without filtering', () => {
    const code = `<?php
namespace MyApp\\Models;

class User {}
`;
    
    // Test 1: With all tokens
    const allTokens = tokenize(code);
    try {
      const ast1 = parse(allTokens);
    } catch (e) {
    }
    
    // Test 2: With filtered tokens
    const filteredTokens = allTokens.filter(t =>
      t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline
    );
    try {
      const ast2 = parse(filteredTokens);
      
      // Check first statement details
      if (ast2.statements[0]) {
        if (ast2.statements[0].type === 'NamespaceDeclaration') {
          const ns = ast2.statements[0] as any;
        }
      }
    } catch (e) {
    }
  });
});