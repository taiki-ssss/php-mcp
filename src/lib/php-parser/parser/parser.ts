/**
 * PHP パーサー
 * トークン列から AST を構築
 */

import { Token, TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { createLocation } from '../core/location.js';
import { ParserOptions } from './base.js';
import { DeclarationParser } from './declaration.js';

/**
 * PHP パーサー
 */
export class Parser extends DeclarationParser {
  /**
   * プログラムをパース
   */
  parse(): AST.Program {
    const start = this.peek().location.start;
    const statements: AST.Statement[] = [];

    // Skip initial HTML if any
    if (this.match(TokenKind.InlineHTML)) {
      // Ignore for now
    }

    // Skip opening PHP tag
    if (this.match(TokenKind.OpenTag, TokenKind.OpenTagEcho)) {
      // Process statements
    }

    while (!this.isAtEnd()) {
      // Handle closing tag
      if (this.match(TokenKind.CloseTag)) {
        // Skip any HTML
        if (this.match(TokenKind.InlineHTML)) {
          // Ignore for now
        }
        // Look for next opening tag
        if (this.match(TokenKind.OpenTag, TokenKind.OpenTagEcho)) {
          continue;
        }
      }

      try {
        const stmt = this.parseDeclaration();
        if (stmt) statements.push(stmt);
      } catch (error) {
        if (this.options.errorRecovery) {
          // エラーリカバリー: 次の文まで同期
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
      type: 'Program',
      statements,
      location: createLocation(start, end)
    };
  }
}

/**
 * パーサーをエクスポート
 */
export { ParseError, type ParserOptions } from './base.js';
export * from '../core/ast.js';

/**
 * トークン列をパース
 */
export function parse(tokens: Token[], options?: ParserOptions): AST.Program {
  const parser = new Parser(tokens, options);
  return parser.parse();
}