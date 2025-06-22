/**
 * 文パーサー
 * 制御構造や基本的な文のパース
 */

import { TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { createLocation, mergeLocations } from '../core/location.js';
import { ParserBase } from './base.js';
import { ExpressionParser } from './expression.js';

/**
 * 文パーサー
 */
export class StatementParser extends ExpressionParser {
  /**
   * 文をパース
   */
  parseStatement(): AST.Statement | null {
    // ブロック文
    if (this.check(TokenKind.LeftBrace)) {
      return this.parseBlockStatement();
    }

    // 制御構造
    if (this.match(TokenKind.If)) {
      return this.parseIfStatement();
    }

    if (this.match(TokenKind.While)) {
      return this.parseWhileStatement();
    }

    if (this.match(TokenKind.Do)) {
      return this.parseDoWhileStatement();
    }

    if (this.match(TokenKind.For)) {
      return this.parseForStatement();
    }

    if (this.match(TokenKind.Foreach)) {
      return this.parseForeachStatement();
    }

    if (this.match(TokenKind.Switch)) {
      return this.parseSwitchStatement();
    }

    if (this.match(TokenKind.Break)) {
      return this.parseBreakStatement();
    }

    if (this.match(TokenKind.Continue)) {
      return this.parseContinueStatement();
    }

    if (this.match(TokenKind.Return)) {
      return this.parseReturnStatement();
    }

    if (this.match(TokenKind.Throw)) {
      return this.parseThrowStatement();
    }

    if (this.match(TokenKind.Try)) {
      return this.parseTryStatement();
    }

    // その他の文
    if (this.match(TokenKind.Echo)) {
      return this.parseEchoStatement();
    }

    if (this.match(TokenKind.Global)) {
      return this.parseGlobalStatement();
    }

    if (this.match(TokenKind.Static)) {
      return this.parseStaticStatement();
    }

    if (this.match(TokenKind.Unset)) {
      return this.parseUnsetStatement();
    }

    if (this.match(TokenKind.Goto)) {
      return this.parseGotoStatement();
    }

    if (this.check(TokenKind.Identifier)) {
      // ラベルの可能性をチェック
      const savedPos = this.current;
      const id = this.parseIdentifier();

      if (this.match(TokenKind.Colon)) {
        // ラベル文
        // Label statements are not in the AST, return an expression statement instead
        return {
          type: 'ExpressionStatement',
          expression: id,
          location: mergeLocations(id.location!, this.previous().location)
        };
      }

      // ラベルではない、位置を戻す
      this.current = savedPos;
    }

    // 式文
    return this.parseExpressionStatement();
  }

  /**
   * ブロック文をパース
   */
  parseBlockStatement(): AST.BlockStatement {
    const start = this.consume(TokenKind.LeftBrace, "Expected '{'").location.start;
    const statements: AST.Statement[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    const end = this.consume(TokenKind.RightBrace, "Expected '}' after block").location.end;

    return {
      type: 'BlockStatement',
      statements,
      location: createLocation(start, end)
    };
  }

  /**
   * if文をパース
   */
  private parseIfStatement(): AST.IfStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'if'");
    const test = this.parseExpression();
    this.consume(TokenKind.RightParen, "Expected ')' after if condition");

    const consequent = this.parseStatement()!;
    let alternate: AST.Statement | undefined;

    if (this.match(TokenKind.ElseIf)) {
      // elseif は if 文として扱う
      alternate = this.parseIfStatement();
    } else if (this.match(TokenKind.Else)) {
      alternate = this.parseStatement()!;
    }

    const end = alternate?.location?.end || consequent.location!.end;

    return {
      type: 'IfStatement',
      condition: test,
      then: consequent,
      else: alternate,
      location: createLocation(start, end)
    };
  }

  /**
   * while文をパース
   */
  private parseWhileStatement(): AST.WhileStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'while'");
    const test = this.parseExpression();
    this.consume(TokenKind.RightParen, "Expected ')' after while condition");

    const body = this.parseStatement()!;

    return {
      type: 'WhileStatement',
      condition: test,
      body,
      location: createLocation(start, body.location!.end)
    };
  }

  /**
   * do-while文をパース
   */
  private parseDoWhileStatement(): AST.DoWhileStatement {
    const start = this.previous().location.start;
    const body = this.parseStatement()!;

    this.consume(TokenKind.While, "Expected 'while' after do body");
    this.consume(TokenKind.LeftParen, "Expected '(' after 'while'");
    const test = this.parseExpression();
    this.consume(TokenKind.RightParen, "Expected ')' after while condition");
    const end = this.consume(TokenKind.Semicolon, "Expected ';' after do-while").location.end;

    return {
      type: 'DoWhileStatement',
      body,
      condition: test,
      location: createLocation(start, end)
    };
  }

  /**
   * for文をパース
   */
  private parseForStatement(): AST.ForStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'for'");

    // 初期化
    let init: AST.Expression[] | undefined;
    if (!this.check(TokenKind.Semicolon)) {
      init = [this.parseExpression()];
    }
    this.consume(TokenKind.Semicolon, "Expected ';' after for init");

    // 条件
    let test: AST.Expression | undefined;
    if (!this.check(TokenKind.Semicolon)) {
      test = this.parseExpression();
    }
    this.consume(TokenKind.Semicolon, "Expected ';' after for condition");

    // 更新
    let update: AST.Expression[] | undefined;
    if (!this.check(TokenKind.RightParen)) {
      update = [this.parseExpression()];
    }
    this.consume(TokenKind.RightParen, "Expected ')' after for clauses");

    const body = this.parseStatement()!;

    return {
      type: 'ForStatement',
      init,
      condition: test,
      update,
      body,
      location: createLocation(start, body.location!.end)
    };
  }

  /**
   * foreach文をパース
   */
  private parseForeachStatement(): AST.ForeachStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'foreach'");
    const iterable = this.parseExpression();
    this.consume(TokenKind.As, "Expected 'as' in foreach");

    let key: AST.Expression | undefined;
    let value: AST.Expression;
    let byReference = false;

    // キーの可能性をチェック
    const expr1 = this.parseExpression();

    if (this.match(TokenKind.DoubleArrow)) {
      // key => value
      key = expr1;
      byReference = this.match(TokenKind.Ampersand);
      value = this.parseExpression();
    } else {
      // value only
      value = expr1;
      // Check for reference expression
      if (expr1.type === 'ReferenceExpression') {
        byReference = true;
        value = (expr1 as AST.ReferenceExpression).expression as AST.VariableExpression;
      }
    }

    this.consume(TokenKind.RightParen, "Expected ')' after foreach");
    const body = this.parseStatement()!;

    return {
      type: 'ForeachStatement',
      iterable,
      key: key as AST.VariableExpression | AST.ListExpression | undefined,
      value: value as AST.VariableExpression | AST.ListExpression | AST.ReferenceExpression,
      body,
      location: createLocation(start, body.location!.end)
    };
  }

  /**
   * switch文をパース
   */
  private parseSwitchStatement(): AST.SwitchStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'switch'");
    const discriminant = this.parseExpression();
    this.consume(TokenKind.RightParen, "Expected ')' after switch expression");

    this.consume(TokenKind.LeftBrace, "Expected '{' before switch body");
    const cases: AST.SwitchCase[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      if (this.match(TokenKind.Case)) {
        const test = this.parseExpression();
        this.consume(TokenKind.Colon, "Expected ':' after case");

        const consequent: AST.Statement[] = [];
        while (!this.check(TokenKind.Case) &&
          !this.check(TokenKind.Default) &&
          !this.check(TokenKind.RightBrace) &&
          !this.isAtEnd()) {
          const stmt = this.parseStatement();
          if (stmt) consequent.push(stmt);
        }

        cases.push({
          type: 'SwitchCase',
          test,
          consequent,
          location: mergeLocations(
            test.location!,
            consequent.length > 0 ? consequent[consequent.length - 1].location! : test.location!
          )
        });
      } else if (this.match(TokenKind.Default)) {
        this.consume(TokenKind.Colon, "Expected ':' after default");

        const consequent: AST.Statement[] = [];
        while (!this.check(TokenKind.Case) &&
          !this.check(TokenKind.Default) &&
          !this.check(TokenKind.RightBrace) &&
          !this.isAtEnd()) {
          const stmt = this.parseStatement();
          if (stmt) consequent.push(stmt);
        }

        cases.push({
          type: 'SwitchCase',
          test: undefined,
          consequent,
          location: createLocation(
            this.tokens[this.current - 2].location.start,
            consequent.length > 0 ? consequent[consequent.length - 1].location!.end : this.previous().location.end
          )
        });
      } else {
        throw this.error(this.peek(), "Expected 'case' or 'default' in switch body");
      }
    }

    const end = this.consume(TokenKind.RightBrace, "Expected '}' after switch body").location.end;

    return {
      type: 'SwitchStatement',
      discriminant,
      cases,
      location: createLocation(start, end)
    };
  }

  /**
   * break文をパース
   */
  private parseBreakStatement(): AST.BreakStatement {
    const start = this.previous().location.start;
    let level: number | undefined;

    if (this.check(TokenKind.Number)) {
      const num = this.parseNumberLiteral();
      level = num.value;
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after break").location.end;

    return {
      type: 'BreakStatement',
      level,
      location: createLocation(start, end)
    };
  }

  /**
   * continue文をパース
   */
  private parseContinueStatement(): AST.ContinueStatement {
    const start = this.previous().location.start;
    let level: number | undefined;

    if (this.check(TokenKind.Number)) {
      const num = this.parseNumberLiteral();
      level = num.value;
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after continue").location.end;

    return {
      type: 'ContinueStatement',
      level,
      location: createLocation(start, end)
    };
  }

  /**
   * return文をパース
   */
  private parseReturnStatement(): AST.ReturnStatement {
    const start = this.previous().location.start;
    let argument: AST.Expression | undefined;

    if (!this.check(TokenKind.Semicolon) && !this.isAtEnd()) {
      argument = this.parseExpression();
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after return").location.end;

    return {
      type: 'ReturnStatement',
      argument,
      location: createLocation(start, end)
    };
  }

  /**
   * throw文をパース
   */
  private parseThrowStatement(): AST.ThrowStatement {
    const start = this.previous().location.start;
    const argument = this.parseExpression();
    const end = this.consume(TokenKind.Semicolon, "Expected ';' after throw").location.end;

    return {
      type: 'ThrowStatement',
      argument,
      location: createLocation(start, end)
    };
  }

  /**
   * try文をパース
   */
  private parseTryStatement(): AST.TryStatement {
    const start = this.previous().location.start;
    const block = this.parseBlockStatement();
    const handlers: AST.CatchClause[] = [];
    let finalizer: AST.BlockStatement | undefined;

    while (this.match(TokenKind.Catch)) {
      const catchStart = this.previous().location.start;
      this.consume(TokenKind.LeftParen, "Expected '(' after 'catch'");

      // 型のリスト（PHP 7.1+ では複数の例外型を捕捉可能）
      const types: AST.NameExpression[] = [];
      do {
        types.push(this.parseNameExpression());
      } while (this.match(TokenKind.Pipe));

      // 変数（PHP 8.0+ では省略可能）
      let param: AST.VariableExpression | undefined;
      if (this.check(TokenKind.Variable)) {
        param = this.parseVariable();
      }

      this.consume(TokenKind.RightParen, "Expected ')' after catch clause");
      const body = this.parseBlockStatement();

      handlers.push({
        type: 'CatchClause',
        types,
        variable: param,
        body,
        location: createLocation(catchStart, body.location!.end)
      });
    }

    if (this.match(TokenKind.Finally)) {
      finalizer = this.parseBlockStatement();
    }

    if (handlers.length === 0 && !finalizer) {
      throw this.error(this.peek(), "Expected 'catch' or 'finally' after 'try'");
    }

    const end = finalizer?.location?.end ||
      handlers[handlers.length - 1]?.location?.end ||
      block.location!.end;

    return {
      type: 'TryStatement',
      block,
      handlers,
      finalizer,
      location: createLocation(start, end)
    };
  }

  /**
   * echo文をパース
   */
  private parseEchoStatement(): AST.EchoStatement {
    const start = this.previous().location.start;
    const expressions: AST.Expression[] = [];

    do {
      expressions.push(this.parseExpression());
    } while (this.match(TokenKind.Comma));

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after echo").location.end;

    return {
      type: 'EchoStatement',
      expressions,
      location: createLocation(start, end)
    };
  }

  /**
   * global文をパース
   */
  private parseGlobalStatement(): AST.GlobalStatement {
    const start = this.previous().location.start;
    const variables: AST.VariableExpression[] = [];

    do {
      variables.push(this.parseVariable());
    } while (this.match(TokenKind.Comma));

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after global").location.end;

    return {
      type: 'GlobalStatement',
      variables,
      location: createLocation(start, end)
    };
  }

  /**
   * static文をパース
   */
  private parseStaticStatement(): AST.StaticStatement {
    const start = this.previous().location.start;
    const declarations: AST.StaticVariableDeclaration[] = [];

    do {
      const variable = this.parseVariable();
      let initializer: AST.Expression | undefined;

      if (this.match(TokenKind.Equal)) {
        initializer = this.parseExpression();
      }

      declarations.push({
        type: 'StaticVariableDeclaration',
        variable,
        initializer,
        location: mergeLocations(
          variable.location!,
          initializer?.location || variable.location!
        )
      });
    } while (this.match(TokenKind.Comma));

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after static").location.end;

    return {
      type: 'StaticStatement',
      declarations,
      location: createLocation(start, end)
    };
  }

  /**
   * unset文をパース
   */
  private parseUnsetStatement(): AST.UnsetStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'unset'");
    const variables: AST.Expression[] = [];

    do {
      variables.push(this.parseExpression());
    } while (this.match(TokenKind.Comma));

    this.consume(TokenKind.RightParen, "Expected ')' after unset variables");
    const end = this.consume(TokenKind.Semicolon, "Expected ';' after unset").location.end;

    return {
      type: 'UnsetStatement',
      variables,
      location: createLocation(start, end)
    };
  }

  /**
   * goto文をパース
   */
  private parseGotoStatement(): AST.GotoStatement {
    const start = this.previous().location.start;
    const label = this.parseIdentifier();
    const end = this.consume(TokenKind.Semicolon, "Expected ';' after goto").location.end;

    return {
      type: 'GotoStatement',
      label,
      location: createLocation(start, end)
    };
  }

  /**
   * 式文をパース
   */
  private parseExpressionStatement(): AST.ExpressionStatement | null {
    const expr = this.parseExpression();

    // セミコロンは省略可能な場合がある
    if (this.check(TokenKind.Semicolon)) {
      this.advance();
    }

    return {
      type: 'ExpressionStatement',
      expression: expr,
      location: expr.location
    };
  }

}