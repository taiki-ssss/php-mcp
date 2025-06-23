import { describe, expect, test } from 'vitest';
import { tokenize } from '../lexer/tokenizer';
import { TokenKind } from '../core/token';
import { ParserBase } from '../parser/base';

// Debug parser class to track token consumption
class DebugParser extends ParserBase {
  parseTokens() {
    const results: any[] = [];
    
    // Skip PHP tag
    if (this.match(TokenKind.OpenTag)) {
    }
    
    // Skip whitespace
    while (this.peek().kind === TokenKind.Whitespace || this.peek().kind === TokenKind.Newline) {
      this.advance();
    }
    
    // Check current token
    const current = this.peek();
    
    // Test namespace matching
    
    if (this.match(TokenKind.Namespace)) {
      results.push({ matched: 'namespace' });
    } else {
    }
    
    return results;
  }
}

describe('Parser Token Matching Debug', () => {
  test('debug namespace token matching', () => {
    const code = `<?php
namespace MyApp\\Models;
`;
    
    const tokens = tokenize(code);
    const parser = new DebugParser(tokens, {});
    
    const results = parser.parseTokens();
  });
});