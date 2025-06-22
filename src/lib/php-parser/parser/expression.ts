/**
 * 式パーサー
 * 演算子優先順位に基づく式のパース
 */

import { TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { createLocation, mergeLocations } from '../core/location.js';
import { ParserBase } from './base.js';

/**
 * 式パーサー
 */
export class ExpressionParser extends ParserBase {
  /**
   * 式をパース（エントリーポイント）
   */
  parseExpression(): AST.Expression {
    return this.parseAssignment();
  }

  /**
   * 代入式をパース
   */
  private parseAssignment(): AST.Expression {
    let expr = this.parseTernary();

    while (true) {
      if (this.match(TokenKind.Equal)) {
        const operator = '=';
        const right = this.parseAssignment();
        expr = {
          type: 'AssignmentExpression',
          left: expr,
          operator,
          right,
          location: mergeLocations(expr.location!, right.location!)
        };
      } else if (this.match(
        TokenKind.PlusEqual, TokenKind.MinusEqual, TokenKind.StarEqual,
        TokenKind.SlashEqual, TokenKind.PercentEqual, TokenKind.DotEqual,
        TokenKind.AmpersandEqual, TokenKind.PipeEqual, TokenKind.CaretEqual,
        TokenKind.LessLessEqual, TokenKind.GreaterGreaterEqual,
        TokenKind.StarStarEqual, TokenKind.QuestionQuestionEqual
      )) {
        const operator = this.previous().text as AST.AssignmentOperator;
        const right = this.parseAssignment();
        expr = {
          type: 'AssignmentExpression',
          left: expr,
          operator,
          right,
          location: mergeLocations(expr.location!, right.location!)
        };
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * 三項演算子をパース
   */
  private parseTernary(): AST.Expression {
    let expr = this.parseCoalesce();

    if (this.match(TokenKind.Question)) {
      const consequent = this.parseExpression();
      this.consume(TokenKind.Colon, "Expected ':' after ternary consequent");
      const alternate = this.parseTernary();

      return {
        type: 'ConditionalExpression',
        test: expr,
        consequent,
        alternate,
        location: mergeLocations(expr.location!, alternate.location!)
      };
    }

    return expr;
  }

  /**
   * Null 合体演算子をパース
   */
  private parseCoalesce(): AST.Expression {
    let expr = this.parseLogicalOr();

    while (this.match(TokenKind.QuestionQuestion)) {
      const right = this.parseLogicalOr();
      expr = {
        type: 'CoalesceExpression',
        left: expr,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * 論理 OR をパース
   */
  private parseLogicalOr(): AST.Expression {
    let expr = this.parseLogicalAnd();

    while (this.match(TokenKind.PipePipe, TokenKind.Or)) {
      const operator = this.previous().text as ('||' | 'or');
      const right = this.parseLogicalAnd();
      expr = {
        type: 'LogicalExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * 論理 AND をパース
   */
  private parseLogicalAnd(): AST.Expression {
    let expr = this.parseBitwiseOr();

    while (this.match(TokenKind.AmpersandAmpersand, TokenKind.And)) {
      const operator = this.previous().text as ('&&' | 'and');
      const right = this.parseBitwiseOr();
      expr = {
        type: 'LogicalExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * ビット OR をパース
   */
  private parseBitwiseOr(): AST.Expression {
    let expr = this.parseBitwiseXor();

    while (this.match(TokenKind.Pipe)) {
      const operator = '|';
      const right = this.parseBitwiseXor();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * ビット XOR をパース
   */
  private parseBitwiseXor(): AST.Expression {
    let expr = this.parseBitwiseAnd();

    while (this.match(TokenKind.Caret, TokenKind.Xor)) {
      const operator = this.previous().text as 'xor';
      const right = this.parseBitwiseAnd();
      expr = {
        type: 'LogicalExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * ビット AND をパース
   */
  private parseBitwiseAnd(): AST.Expression {
    let expr = this.parseEquality();

    while (this.match(TokenKind.Ampersand)) {
      const operator = '&';
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * 等価演算子をパース
   */
  private parseEquality(): AST.Expression {
    let expr = this.parseComparison();

    while (this.match(
      TokenKind.EqualEqual, TokenKind.BangEqual,
      TokenKind.EqualEqualEqual, TokenKind.BangEqualEqual
    )) {
      const operator = this.previous().text as AST.BinaryOperator;
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * 比較演算子をパース
   */
  private parseComparison(): AST.Expression {
    let expr = this.parseSpaceship();

    while (this.match(
      TokenKind.Less, TokenKind.Greater,
      TokenKind.LessEqual, TokenKind.GreaterEqual,
      TokenKind.Instanceof
    )) {
      const operator = this.previous().text as AST.BinaryOperator;
      const right = this.parseSpaceship();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * 宇宙船演算子をパース
   */
  private parseSpaceship(): AST.Expression {
    let expr = this.parseShift();

    while (this.match(TokenKind.Spaceship)) {
      const right = this.parseShift();
      expr = {
        type: 'SpaceshipExpression',
        left: expr,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * ビットシフトをパース
   */
  private parseShift(): AST.Expression {
    let expr = this.parseAdditive();

    while (this.match(TokenKind.LessLess, TokenKind.GreaterGreater)) {
      const operator = this.previous().text as AST.BinaryOperator;
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * 加算・減算・文字列連結をパース
   */
  private parseAdditive(): AST.Expression {
    let expr = this.parseMultiplicative();

    while (this.match(TokenKind.Plus, TokenKind.Minus, TokenKind.Dot)) {
      const operator = this.previous().text as AST.BinaryOperator;
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * 乗算・除算・剰余をパース
   */
  private parseMultiplicative(): AST.Expression {
    let expr = this.parseExponentiation();

    while (this.match(TokenKind.Star, TokenKind.Slash, TokenKind.Percent)) {
      const operator = this.previous().text as AST.BinaryOperator;
      const right = this.parseExponentiation();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * べき乗をパース
   */
  private parseExponentiation(): AST.Expression {
    let expr = this.parseUnary();

    if (this.match(TokenKind.StarStar)) {
      const operator = '**';
      // 右結合
      const right = this.parseExponentiation();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * 単項演算子をパース
   */
  private parseUnary(): AST.Expression {
    if (this.match(
      TokenKind.Bang, TokenKind.Plus, TokenKind.Minus,
      TokenKind.Tilde, TokenKind.At, TokenKind.PlusPlus, TokenKind.MinusMinus
    )) {
      const operator = this.previous().text as AST.UnaryOperator;
      const start = this.previous().location.start;
      const argument = this.parseUnary();

      return {
        type: 'UnaryExpression',
        operator,
        argument,
        prefix: true,
        location: createLocation(start, argument.location!.end)
      };
    }

    // Cast expressions
    if (this.check(TokenKind.LeftParen)) {
      const savedPos = this.current;
      this.advance();

      // Check for cast
      if (this.match(
        TokenKind.Array, TokenKind.Callable,
        TokenKind.Identifier // int, float, string, bool, object
      )) {
        const castType = this.previous().text.toLowerCase();
        if (['int', 'integer', 'float', 'double', 'string', 'bool', 'boolean', 'array', 'object'].includes(castType)) {
          this.consume(TokenKind.RightParen, "Expected ')' after cast type");
          const expr = this.parseUnary();
          return {
            type: 'CastExpression',
            kind: castType as AST.CastKind,
            argument: expr,
            location: mergeLocations(
              this.tokens[savedPos].location,
              expr.location!
            )
          };
        }
      }

      // Not a cast, restore position
      this.current = savedPos;
    }

    return this.parsePostfix();
  }

  /**
   * 後置演算子をパース
   */
  private parsePostfix(): AST.Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenKind.PlusPlus, TokenKind.MinusMinus)) {
        const operator = this.previous().text as AST.UnaryOperator;
        expr = {
          type: 'UnaryExpression',
          operator,
          argument: expr,
          prefix: false,
          location: mergeLocations(expr.location!, this.previous().location)
        };
      } else if (this.match(TokenKind.LeftBracket)) {
        // Array access
        const index = this.parseExpression();
        const end = this.consume(TokenKind.RightBracket, "Expected ']' after array index").location.end;

        expr = {
          type: 'MemberExpression',
          object: expr,
          property: index,
          computed: true,
          location: createLocation(expr.location!.start, end)
        };
      } else if (this.match(TokenKind.Arrow, TokenKind.QuestionArrow)) {
        // Property access
        const nullsafe = this.previous().kind === TokenKind.QuestionArrow;
        const property = this.parseIdentifier();

        expr = {
          type: 'MemberExpression',
          object: expr,
          property,
          computed: false,
          nullsafe,
          location: mergeLocations(expr.location!, property.location!)
        };
      } else if (this.match(TokenKind.DoubleColon)) {
        // Static access
        const property = this.match(TokenKind.Variable)
          ? this.parseVariable()
          : this.parseIdentifier();

        // PHP uses :: for static member access, but we model it as MemberExpression
        expr = {
          type: 'MemberExpression',
          object: expr,
          property,
          computed: false,
          location: mergeLocations(expr.location!, property.location!)
        };
      } else if (this.match(TokenKind.LeftParen)) {
        // Function call
        const args = this.parseArgumentList();
        const end = this.consume(TokenKind.RightParen, "Expected ')' after arguments").location.end;

        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: args,
          location: createLocation(expr.location!.start, end)
        };
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * プライマリ式をパース
   */
  private parsePrimary(): AST.Expression {
    // Literals
    if (this.match(TokenKind.Number)) {
      return this.parseNumberLiteral();
    }

    if (this.match(TokenKind.String, TokenKind.StringStart)) {
      return this.parseStringLiteral();
    }

    if (this.match(TokenKind.True, TokenKind.False)) {
      return this.parseBooleanLiteral();
    }

    if (this.match(TokenKind.Null)) {
      return this.parseNullLiteral();
    }

    // Variables
    if (this.match(TokenKind.Variable)) {
      return this.parseVariable();
    }

    // Arrays
    if (this.match(TokenKind.LeftBracket)) {
      return this.parseArrayExpression();
    }

    if (this.match(TokenKind.Array)) {
      this.consume(TokenKind.LeftParen, "Expected '(' after 'array'");
      const elements = this.parseArrayElements();
      this.consume(TokenKind.RightParen, "Expected ')' after array elements");
      return {
        type: 'ArrayExpression',
        elements,
        location: mergeLocations(
          this.tokens[this.current - 3].location,
          this.previous().location
        )
      };
    }

    // Function expressions
    if (this.match(TokenKind.Function)) {
      return this.parseFunctionExpression();
    }

    if (this.match(TokenKind.Fn)) {
      return this.parseArrowFunction();
    }

    // New expression
    if (this.match(TokenKind.New)) {
      return this.parseNewExpression();
    }

    // Clone
    if (this.match(TokenKind.Clone)) {
      const start = this.previous().location.start;
      const expr = this.parsePostfix();
      return {
        type: 'CloneExpression',
        argument: expr,
        location: createLocation(start, expr.location!.end)
      };
    }

    // Yield
    if (this.match(TokenKind.Yield)) {
      return this.parseYieldExpression();
    }

    // Parentheses
    if (this.match(TokenKind.LeftParen)) {
      const expr = this.parseExpression();
      this.consume(TokenKind.RightParen, "Expected ')' after expression");
      return expr;
    }

    // Match expression (PHP 8.0+)
    if (this.match(TokenKind.Match)) {
      return this.parseMatchExpression();
    }

    // Special expressions
    if (this.match(TokenKind.Include, TokenKind.IncludeOnce)) {
      return this.parseIncludeExpression();
    }

    if (this.match(TokenKind.Require, TokenKind.RequireOnce)) {
      return this.parseRequireExpression();
    }

    if (this.match(TokenKind.Isset)) {
      return this.parseIssetExpression();
    }

    if (this.match(TokenKind.Empty)) {
      return this.parseEmptyExpression();
    }

    if (this.match(TokenKind.Eval)) {
      return this.parseEvalExpression();
    }

    if (this.match(TokenKind.Exit)) {
      return this.parseExitExpression();
    }

    if (this.match(TokenKind.Print)) {
      return this.parsePrintExpression();
    }

    if (this.match(TokenKind.List)) {
      return this.parseListExpression();
    }

    // Names (class names, function names, constants)
    if (this.check(TokenKind.Identifier) || this.check(TokenKind.Backslash)) {
      return this.parseNameExpression();
    }

    throw this.error(this.peek(), "Expected expression");
  }

  // リテラルパーサー
  protected parseNumberLiteral(): AST.NumberLiteral {
    const token = this.previous();
    return {
      type: 'NumberLiteral',
      value: parseFloat(token.text),
      raw: token.text,
      location: token.location
    };
  }

  private parseStringLiteral(): AST.StringLiteral | AST.TemplateStringExpression {
    const token = this.previous();

    // 補間文字列の場合
    if (token.kind === TokenKind.StringStart) {
      const parts: (string | AST.Expression)[] = [];
      const start = token.location.start;

      // 開始部分 - 文字列として追加
      parts.push(token.text);

      while (!this.check(TokenKind.StringEnd)) {
        if (this.match(TokenKind.StringMiddle)) {
          parts.push(this.previous().text);
        } else {
          parts.push(this.parseExpression());
        }
      }

      const endToken = this.consume(TokenKind.StringEnd, "Expected string end");
      parts.push(endToken.text);

      return {
        type: 'TemplateStringExpression',
        parts,
        location: createLocation(start, endToken.location.end)
      };
    }

    return {
      type: 'StringLiteral',
      value: token.text,
      raw: token.text,
      location: token.location
    };
  }

  private parseBooleanLiteral(): AST.BooleanLiteral {
    const token = this.previous();
    return {
      type: 'BooleanLiteral',
      value: token.kind === TokenKind.True,
      location: token.location
    };
  }

  private parseNullLiteral(): AST.NullLiteral {
    return {
      type: 'NullLiteral',
      location: this.previous().location
    };
  }

  // 配列関連
  private parseArrayExpression(): AST.ArrayExpression {
    const start = this.previous().location.start;
    const elements = this.parseArrayElements();
    const end = this.consume(TokenKind.RightBracket, "Expected ']' after array elements").location.end;

    return {
      type: 'ArrayExpression',
      elements,
      location: createLocation(start, end)
    };
  }

  private parseArrayElements(): AST.ArrayElement[] {
    const elements: AST.ArrayElement[] = [];

    while (!this.check(TokenKind.RightBracket) && !this.check(TokenKind.RightParen) && !this.isAtEnd()) {
      if (this.match(TokenKind.Comma)) {
        // Empty element
        continue;
      }

      elements.push(this.parseArrayElement());

      if (!this.check(TokenKind.RightBracket) && !this.check(TokenKind.RightParen)) {
        this.consume(TokenKind.Comma, "Expected ',' after array element");
      }
    }

    return elements;
  }

  private parseArrayElement(): AST.ArrayElement {
    const byReference = this.match(TokenKind.Ampersand);
    const unpack = this.match(TokenKind.Ellipsis);

    let value = this.parseExpression();
    let key: AST.Expression | undefined;

    if (this.match(TokenKind.DoubleArrow)) {
      key = value;
      value = this.parseExpression();
    }

    return {
      type: 'ArrayElement',
      key,
      value,
      spread: unpack,
      location: key ? mergeLocations(key.location!, value.location!) : value.location
    };
  }

  // 関数関連
  private parseFunctionExpression(): AST.FunctionExpression {
    const start = this.previous().location.start;
    const byReference = this.match(TokenKind.Ampersand);

    this.consume(TokenKind.LeftParen, "Expected '(' after 'function'");
    const parameters = this.parseParameterList();
    this.consume(TokenKind.RightParen, "Expected ')' after parameters");

    // Use declarations
    let useVariables: AST.VariableExpression[] | undefined;
    if (this.match(TokenKind.Use)) {
      this.consume(TokenKind.LeftParen, "Expected '(' after 'use'");
      useVariables = [];

      do {
        if (this.match(TokenKind.Ampersand)) {
          // By reference
        }
        useVariables.push(this.parseVariable());
      } while (this.match(TokenKind.Comma));

      this.consume(TokenKind.RightParen, "Expected ')' after use variables");
    }

    const returnType = this.match(TokenKind.Colon) ? this.parseType() : undefined;
    const body = this.parseBlockStatement();

    return {
      type: 'FunctionExpression',
      parameters,
      body,
      byReference,
      returnType,
      uses: useVariables ? useVariables.map(v => ({
        type: 'ClosureUse' as const,
        variable: v,
        byReference: false,
        location: v.location
      })) : undefined,
      location: createLocation(start, body.location!.end)
    };
  }

  private parseArrowFunction(): AST.ArrowFunctionExpression {
    const start = this.previous().location.start;
    const byReference = this.match(TokenKind.Ampersand);

    this.consume(TokenKind.LeftParen, "Expected '(' after 'fn'");
    const parameters = this.parseParameterList();
    this.consume(TokenKind.RightParen, "Expected ')' after parameters");

    const returnType = this.match(TokenKind.Colon) ? this.parseType() : undefined;

    this.consume(TokenKind.DoubleArrow, "Expected '=>' in arrow function");
    const body = this.parseExpression();

    return {
      type: 'ArrowFunctionExpression',
      parameters,
      body,
      byReference,
      returnType,
      location: createLocation(start, body.location!.end)
    };
  }

  private parseArgumentList(): AST.Argument[] {
    const args: AST.Argument[] = [];

    while (!this.check(TokenKind.RightParen) && !this.isAtEnd()) {
      args.push(this.parseArgument());

      if (!this.check(TokenKind.RightParen)) {
        this.consume(TokenKind.Comma, "Expected ',' after argument");
      }
    }

    return args;
  }

  private parseArgument(): AST.Argument {
    // Named argument (PHP 8.0+)
    if (this.check(TokenKind.Identifier)) {
      const savedPos = this.current;
      const id = this.parseIdentifier();

      if (this.match(TokenKind.Colon)) {
        const value = this.parseExpression();
        return {
          type: 'Argument',
          name: id,
          value,
          spread: false,
          location: mergeLocations(id.location!, value.location!)
        };
      }

      // Not a named argument, restore
      this.current = savedPos;
    }

    const unpack = this.match(TokenKind.Ellipsis);
    const value = this.parseExpression();

    return {
      type: 'Argument',
      value,
      spread: unpack,
      location: value.location
    };
  }

  // その他の式
  private parseNewExpression(): AST.NewExpression {
    const start = this.previous().location.start;
    const className = this.parsePrimary();

    let args: AST.Argument[] | undefined;
    if (this.match(TokenKind.LeftParen)) {
      args = this.parseArgumentList();
      this.consume(TokenKind.RightParen, "Expected ')' after arguments");
    }

    const end = args ? this.previous().location.end : className.location!.end;

    return {
      type: 'NewExpression',
      callee: className,
      arguments: args,
      location: createLocation(start, end)
    };
  }

  private parseMatchExpression(): AST.MatchExpression {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'match'");
    const discriminant = this.parseExpression();
    this.consume(TokenKind.RightParen, "Expected ')' after match subject");

    this.consume(TokenKind.LeftBrace, "Expected '{' before match body");
    const arms: AST.MatchArm[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      const conditions: AST.Expression[] = [];

      if (this.match(TokenKind.Default)) {
        // Default arm
      } else {
        // Condition(s)
        do {
          conditions.push(this.parseExpression());
        } while (this.match(TokenKind.Comma) && !this.check(TokenKind.DoubleArrow));
      }

      this.consume(TokenKind.DoubleArrow, "Expected '=>' in match arm");
      const body = this.parseExpression();

      arms.push({
        type: 'MatchArm',
        conditions: conditions.length > 0 ? conditions : null,
        body,
        location: conditions.length > 0
          ? mergeLocations(conditions[0].location!, body.location!)
          : body.location
      });

      // Optional trailing comma
      this.match(TokenKind.Comma);
    }

    const end = this.consume(TokenKind.RightBrace, "Expected '}' after match arms").location.end;

    return {
      type: 'MatchExpression',
      discriminant,
      arms,
      location: createLocation(start, end)
    };
  }

  private parseYieldExpression(): AST.YieldExpression {
    const start = this.previous().location.start;

    let key: AST.Expression | undefined;
    let value: AST.Expression | undefined;

    // yield can be used without a value
    if (!this.check(TokenKind.Semicolon) && !this.check(TokenKind.RightParen) &&
      !this.check(TokenKind.Comma) && !this.isAtEnd()) {

      // Check for yield from
      if (this.peek().kind === TokenKind.Identifier && this.peek().text.toLowerCase() === 'from') {
        this.advance(); // consume 'from'
        // yield from is handled as a regular yield with the from expression as value
        value = this.parseExpression();
      } else {
        // Parse first expression
        const expr = this.parseExpression();

        // Check for key => value
        if (this.match(TokenKind.DoubleArrow)) {
          key = expr;
          value = this.parseExpression();
        } else {
          value = expr;
        }
      }
    }

    const end = value?.location?.end || start;

    return {
      type: 'YieldExpression',
      key,
      value,
      location: createLocation(start, end)
    };
  }

  // 特殊な式
  private parseIncludeExpression(): AST.IncludeExpression {
    const kind = this.previous().text as any;
    const start = this.previous().location.start;
    const path = this.parseExpression();

    return {
      type: 'IncludeExpression',
      kind,
      argument: path,
      location: createLocation(start, path.location!.end)
    };
  }

  private parseRequireExpression(): AST.RequireExpression {
    const kind = this.previous().text as any;
    const start = this.previous().location.start;
    const path = this.parseExpression();

    return {
      type: 'RequireExpression',
      kind,
      argument: path,
      location: createLocation(start, path.location!.end)
    };
  }

  private parseIssetExpression(): AST.IssetExpression {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'isset'");
    const variables: AST.Expression[] = [];

    do {
      variables.push(this.parseExpression());
    } while (this.match(TokenKind.Comma));

    const end = this.consume(TokenKind.RightParen, "Expected ')' after isset variables").location.end;

    return {
      type: 'IssetExpression',
      arguments: variables,
      location: createLocation(start, end)
    };
  }

  private parseEmptyExpression(): AST.EmptyExpression {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'empty'");
    const expression = this.parseExpression();
    const end = this.consume(TokenKind.RightParen, "Expected ')' after empty expression").location.end;

    return {
      type: 'EmptyExpression',
      argument: expression,
      location: createLocation(start, end)
    };
  }

  private parseEvalExpression(): AST.EvalExpression {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'eval'");
    const code = this.parseExpression();
    const end = this.consume(TokenKind.RightParen, "Expected ')' after eval code").location.end;

    return {
      type: 'EvalExpression',
      argument: code,
      location: createLocation(start, end)
    };
  }

  private parseExitExpression(): AST.ExitExpression {
    const start = this.previous().location.start;
    let status: AST.Expression | undefined;

    if (this.match(TokenKind.LeftParen)) {
      if (!this.check(TokenKind.RightParen)) {
        status = this.parseExpression();
      }
      this.consume(TokenKind.RightParen, "Expected ')' after exit status");
    }

    const end = status?.location?.end || start;

    return {
      type: 'ExitExpression',
      argument: status,
      location: createLocation(start, end)
    };
  }

  private parsePrintExpression(): AST.PrintExpression {
    const start = this.previous().location.start;
    const expression = this.parseExpression();

    return {
      type: 'PrintExpression',
      argument: expression,
      location: createLocation(start, expression.location!.end)
    };
  }

  private parseListExpression(): AST.ListExpression {
    const start = this.previous().location.start;

    this.consume(TokenKind.LeftParen, "Expected '(' after 'list'");
    const elements: (AST.Expression | null)[] = [];

    while (!this.check(TokenKind.RightParen) && !this.isAtEnd()) {
      if (this.match(TokenKind.Comma)) {
        elements.push(null);
      } else {
        elements.push(this.parseExpression());
        if (!this.check(TokenKind.RightParen)) {
          this.consume(TokenKind.Comma, "Expected ',' after list element");
        }
      }
    }

    const end = this.consume(TokenKind.RightParen, "Expected ')' after list elements").location.end;

    return {
      type: 'ListExpression',
      elements: elements as (AST.VariableExpression | AST.ListExpression | null)[],
      location: createLocation(start, end)
    };
  }

  // ヘルパーメソッド（base.tsから必要なものを継承）
  protected parseParameterList(): AST.Parameter[] {
    // declarationに移動予定
    return [];
  }

  protected parseType(): AST.TypeNode {
    // declarationに移動予定
    return { type: 'SimpleType', name: 'mixed' } as any;
  }

  protected parseBlockStatement(): AST.BlockStatement {
    // statementに移動予定
    return { type: 'BlockStatement', statements: [], location: this.peek().location } as any;
  }
}