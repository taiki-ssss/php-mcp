/**
 * Statement Parser Module
 * 
 * Handles parsing of PHP statements including control structures,
 * loops, conditionals, and other statement types.
 * 
 * @module statement
 */

import { TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { createLocation, mergeLocations } from '../core/location.js';
import { ExpressionParser } from './expression.js';

/**
 * Statement parser that extends ExpressionParser to handle
 * PHP statements and control structures.
 * 
 * @extends ExpressionParser
 */
export class StatementParser extends ExpressionParser {
  /**
   * Parses a PHP statement.
   * 
   * This method handles all types of statements including:
   * - Block statements
   * - Control structures (if, while, for, foreach, switch)
   * - Jump statements (break, continue, return, throw)
   * - Exception handling (try-catch-finally)
   * - Other statements (echo, global, static, etc.)
   * - Expression statements
   * 
   * @returns The parsed statement or null if no statement could be parsed
   * @throws ParseError if an invalid statement is encountered
   */
  parseStatement(): AST.Statement | null {
    while (this.peek().kind === TokenKind.Whitespace ||
      this.peek().kind === TokenKind.Newline ||
      this.peek().kind === TokenKind.Comment ||
      this.peek().kind === TokenKind.DocComment) {
      this.advance();
    }

    if (this.check(TokenKind.LeftBrace)) {
      return this.parseBlockStatement();
    }
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

    if (this.match(TokenKind.Declare)) {
      return this.parseDeclareStatement();
    }

    if (this.check(TokenKind.Identifier)) {
      // Check for label syntax (identifier followed by colon)
      const savedPos = this.current;
      const id = this.parseIdentifier();

      if (this.match(TokenKind.Colon)) {
        return {
          type: 'LabeledStatement',
          label: id.name,
          location: mergeLocations(id.location!, this.previous().location)
        };
      }

      // Not a label, restore position
      this.current = savedPos;
    }

    return this.parseExpressionStatement();
  }

  /**
   * Parses a block statement (code enclosed in braces).
   * 
   * @returns The parsed block statement containing a list of statements
   * @throws ParseError if the block is not properly closed
   */
  parseBlockStatement(): AST.BlockStatement {
    const start = this.consume(TokenKind.LeftBrace, "Expected '{'").location.start;
    const statements: AST.Statement[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      // Virtual method pattern: DeclarationParser overrides this to handle declarations
      const stmt = this.parseBlockItem();
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
   * Parses a single item within a block.
   * 
   * This is a virtual method that can be overridden by subclasses
   * to handle additional constructs like declarations.
   * 
   * @protected
   * @returns The parsed statement or null
   */
  protected parseBlockItem(): AST.Statement | null {
    return this.parseStatement();
  }

  /**
   * Parses an if statement with optional elseif and else clauses.
   * 
   * @private
   * @returns The parsed if statement
   * @throws ParseError if the if statement syntax is invalid
   */
  private parseIfStatement(): AST.IfStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'if'");
    const test = this.parseExpression();
    this.consume(TokenKind.RightParen, "Expected ')' after if condition");

    const consequent = this.parseStatement()!;
    const elseifs: AST.ElseIfClause[] = [];
    let alternate: AST.Statement | null = null;

    // Parse elseif clauses
    while (this.match(TokenKind.ElseIf)) {
      const elseifStart = this.previous().location.start;
      this.consume(TokenKind.LeftParen, "Expected '(' after 'elseif'");
      const elseifTest = this.parseExpression();
      this.consume(TokenKind.RightParen, "Expected ')' after elseif condition");
      const elseifConsequent = this.parseStatement()!;
      const elseifEnd = elseifConsequent.location!.end;

      elseifs.push({
        type: 'ElseIfClause',
        test: elseifTest,
        consequent: elseifConsequent,
        location: createLocation(elseifStart, elseifEnd)
      });
    }

    // Parse else clause
    if (this.match(TokenKind.Else)) {
      alternate = this.parseStatement()!;
    }

    // Calculate end location based on the last present clause
    const end = alternate?.location?.end || (elseifs.length > 0 ? elseifs[elseifs.length - 1].location!.end : consequent.location!.end);

    return {
      type: 'IfStatement',
      test,
      consequent,
      elseifs,
      alternate,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a while loop statement.
   * 
   * @private
   * @returns The parsed while statement
   * @throws ParseError if the while statement syntax is invalid
   */
  private parseWhileStatement(): AST.WhileStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'while'");
    const test = this.parseExpression();
    this.consume(TokenKind.RightParen, "Expected ')' after while condition");

    const body = this.parseStatement()!;

    return {
      type: 'WhileStatement',
      test,
      body,
      location: createLocation(start, body.location!.end)
    };
  }

  /**
   * Parses a do-while loop statement.
   * 
   * @private
   * @returns The parsed do-while statement
   * @throws ParseError if the do-while statement syntax is invalid
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
      test,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a for loop statement.
   * 
   * Handles the three parts of a for loop:
   * - Initialization expression(s)
   * - Test condition
   * - Update expression(s)
   * 
   * @private
   * @returns The parsed for statement
   * @throws ParseError if the for statement syntax is invalid
   */
  private parseForStatement(): AST.ForStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'for'");

    // Parse initialization expressions
    let init: AST.Expression | null = null;
    if (!this.check(TokenKind.Semicolon)) {
      const exprs: AST.Expression[] = [];
      do {
        exprs.push(this.parseExpression());
      } while (this.match(TokenKind.Comma));

      if (exprs.length === 1) {
        init = exprs[0];
      } else {
        // Multiple expressions are combined into a sequence expression
        init = {
          type: 'SequenceExpression',
          expressions: exprs,
          location: mergeLocations(exprs[0].location!, exprs[exprs.length - 1].location!)
        } as AST.Expression;
      }
    }
    this.consume(TokenKind.Semicolon, "Expected ';' after for init");

    // Parse test condition
    let test: AST.Expression | undefined;
    if (!this.check(TokenKind.Semicolon)) {
      test = this.parseExpression();
    }
    this.consume(TokenKind.Semicolon, "Expected ';' after for condition");

    // Parse update expressions
    let update: AST.Expression | null = null;
    if (!this.check(TokenKind.RightParen)) {
      const exprs: AST.Expression[] = [];
      do {
        exprs.push(this.parseExpression());
      } while (this.match(TokenKind.Comma));

      if (exprs.length === 1) {
        update = exprs[0];
      } else {
        // Multiple expressions are combined into a sequence expression
        update = {
          type: 'SequenceExpression',
          expressions: exprs,
          location: mergeLocations(exprs[0].location!, exprs[exprs.length - 1].location!)
        } as AST.Expression;
      }
    }
    this.consume(TokenKind.RightParen, "Expected ')' after for clauses");

    const body = this.parseStatement()!;

    return {
      type: 'ForStatement',
      init,
      test: test || null,
      update,
      body,
      location: createLocation(start, body.location!.end)
    };
  }

  /**
   * Parses a foreach loop statement.
   * 
   * Handles both forms:
   * - foreach ($array as $value)
   * - foreach ($array as $key => $value)
   * 
   * Also supports reference values with &.
   * 
   * @private
   * @returns The parsed foreach statement
   * @throws ParseError if the foreach statement syntax is invalid
   */
  private parseForeachStatement(): AST.ForeachStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'foreach'");
    const expression = this.parseExpression();
    this.consume(TokenKind.As, "Expected 'as' in foreach");

    let key: AST.Variable | null = null;
    let value: AST.Variable;
    let byRef = false;

    if (this.match(TokenKind.Ampersand)) {
      byRef = true;
    }
    // First variable in foreach can be either key or value depending on syntax
    const matched = this.match(TokenKind.Variable);
    if (!matched) {
      throw this.error(this.peek(), "Expected variable in foreach");
    }
    const var1 = this.parseVariable() as AST.Variable;

    if (this.match(TokenKind.DoubleArrow)) {
      key = var1;
      if (this.match(TokenKind.Ampersand)) {
        byRef = true;
      }
      // After =>, we expect the value variable
      const matched2 = this.match(TokenKind.Variable);
      if (!matched2) {
        throw this.error(this.peek(), "Expected variable after '=>' in foreach");
      }
      value = this.parseVariable() as AST.Variable;
    } else {
      value = var1;
    }

    this.consume(TokenKind.RightParen, "Expected ')' after foreach");
    const body = this.parseStatement()!;

    return {
      type: 'ForeachStatement',
      expression,
      key,
      value,
      byRef,
      body,
      location: createLocation(start, body.location!.end)
    };
  }

  /**
   * Parses a switch statement with case and default clauses.
   * 
   * @private
   * @returns The parsed switch statement
   * @throws ParseError if the switch statement syntax is invalid
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
        // Parse statements until we hit another case, default, or end of switch
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
        // Parse statements until we hit another case, default, or end of switch
        while (!this.check(TokenKind.Case) &&
          !this.check(TokenKind.Default) &&
          !this.check(TokenKind.RightBrace) &&
          !this.isAtEnd()) {
          const stmt = this.parseStatement();
          if (stmt) consequent.push(stmt);
        }

        cases.push({
          type: 'SwitchCase',
          test: null,
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
   * Parses a break statement with optional numeric label.
   * 
   * @private
   * @returns The parsed break statement
   * @throws ParseError if the break statement syntax is invalid
   */
  private parseBreakStatement(): AST.BreakStatement {
    const start = this.previous().location.start;
    let label: AST.Expression | null = null;

    if (this.match(TokenKind.Number)) {
      label = this.parseNumberLiteral();
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after break").location.end;

    return {
      type: 'BreakStatement',
      label,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a continue statement with optional numeric label.
   * 
   * @private
   * @returns The parsed continue statement
   * @throws ParseError if the continue statement syntax is invalid
   */
  private parseContinueStatement(): AST.ContinueStatement {
    const start = this.previous().location.start;
    let label: AST.Expression | null = null;

    if (this.match(TokenKind.Number)) {
      label = this.parseNumberLiteral();
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after continue").location.end;

    return {
      type: 'ContinueStatement',
      label,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a return statement with optional return value.
   * 
   * @private
   * @returns The parsed return statement
   * @throws ParseError if the return statement syntax is invalid
   */
  private parseReturnStatement(): AST.ReturnStatement {
    const start = this.previous().location.start;
    let value: AST.Expression | null = null;

    if (!this.check(TokenKind.Semicolon) && !this.isAtEnd()) {
      value = this.parseExpression();
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after return").location.end;

    return {
      type: 'ReturnStatement',
      value,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a throw statement.
   * 
   * @private
   * @returns The parsed throw statement
   * @throws ParseError if the throw statement syntax is invalid
   */
  private parseThrowStatement(): AST.ThrowStatement {
    const start = this.previous().location.start;
    const expression = this.parseExpression();
    const end = this.consume(TokenKind.Semicolon, "Expected ';' after throw").location.end;

    return {
      type: 'ThrowStatement',
      expression,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a try-catch-finally statement.
   * 
   * Supports:
   * - Multiple catch blocks with different exception types
   * - Union types in catch (PHP 7.1+)
   * - Optional variable in catch (PHP 8.0+)
   * - Optional finally block
   * 
   * @private
   * @returns The parsed try statement
   * @throws ParseError if the try statement syntax is invalid
   */
  private parseTryStatement(): AST.TryStatement {
    const start = this.previous().location.start;
    const block = this.parseBlockStatement();
    const handlers: AST.CatchClause[] = [];
    let finalizer: AST.BlockStatement | undefined;

    while (this.match(TokenKind.Catch)) {
      const catchStart = this.previous().location.start;
      this.consume(TokenKind.LeftParen, "Expected '(' after 'catch'");

      // Parse exception types (PHP 7.1+ supports multiple types with |)
      const types: AST.NameExpression[] = [];
      do {
        types.push(this.parseNameExpression());
      } while (this.match(TokenKind.Pipe));

      // Parse optional variable (can be omitted in PHP 8.0+)
      let param: AST.VariableExpression | undefined;
      if (this.match(TokenKind.Variable)) {
        param = this.parseVariable();
      }

      this.consume(TokenKind.RightParen, "Expected ')' after catch clause");
      const body = this.parseBlockStatement();

      handlers.push({
        type: 'CatchClause',
        types,
        param: param || null,
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

    // Determine the end location based on what parts are present
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
   * Parses an echo statement with one or more expressions.
   * 
   * @private
   * @returns The parsed echo statement
   * @throws ParseError if the echo statement syntax is invalid
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
   * Parses a global statement declaring global variables.
   * 
   * @private
   * @returns The parsed global statement
   * @throws ParseError if the global statement syntax is invalid
   */
  private parseGlobalStatement(): AST.GlobalStatement {
    const start = this.previous().location.start;
    const variables: AST.VariableExpression[] = [];

    do {
      const matched = this.match(TokenKind.Variable);
      if (!matched) {
        throw this.error(this.peek(), "Expected variable in global statement");
      }
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
   * Parses a static variable declaration statement.
   * 
   * Static variables maintain their value between function calls.
   * 
   * @private
   * @returns The parsed static statement
   * @throws ParseError if the static statement syntax is invalid
   */
  private parseStaticStatement(): AST.StaticStatement {
    const start = this.previous().location.start;
    const declarations: AST.StaticVariableDeclaration[] = [];

    do {
      const matched = this.match(TokenKind.Variable);
      if (!matched) {
        throw this.error(this.peek(), "Expected variable in static statement");
      }
      const variable = this.parseVariable();
      let initializer: AST.Expression | undefined;

      if (this.match(TokenKind.Equal)) {
        initializer = this.parseExpression();
      }

      declarations.push({
        type: 'StaticVariableDeclaration',
        id: variable,
        init: initializer || null,
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
   * Parses an unset statement to destroy variables.
   * 
   * @private
   * @returns The parsed unset statement
   * @throws ParseError if the unset statement syntax is invalid
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
   * Parses a goto statement for jumping to a label.
   * 
   * @private
   * @returns The parsed goto statement
   * @throws ParseError if the goto statement syntax is invalid
   */
  private parseGotoStatement(): AST.GotoStatement {
    const start = this.previous().location.start;
    const labelId = this.parseIdentifier();
    const end = this.consume(TokenKind.Semicolon, "Expected ';' after goto").location.end;

    return {
      type: 'GotoStatement',
      label: labelId.name,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a declare statement for setting execution directives.
   * 
   * Common directives include:
   * - strict_types=1
   * - ticks=1
   * - encoding='UTF-8'
   * 
   * @private
   * @returns The parsed declare statement
   * @throws ParseError if the declare statement syntax is invalid
   */
  private parseDeclareStatement(): AST.DeclareStatement {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'declare'");
    const directives: AST.DeclareDirective[] = [];

    do {
      const nameToken = this.consume(TokenKind.Identifier, "Expected directive name");
      const name = String(nameToken.value || nameToken.text || '');
      this.consume(TokenKind.Equal, "Expected '=' after directive name");
      const value = this.parseExpression();

      directives.push({
        type: 'DeclareDirective',
        name,
        value,
        location: mergeLocations(nameToken.location, value.location!)
      });
    } while (this.match(TokenKind.Comma));

    this.consume(TokenKind.RightParen, "Expected ')' after declare directives");

    let body: AST.Statement | null = null;
    if (this.check(TokenKind.LeftBrace)) {
      body = this.parseBlockStatement();
    } else {
      this.consume(TokenKind.Semicolon, "Expected ';' or '{' after declare");
    }

    const end = body?.location?.end || this.previous().location.end;

    return {
      type: 'DeclareStatement',
      directives,
      body,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses an expression statement.
   * 
   * Expression statements are expressions followed by a semicolon,
   * such as function calls, assignments, etc.
   * 
   * @private
   * @returns The parsed expression statement or null
   */
  private parseExpressionStatement(): AST.ExpressionStatement | null {
    const expr = this.parseExpression();

    // Semicolon may be optional in some contexts (e.g., before closing tag)
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