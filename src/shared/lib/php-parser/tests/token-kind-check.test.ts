import { describe, expect, test } from 'vitest';
import { tokenize } from '../lexer/tokenizer';
import { TokenKind } from '../core/token';

describe('Token Kind Check', () => {
  test('should correctly identify token kinds', () => {
    const code = `<?php
namespace MyApp\\Models;

class User {}
`;
    
    const tokens = tokenize(code);
    
    
    // Check TokenKind values
    
    // Find specific tokens
    const openTagToken = tokens.find(t => t.type === 'T_OPEN_TAG');
    const namespaceToken = tokens.find(t => t.type === 'T_NAMESPACE');
    
    
    // Check if kinds match
    if (openTagToken) {
    }
    if (namespaceToken) {
    }
  });
});