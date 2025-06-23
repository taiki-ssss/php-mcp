/**
 * Parser base class
 * Token management and error handling
 */

import { Token, TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { SourceLocation, createLocation } from '../core/location.js';

/**
 * Parser error
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly location: SourceLocation,
    public readonly token?: Token
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Parser options
 */
export interface ParserOptions {
  /** PHP version */
  phpVersion?: string;
  /** Whether to enable error recovery */
  errorRecovery?: boolean;
  /** Strict mode */
  strict?: boolean;
}

/**
 * Parser base class
 */
export abstract class ParserBase {
  protected tokens: Token[];
  protected current = 0;
  protected options: Required<ParserOptions>;

  constructor(tokens: Token[], options: ParserOptions = {}) {
    // Filter out whitespace and comment tokens for easier parsing
    this.tokens = tokens.filter(t => 
      t.kind !== TokenKind.Whitespace && 
      t.kind !== TokenKind.Newline &&
      t.kind !== TokenKind.Comment &&
      t.kind !== TokenKind.DocComment
    );
    this.options = {
      phpVersion: options.phpVersion ?? '8.0',
      errorRecovery: options.errorRecovery ?? true,
      strict: options.strict ?? false
    };
  }

  /**
   * Get current token
   */
  protected peek(): Token {
    if (this.current >= this.tokens.length) {
      // Return EOF token if we're at the end
      return {
        kind: TokenKind.EOF,
        text: '',
        type: 'T_EOF',
        value: '',
        location: this.tokens.length > 0 
          ? this.tokens[this.tokens.length - 1].location 
          : createLocation({ line: 1, column: 0, offset: 0 }, { line: 1, column: 0, offset: 0 })
      };
    }
    return this.tokens[this.current];
  }

  /**
   * Get previous token
   */
  protected previous(): Token {
    if (this.current - 1 < 0 || this.current - 1 >= this.tokens.length) {
      // Return a dummy token if out of bounds
      return {
        kind: TokenKind.EOF,
        text: '',
        type: 'T_EOF',
        value: '',
        location: createLocation({ line: 1, column: 0, offset: 0 }, { line: 1, column: 0, offset: 0 })
      };
    }
    return this.tokens[this.current - 1];
  }

  /**
   * Check if at end
   */
  protected isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().kind === TokenKind.EOF;
  }

  /**
   * Advance token
   */
  protected advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  /**
   * Check token type
   */
  protected check(kind: TokenKind): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().kind === kind;
  }

  /**
   * Advance if token matches
   */
  protected match(...kinds: TokenKind[]): boolean {
    for (const kind of kinds) {
      if (this.check(kind)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  /**
   * Consume token (with error check)
   */
  protected consume(kind: TokenKind, message: string): Token {
    if (this.check(kind)) return this.advance();

    throw this.error(this.peek(), message);
  }

  /**
   * Generate error
   */
  protected error(token: Token, message: string): ParseError {
    return new ParseError(message, token.location, token);
  }

  /**
   * Skip to sync point (error recovery)
   */
  protected synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().kind === TokenKind.Semicolon) return;

      switch (this.peek().kind) {
        case TokenKind.Class:
        case TokenKind.Function:
        case TokenKind.Var:
        case TokenKind.For:
        case TokenKind.If:
        case TokenKind.While:
        case TokenKind.Print:
        case TokenKind.Return:
          return;
      }

      this.advance();
    }
  }

  /**
   * Parse identifier
   */
  protected parseIdentifier(): AST.Identifier {
    const token = this.consume(TokenKind.Identifier, "Expected identifier");
    return {
      type: 'Identifier',
      name: token.text,
      location: token.location
    };
  }

  /**
   * Parse variable
   */
  protected parseVariable(): AST.VariableExpression {
    const token = this.previous(); // Variable token was already consumed by match()
    return {
      type: 'VariableExpression',
      name: token.text.substring(1), // Remove $
      location: token.location
    };
  }

  /**
   * Parse name expression
   */
  protected parseNameExpression(): AST.NameExpression {
    const start = this.peek().location.start;
    const parts: AST.Identifier[] = [];

    // Absolute path
    const isAbsolute = this.match(TokenKind.Backslash);

    do {
      parts.push(this.parseIdentifier());
    } while (this.match(TokenKind.Backslash));

    const end = parts[parts.length - 1].location!.end;

    return {
      type: 'NameExpression',
      parts: parts.map(p => p.name),
      qualified: isAbsolute ? 'fully' : (parts.length > 1 ? 'qualified' : 'unqualified'),
      location: createLocation(start, end)
    };
  }
}