/**
 * PHP Parser Module
 * 
 * Main parser that converts a token stream into an AST.
 * 
 * @module parser
 */

import { Token, TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { createLocation } from '../core/location.js';
import { ParserOptions } from './base.js';
import { DeclarationParser } from './declaration.js';

/**
 * Main PHP parser class that orchestrates the parsing process.
 * 
 * @extends DeclarationParser
 */
export class Parser extends DeclarationParser {
  /**
   * Parses a complete PHP program.
   * 
   * Handles:
   * - PHP opening/closing tags
   * - Inline HTML between PHP blocks
   * - Multiple PHP blocks in one file
   * - Error recovery (if enabled)
   * 
   * @returns The parsed PHP program AST
   * @throws ParseError if parsing fails and error recovery is disabled
   */
  parse(): AST.PhpProgram {
    const start = this.peek().location.start;
    const statements: AST.Statement[] = [];

    // Handle initial HTML if any
    if (this.peek().kind === TokenKind.InlineHTML) {
      const htmlToken = this.advance();
      statements.push({
        type: 'InlineHTMLStatement',
        value: String(htmlToken.value || htmlToken.text || ''),
        location: htmlToken.location
      });
    }

    // Skip opening PHP tag
    if (this.match(TokenKind.OpenTag, TokenKind.OpenTagEcho)) {
      // PHP tag found, statements will be parsed in the main loop
    }

    while (!this.isAtEnd()) {
      // Check for closing tag first to handle empty PHP blocks
      if (this.check(TokenKind.CloseTag)) {
        this.advance(); // consume the closing tag
        // Handle any HTML after closing tag
        if (this.peek().kind === TokenKind.InlineHTML) {
          const htmlToken = this.advance();
          statements.push({
            type: 'InlineHTMLStatement',
            value: htmlToken.text,
            location: htmlToken.location
          } as AST.InlineHTMLStatement);
        }
        // Look for next opening tag
        if (this.match(TokenKind.OpenTag, TokenKind.OpenTagEcho)) {
          continue;
        }
        // Continue parsing - there might be more tokens even after ?>
        continue;
      }
      
      // Parse statement
      try {
        const stmt = this.parseDeclaration();
        if (stmt) statements.push(stmt);
      } catch (error) {
        if (this.options.errorRecovery) {
          // Error recovery: synchronize to next statement
          this.synchronize();
        } else {
          throw error;
        }
      }
    }

    const end = statements.length > 0
      ? statements[statements.length - 1].location!.end
      : this.previous().location.end;

    return {
      type: 'PhpProgram',
      statements,
      location: createLocation(start, end)
    };
  }
}

/**
 * Re-export parser utilities and types
 */
export { ParseError, type ParserOptions } from './base.js';
export * from '../core/ast.js';

/**
 * Convenience function to parse a token array into an AST.
 * 
 * @param tokens - Array of tokens from the lexer
 * @param options - Optional parser configuration
 * @returns The parsed PHP program AST
 * @throws ParseError if parsing fails
 */
export function parse(tokens: Token[], options?: ParserOptions): AST.PhpProgram {
  const parser = new Parser(tokens, options);
  return parser.parse();
}