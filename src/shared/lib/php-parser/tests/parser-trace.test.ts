import { describe, expect, test } from 'vitest';
import { tokenize } from '../lexer/tokenizer';
import { Token, TokenKind } from '../core/token';

class DebugParser {
  private tokens: Token[];
  private current = 0;
  
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  
  parse() {
    
    // Skip opening tag
    if (this.peek().kind === TokenKind.OpenTag) {
      this.advance();
    }
    
    // Try to parse namespace
    this.skipWhitespace();
    
    
    if (this.peek().kind === TokenKind.Namespace) {
      this.advance(); // consume namespace
      
      this.skipWhitespace();
    }
  }
  
  private skipWhitespace() {
    while (this.peek().kind === 'Whitespace' || this.peek().kind === 'Newline') {
      this.advance();
    }
  }
  
  private peek(): Token {
    return this.tokens[this.current] || { kind: 'EOF', text: '', type: 'EOF', location: null as any };
  }
  
  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }
  
  private previous(): Token {
    return this.tokens[this.current - 1];
  }
  
  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }
}

describe('Parser Trace', () => {
  test('trace namespace parsing', () => {
    const code = `<?php
namespace MyApp\\Models;

class User {}
`;
    
    const tokens = tokenize(code);
    
    
    const parser = new DebugParser(tokens);
    parser.parse();
  });
});