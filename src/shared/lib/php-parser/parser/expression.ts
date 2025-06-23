/**
 * Expression Parser Module
 * 
 * Implements a recursive descent parser for PHP expressions
 * with correct operator precedence and associativity.
 * 
 * @module expression
 */

import { TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { createLocation, mergeLocations } from '../core/location.js';
import { ParserBase } from './base.js';

/**
 * Expression parser that handles all PHP expressions
 * following operator precedence rules.
 * 
 * @extends ParserBase
 */
export class ExpressionParser extends ParserBase {
  /**
   * Main entry point for parsing expressions.
   * 
   * @returns The parsed expression
   * @throws ParseError if expression syntax is invalid
   */
  parseExpression(): AST.Expression {
    return this.parseAssignment();
  }

  /**
   * Parses assignment expressions.
   * 
   * Handles:
   * - Simple assignment (=)
   * - Compound assignments (+=, -=, etc.)
   * - Array destructuring assignments
   * 
   * @private
   * @returns The parsed assignment expression
   */
  private parseAssignment(): AST.Expression {
    let expr = this.parseTernary();

    while (true) {
      if (this.match(TokenKind.Equal)) {
        const operator = '=';
        const right = this.parseAssignment();
        
        // Convert ArrayExpression to ArrayPattern for destructuring assignment
        if (expr.type === 'ArrayExpression') {
          const pattern: AST.ArrayPattern = {
            type: 'ArrayPattern',
            elements: expr.elements.map(elem => {
              if (elem.key) {
                throw this.error(this.previous(), "Cannot use array key in destructuring assignment");
              }
              if (elem.value.type === 'VariableExpression' || elem.value.type === 'ArrayExpression') {
                return elem.value.type === 'ArrayExpression' 
                  ? { type: 'ArrayPattern', elements: [], location: elem.value.location } as AST.ArrayPattern
                  : elem.value as AST.VariableExpression;
              }
              return null;
            }),
            location: expr.location
          };
          expr = pattern;
        }
        
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
   * Parses ternary conditional expressions.
   * 
   * Handles:
   * - Full ternary: test ? consequent : alternate
   * - Short ternary: test ?: alternate (PHP 5.3+)
   * 
   * @private
   * @returns The parsed conditional expression
   */
  private parseTernary(): AST.Expression {
    let expr = this.parseCoalesce();

    if (this.match(TokenKind.Question)) {
      // Check for short ternary (?:)
      if (this.check(TokenKind.Colon)) {
        this.advance(); // consume ':'
        const alternate = this.parseTernary();
        
        return {
          type: 'ConditionalExpression',
          test: expr,
          consequent: undefined, // Short ternary has no consequent
          alternate,
          location: mergeLocations(expr.location!, alternate.location!)
        };
      } else {
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
    }

    return expr;
  }

  /**
   * Parses null coalescing operator (??).
   * 
   * PHP 7.0+ feature for null checking.
   * 
   * @private
   * @returns The parsed coalesce expression
   */
  private parseCoalesce(): AST.Expression {
    let expr = this.parseLogicalOr();

    while (this.match(TokenKind.QuestionQuestion)) {
      const right = this.parseLogicalOr();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: '??',
        right,
        location: mergeLocations(expr.location!, right.location!)
      };
    }

    return expr;
  }

  /**
   * Parses logical OR expressions (|| or 'or').
   * 
   * Note: || and 'or' have different precedence.
   * 
   * @private
   * @returns The parsed logical OR expression
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
   * Parses logical AND expressions (&& or 'and').
   * 
   * Note: && and 'and' have different precedence.
   * 
   * @private
   * @returns The parsed logical AND expression
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
   * Parses bitwise OR expressions (|).
   * 
   * @private
   * @returns The parsed bitwise OR expression
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
   * Parses bitwise XOR expressions (^ or 'xor').
   * 
   * @private
   * @returns The parsed bitwise XOR expression
   */
  private parseBitwiseXor(): AST.Expression {
    let expr = this.parseBitwiseAnd();

    while (this.match(TokenKind.Caret, TokenKind.Xor)) {
      const operator = this.previous().text as ('^' | 'xor');
      const right = this.parseBitwiseAnd();
      
      // ^ is bitwise operator, xor is logical operator
      if (operator === '^') {
        expr = {
          type: 'BinaryExpression',
          left: expr,
          operator,
          right,
          location: mergeLocations(expr.location!, right.location!)
        };
      } else {
        expr = {
          type: 'LogicalExpression',
          left: expr,
          operator,
          right,
          location: mergeLocations(expr.location!, right.location!)
        };
      }
    }

    return expr;
  }

  /**
   * Parses bitwise AND expressions (&).
   * 
   * @private
   * @returns The parsed bitwise AND expression
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
   * Parses equality comparison expressions.
   * 
   * Handles:
   * - == (loose equality)
   * - != (loose inequality)
   * - === (strict equality)
   * - !== (strict inequality)
   * 
   * @private
   * @returns The parsed equality expression
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
   * Parses comparison operators.
   * 
   * Handles: <, >, <=, >=, instanceof
   * 
   * @private
   * @returns The parsed comparison expression
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
   * Parses spaceship operator (<=>).
   * 
   * PHP 7.0+ three-way comparison operator.
   * 
   * @private
   * @returns The parsed spaceship expression
   */
  private parseSpaceship(): AST.Expression {
    let expr = this.parseShift();

    while (this.match(TokenKind.Spaceship)) {
      const operator = '<=>' as AST.BinaryOperator;
      const right = this.parseShift();
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
   * Parses bit shift operators.
   * 
   * Handles: << (left shift), >> (right shift)
   * 
   * @private
   * @returns The parsed shift expression
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
   * Parses additive operators.
   * 
   * Handles:
   * - + (addition)
   * - - (subtraction)
   * - . (string concatenation)
   * 
   * @private
   * @returns The parsed additive expression
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
   * Parses multiplicative operators.
   * 
   * Handles:
   * - * (multiplication)
   * - / (division)
   * - % (modulo)
   * 
   * @private
   * @returns The parsed multiplicative expression
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
   * Parses exponentiation operator (**).
   * 
   * PHP 5.6+ feature. Right-associative.
   * 
   * @private
   * @returns The parsed exponentiation expression
   */
  private parseExponentiation(): AST.Expression {
    let expr = this.parseUnary();

    if (this.match(TokenKind.StarStar)) {
      const operator = '**';
      // Right-associative
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
   * Parses unary operators.
   * 
   * Handles:
   * - ! (logical not)
   * - + (unary plus)
   * - - (unary minus)
   * - ~ (bitwise not)
   * - @ (error suppression)
   * - ++ (prefix increment)
   * - -- (prefix decrement)
   * - Type casts: (int), (float), (string), etc.
   * 
   * @private
   * @returns The parsed unary expression
   */
  private parseUnary(): AST.Expression {
    if (this.match(
      TokenKind.Bang, TokenKind.Plus, TokenKind.Minus,
      TokenKind.Tilde, TokenKind.At
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

    // Prefix increment/decrement
    if (this.match(TokenKind.PlusPlus, TokenKind.MinusMinus)) {
      const operator = this.previous().text as ('++' | '--');
      const start = this.previous().location.start;
      const argument = this.parseUnary();

      return {
        type: 'UpdateExpression',
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
          
          // Normalize cast types
          let normalizedKind: AST.CastKind = castType as AST.CastKind;
          if (castType === 'integer') normalizedKind = 'int';
          else if (castType === 'double') normalizedKind = 'float';
          else if (castType === 'boolean') normalizedKind = 'bool';
          
          return {
            type: 'CastExpression',
            kind: normalizedKind,
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
   * Parses postfix operators.
   * 
   * Handles:
   * - ++ (postfix increment)
   * - -- (postfix decrement)
   * - [] (array access)
   * - -> (object member access)
   * - :: (static member access)
   * - () (function/method calls)
   * - ?-> (nullsafe operator, PHP 8.0+)
   * 
   * @private
   * @returns The parsed postfix expression
   */
  private parsePostfix(): AST.Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenKind.PlusPlus, TokenKind.MinusMinus)) {
        const operator = this.previous().text as ('++' | '--');
        expr = {
          type: 'UpdateExpression',
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
        let property: AST.Expression | AST.Identifier;
        if (this.check(TokenKind.Variable)) {
          property = this.advance() && this.parseVariable();
        } else if (this.check(TokenKind.LeftBrace)) {
          // {$expr} syntax for dynamic property
          this.advance(); // consume '{'
          property = this.parseExpression();
          this.consume(TokenKind.RightBrace, "Expected '}' after property expression");
        } else {
          property = this.parseIdentifier();
        }

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
        // Convert Identifier to NameExpression for class names
        const object = expr.type === 'Identifier'
          ? {
              type: 'NameExpression' as const,
              parts: [expr.name],
              qualified: 'unqualified' as const,
              location: expr.location
            }
          : expr;
          
        const property = this.match(TokenKind.Variable)
          ? this.parseVariable()
          : this.parseIdentifier();

        // PHP uses :: for static member access, but we model it as MemberExpression
        expr = {
          type: 'MemberExpression',
          object,
          property,
          computed: false,
          location: mergeLocations(expr.location!, property.location!)
        };
      } else if (this.match(TokenKind.LeftParen)) {
        // Function call
        const args = this.parseArgumentList();
        const end = this.consume(TokenKind.RightParen, "Expected ')' after arguments").location.end;

        // Convert Identifier to NameExpression for function calls
        const callee = expr.type === 'Identifier' 
          ? {
              type: 'NameExpression' as const,
              parts: [expr.name],
              qualified: 'unqualified' as const,
              location: expr.location
            }
          : expr;
        
        expr = {
          type: 'CallExpression',
          callee,
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
   * Parses primary expressions.
   * 
   * Handles:
   * - Literals (numbers, strings, booleans, null)
   * - Variables (including variable variables)
   * - Arrays
   * - Function expressions and arrow functions
   * - new expressions
   * - Identifiers
   * - Parenthesized expressions
   * - Inline HTML
   * 
   * @private
   * @returns The parsed primary expression
   * @throws ParseError if no valid expression is found
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

    // Variable variables: $$foo
    if (this.match(TokenKind.Dollar)) {
      const start = this.previous().location.start;
      if (this.match(TokenKind.Variable)) {
        const varExpr = this.parseVariable();
        return {
          type: 'VariableExpression',
          name: varExpr,
          location: createLocation(start, varExpr.location!.end)
        };
      } else {
        throw this.error(this.peek(), "Expected variable after $");
      }
    }
    
    // Variables
    if (this.match(TokenKind.Variable)) {
      const var1 = this.parseVariable();
      
      // Check for variable variables that start with a variable: $foo$$bar
      if (this.peek().kind === TokenKind.Dollar) {
        // This is a more complex case, for now just return the simple variable
      }
      return var1;
      
      return var1;
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
      // Treat print as a function call
      const start = this.previous().location.start;
      const printIdentifier: AST.Identifier = {
        type: 'Identifier',
        name: 'print',
        location: this.previous().location
      };
      
      // If parentheses follow print, handle as a regular function call
      if (this.check(TokenKind.LeftParen)) {
        this.advance(); // consume '('
        const args = this.parseArgumentList();
        const end = this.consume(TokenKind.RightParen, "Expected ')' after arguments").location.end;
        
        return {
          type: 'CallExpression',
          callee: printIdentifier,
          arguments: args,
          location: createLocation(start, end)
        };
      }
      
      // Without parentheses, handle as PrintExpression
      const expression = this.parseExpression();
      return {
        type: 'PrintExpression',
        argument: expression,
        location: createLocation(start, expression.location!.end)
      };
    }

    if (this.match(TokenKind.List)) {
      return this.parseListExpression();
    }

    // Names (class names, function names, constants)
    if (this.check(TokenKind.Identifier)) {
      // For simple identifiers, return Identifier instead of NameExpression
      const token = this.advance();
      return {
        type: 'Identifier',
        name: token.text,
        location: token.location
      };
    }
    
    // Handle reserved words that can be used as class names in expressions
    if (this.check(TokenKind.Class) || this.check(TokenKind.Interface) || 
        this.check(TokenKind.Trait) || this.check(TokenKind.Abstract) ||
        this.check(TokenKind.Final)) {
      const token = this.advance();
      // Convert to lowercase for consistency with PHP (Class -> class)
      return {
        type: 'Identifier',
        name: token.text.toLowerCase(),
        location: token.location
      };
    }
    
    if (this.check(TokenKind.Backslash)) {
      // Fully qualified names still use NameExpression
      return this.parseNameExpression();
    }

    throw this.error(this.peek(), "Expected expression");
  }

  /**
   * Parses a number literal.
   * 
   * @protected
   * @returns The parsed number literal
   */
  protected parseNumberLiteral(): AST.NumberLiteral {
    const token = this.previous();
    return {
      type: 'NumberLiteral',
      value: token.text,
      raw: token.text,
      location: token.location
    };
  }

  /**
   * Parses a string literal or template string.
   * 
   * Handles:
   * - Simple string literals
   * - Interpolated strings with variables/expressions
   * 
   * @private
   * @returns The parsed string literal or template expression
   */
  private parseStringLiteral(): AST.StringLiteral | AST.TemplateStringExpression {
    const token = this.previous();

    // Handle interpolated strings
    if (token.kind === TokenKind.StringStart) {
      const parts: (string | AST.Expression)[] = [];
      const start = token.location.start;

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

    // Remove quotes from the string value
    const value = token.text.slice(1, -1); // Remove first and last character (quotes)
    
    return {
      type: 'StringLiteral',
      value,
      raw: token.text,
      location: token.location
    };
  }

  /**
   * Parses a boolean literal (true/false).
   * 
   * @private
   * @returns The parsed boolean literal
   */
  private parseBooleanLiteral(): AST.BooleanLiteral {
    const token = this.previous();
    return {
      type: 'BooleanLiteral',
      value: token.kind === TokenKind.True,
      location: token.location
    };
  }

  /**
   * Parses a null literal.
   * 
   * @private
   * @returns The parsed null literal
   */
  private parseNullLiteral(): AST.NullLiteral {
    return {
      type: 'NullLiteral',
      location: this.previous().location
    };
  }

  /**
   * Parses an array expression using [] syntax.
   * 
   * @private
   * @returns The parsed array expression
   */
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

  /**
   * Parses array elements.
   * 
   * Handles:
   * - Key-value pairs
   * - Spread operator (...)
   * - Reference operator (&)
   * 
   * @private
   * @returns Array of parsed elements
   */
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

  /**
   * Parses a single array element.
   * 
   * @private
   * @returns The parsed array element
   */
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

  /**
   * Parses a function/method argument list.
   * 
   * @private
   * @returns Array of parsed arguments
   */
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

  /**
   * Parses a single function/method argument.
   * 
   * Handles:
   * - Named arguments (PHP 8.0+)
   * - Spread operator (...)
   * - Regular positional arguments
   * 
   * @private
   * @returns The parsed argument
   */
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

    // If spread operator is used, return SpreadElement
    if (unpack) {
      return {
        type: 'SpreadElement',
        argument: value,
        location: mergeLocations(this.tokens[this.current - 2].location, value.location!)
      } as any; // Cast to any since Argument type doesn't include SpreadElement yet
    }

    return {
      type: 'Argument',
      value,
      spread: false,
      location: value.location
    };
  }

  /**
   * Parses a new expression.
   * 
   * Handles:
   * - new ClassName(args)
   * - new class(args) { ... } (anonymous classes)
   * 
   * @private
   * @returns The parsed new expression
   */
  private parseNewExpression(): AST.NewExpression {
    const start = this.previous().location.start;
    
    // Check for anonymous class: new class { ... }
    if (this.check(TokenKind.Class)) {
      this.advance(); // consume 'class'
      
      // Optional arguments before class definition
      let args: AST.Argument[] | undefined;
      if (this.match(TokenKind.LeftParen)) {
        args = this.parseArgumentList();
        this.consume(TokenKind.RightParen, "Expected ')' after arguments");
      }
      
      // Parse the anonymous class definition
      const classExpr = this.parseAnonymousClass();
      
      return {
        type: 'NewExpression',
        callee: classExpr,
        arguments: args,
        location: createLocation(start, classExpr.location!.end)
      };
    }
    
    // Regular new expression
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

  /**
   * Parses a match expression (PHP 8.0+).
   * 
   * Similar to switch but with expression semantics.
   * 
   * @private
   * @returns The parsed match expression
   */
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

  /**
   * Parses a yield expression.
   * 
   * Handles:
   * - yield
   * - yield value
   * - yield key => value
   * - yield from iterable
   * 
   * @private
   * @returns The parsed yield expression
   */
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

  /**
   * Parses an include/include_once expression.
   * 
   * @private
   * @returns The parsed include expression
   */
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

  /**
   * Parses a require/require_once expression.
   * 
   * @private
   * @returns The parsed require expression
   */
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

  /**
   * Parses an isset expression.
   * 
   * Checks if variables are set and not null.
   * 
   * @private
   * @returns The parsed isset expression
   */
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

  /**
   * Parses an empty expression.
   * 
   * Checks if a variable is empty.
   * 
   * @private
   * @returns The parsed empty expression
   */
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

  /**
   * Parses an eval expression.
   * 
   * Evaluates PHP code in a string.
   * 
   * @private
   * @returns The parsed eval expression
   */
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

  /**
   * Parses an exit/die expression.
   * 
   * @private
   * @returns The parsed exit expression
   */
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

  /**
   * Parses a print expression.
   * 
   * @private
   * @returns The parsed print expression
   */
  private parsePrintExpression(): AST.PrintExpression {
    const start = this.previous().location.start;
    const expression = this.parseExpression();

    return {
      type: 'PrintExpression',
      argument: expression,
      location: createLocation(start, expression.location!.end)
    };
  }

  /**
   * Parses a list() expression.
   * 
   * Used for array destructuring.
   * 
   * @private
   * @returns The parsed list expression
   */
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

  /**
   * Parses an anonymous class expression.
   * 
   * @private
   * @returns The parsed class expression
   */
  private parseAnonymousClass(): AST.ClassExpression {
    const start = this.previous().location.start;
    
    // Optional extends clause
    let superClass: AST.NameExpression | undefined;
    if (this.match(TokenKind.Extends)) {
      superClass = this.parseNameExpression();
    }
    
    // Optional implements clause
    let interfaces: AST.NameExpression[] | undefined;
    if (this.match(TokenKind.Implements)) {
      interfaces = [];
      do {
        interfaces.push(this.parseNameExpression());
      } while (this.match(TokenKind.Comma));
    }
    
    // Class body
    this.consume(TokenKind.LeftBrace, "Expected '{' before class body");
    const body: AST.ClassMember[] = [];
    
    // Parse class members (simplified version for anonymous classes)
    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      // Skip comments and whitespace
      while (this.peek().kind === TokenKind.Whitespace || 
             this.peek().kind === TokenKind.Newline ||
             this.peek().kind === TokenKind.Comment) {
        this.advance();
      }
      
      if (this.check(TokenKind.RightBrace)) break;
      
      // Handle trait use
      if (this.check(TokenKind.Use)) {
        const member = this.parseSimpleTraitUse();
        if (member) body.push(member);
        continue;
      }
      
      // Collect modifiers
      const modifiers: string[] = [];
      while (this.checkModifierToken()) {
        modifiers.push(this.advance().text.toLowerCase());
      }
      
      // Handle methods
      if (this.check(TokenKind.Function)) {
        const member = this.parseSimpleMethod(modifiers);
        if (member) body.push(member);
        continue;
      }
      
      // Handle properties
      if (this.check(TokenKind.Variable) || modifiers.length > 0) {
        const member = this.parseSimpleProperty(modifiers);
        if (member) body.push(member);
        continue;
      }
      
      // Skip unknown tokens
      this.advance();
    }
    
    const end = this.check(TokenKind.RightBrace) 
      ? this.consume(TokenKind.RightBrace, "Expected '}' after class body").location.end
      : this.previous().location.end;
    
    return {
      type: 'ClassExpression',
      superClass,
      interfaces,
      body,
      location: createLocation(start, end)
    };
  }

  /**
   * Checks if the current token is a class member modifier.
   * Used in anonymous class parsing.
   * 
   * @private
   * @returns True if the token is a modifier
   */
  private checkModifierToken(): boolean {
    const kind = this.peek().kind;
    return kind === TokenKind.Public || kind === TokenKind.Private || 
           kind === TokenKind.Protected || kind === TokenKind.Static ||
           kind === TokenKind.Abstract || kind === TokenKind.Final ||
           kind === TokenKind.Readonly;
  }

  /**
   * Parses a simplified trait use statement for anonymous classes.
   * 
   * @private
   * @returns The parsed trait use statement or null
   */
  private parseSimpleTraitUse(): AST.TraitUseStatement | null {
    const start = this.advance().location.start; // consume 'use'
    const traits: AST.NameExpression[] = [];
    
    do {
      traits.push(this.parseNameExpression());
    } while (this.match(TokenKind.Comma));
    
    // Check for trait adaptations
    if (this.check(TokenKind.LeftBrace)) {
      this.advance(); // consume '{'
      let braceDepth = 1;
      while (braceDepth > 0 && !this.isAtEnd()) {
        if (this.peek().kind === TokenKind.LeftBrace) {
          braceDepth++;
        } else if (this.peek().kind === TokenKind.RightBrace) {
          braceDepth--;
        }
        this.advance();
      }
    } else {
      // Semicolon is required if there are no adaptations
      this.consume(TokenKind.Semicolon, "Expected ';' after trait use");
    }
    
    return {
      type: 'TraitUseStatement',
      traits,
      adaptations: undefined,
      location: createLocation(start, this.previous().location.end)
    };
  }

  /**
   * Parses a simplified method declaration for anonymous classes.
   * 
   * @private
   * @param modifiers - Pre-parsed method modifiers
   * @returns The parsed method declaration or null
   */
  private parseSimpleMethod(modifiers: string[]): AST.MethodDeclaration | null {
    const start = modifiers.length > 0 
      ? this.tokens[this.current - modifiers.length].location.start 
      : this.peek().location.start;
      
    this.advance(); // consume 'function'
    const name = this.parseIdentifier();
    
    this.consume(TokenKind.LeftParen, "Expected '(' after method name");
    const parameters: AST.Parameter[] = [];
    
    // Parse parameters
    if (!this.check(TokenKind.RightParen)) {
      do {
        // Skip parameter parsing for now - just consume until ) or ,
        while (!this.check(TokenKind.RightParen) && !this.check(TokenKind.Comma) && !this.isAtEnd()) {
          this.advance();
        }
      } while (this.match(TokenKind.Comma));
    }
    
    this.consume(TokenKind.RightParen, "Expected ')' after parameters");
    
    // Skip return type
    if (this.match(TokenKind.Colon)) {
      while (!this.check(TokenKind.LeftBrace) && !this.isAtEnd()) {
        this.advance();
      }
    }
    
    // Parse body
    this.consume(TokenKind.LeftBrace, "Expected '{' before method body");
    let braceDepth = 1;
    while (braceDepth > 0 && !this.isAtEnd()) {
      if (this.peek().kind === TokenKind.LeftBrace) {
        braceDepth++;
      } else if (this.peek().kind === TokenKind.RightBrace) {
        braceDepth--;
      }
      this.advance();
    }
    
    return {
      type: 'MethodDeclaration',
      name,
      parameters,
      body: { type: 'BlockStatement', statements: [], location: undefined },
      modifiers: modifiers as AST.MethodModifier[],
      location: createLocation(start, this.previous().location.end)
    };
  }

  /**
   * Parses a simplified property declaration for anonymous classes.
   * 
   * @private
   * @param modifiers - Pre-parsed property modifiers
   * @returns The parsed property declaration or null
   */
  private parseSimpleProperty(modifiers: string[]): AST.PropertyDeclaration | null {
    const start = modifiers.length > 0 
      ? this.tokens[this.current - modifiers.length].location.start 
      : this.peek().location.start;
    
    // Skip type hint if present
    while (!this.check(TokenKind.Variable) && !this.check(TokenKind.Semicolon) && !this.isAtEnd()) {
      this.advance();
    }
    
    if (!this.check(TokenKind.Variable)) return null;
    
    const name = this.advance(); // consume variable
    
    // Skip initialization
    if (this.match(TokenKind.Equal)) {
      let depth = 0;
      while (!this.check(TokenKind.Semicolon) || depth > 0) {
        if (this.isAtEnd()) break;
        
        const token = this.advance();
        if (token.kind === TokenKind.LeftParen || token.kind === TokenKind.LeftBrace || token.kind === TokenKind.LeftBracket) {
          depth++;
        } else if (token.kind === TokenKind.RightParen || token.kind === TokenKind.RightBrace || token.kind === TokenKind.RightBracket) {
          depth--;
        }
      }
    }
    
    this.consume(TokenKind.Semicolon, "Expected ';' after property declaration");
    
    return {
      type: 'PropertyDeclaration',
      name: {
        type: 'Identifier',
        name: name.text.substring(1), // remove $
        location: name.location
      },
      modifiers: modifiers as AST.PropertyModifier[],
      location: createLocation(start, this.previous().location.end)
    };
  }

  /**
   * Parses a function expression (anonymous function/closure).
   * 
   * Handles:
   * - Parameters
   * - Use clause for capturing variables
   * - Return type
   * - Function body
   * 
   * @private
   * @returns The parsed function expression
   */
  private parseFunctionExpression(): AST.FunctionExpression {
    const start = this.previous().location.start;
    
    // Optional return by reference
    const returnByRef = this.match(TokenKind.Ampersand);
    
    // Parameters
    this.consume(TokenKind.LeftParen, "Expected '(' after 'function'");
    const parameters: AST.Parameter[] = [];
    if (!this.check(TokenKind.RightParen)) {
      do {
        parameters.push(this.parseParameter());
      } while (this.match(TokenKind.Comma));
    }
    this.consume(TokenKind.RightParen, "Expected ')' after parameters");
    
    // Optional use clause
    let uses: AST.ClosureUse[] | undefined;
    if (this.match(TokenKind.Use)) {
      uses = [];
      this.consume(TokenKind.LeftParen, "Expected '(' after 'use'");
      do {
        const byRef = this.match(TokenKind.Ampersand);
        if (this.match(TokenKind.Variable)) {
          const variable = this.parseVariable();
          uses.push({
            type: 'ClosureUse',
            variable,
            byReference: byRef,
            location: variable.location
          });
        }
      } while (this.match(TokenKind.Comma));
      this.consume(TokenKind.RightParen, "Expected ')' after use variables");
    }
    
    // Optional return type
    let returnType: AST.TypeNode | undefined;
    if (this.match(TokenKind.Colon)) {
      returnType = this.parseType();
    }
    
    // Body
    const body = (this as any).parseBlockStatement();
    
    return {
      type: 'FunctionExpression',
      parameters,
      returnType,
      body,
      uses,
      byReference: returnByRef,
      location: createLocation(start, body.location!.end)
    };
  }
  
  /**
   * Parses an arrow function expression (fn).
   * 
   * PHP 7.4+ short closure syntax.
   * 
   * @private
   * @returns The parsed arrow function expression
   */
  private parseArrowFunction(): AST.ArrowFunctionExpression {
    const start = this.previous().location.start;
    
    // Parameters
    this.consume(TokenKind.LeftParen, "Expected '(' after 'fn'");
    const parameters: AST.Parameter[] = [];
    if (!this.check(TokenKind.RightParen)) {
      do {
        parameters.push(this.parseParameter());
      } while (this.match(TokenKind.Comma));
    }
    this.consume(TokenKind.RightParen, "Expected ')' after parameters");
    
    // Optional return type
    let returnType: AST.TypeNode | undefined;
    if (this.match(TokenKind.Colon)) {
      returnType = this.parseType();
    }
    
    // Arrow
    this.consume(TokenKind.DoubleArrow, "Expected '=>' after parameters");
    
    // Body (single expression)
    const body = this.parseExpression();
    
    return {
      type: 'ArrowFunctionExpression',
      parameters,
      returnType,
      body,
      location: createLocation(start, body.location!.end)
    };
  }

  /**
   * Parses a parameter list for functions/methods.
   * 
   * @protected
   * @returns Array of parsed parameters
   */
  protected parseParameterList(): AST.Parameter[] {
    const parameters: AST.Parameter[] = [];
    
    if (!this.check(TokenKind.RightParen)) {
      do {
        const start = this.peek().location.start;
        
        // Parse type hint
        let type: AST.TypeNode | undefined;
        if (this.checkType()) {
          type = this.parseType();
        }
        
        // Ampersand for pass-by-reference
        const byReference = this.match(TokenKind.Ampersand);
        
        // Variadic parameter
        const variadic = this.match(TokenKind.Ellipsis);
        
        // Parameter variable
        const name = this.consume(TokenKind.Variable, "Expected parameter variable");
        
        // Default value
        let defaultValue: AST.Expression | undefined;
        if (this.match(TokenKind.Equal)) {
          defaultValue = this.parseExpression();
        }
        
        parameters.push({
          type: 'Parameter',
          name: { type: 'VariableExpression', name: name.text.substring(1), location: name.location },
          typeAnnotation: type,
          byReference,
          variadic,
          defaultValue,
          location: createLocation(start, this.previous().location.end)
        });
      } while (this.match(TokenKind.Comma));
    }
    
    return parameters;
  }

  /**
   * Parses a single function parameter.
   * 
   * Handles:
   * - Promoted properties (PHP 8.0+)
   * - Type hints
   * - By-reference parameters (&)
   * - Variadic parameters (...)
   * - Default values
   * 
   * @protected
   * @returns The parsed parameter
   */
  protected parseParameter(): AST.Parameter {
    const start = this.peek().location.start;

    // Promoted properties (PHP 8.0+)
    const promoted: AST.PropertyModifier[] = [];
    while (this.match(TokenKind.Public, TokenKind.Protected, TokenKind.Private, TokenKind.Readonly)) {
      promoted.push(this.previous().text.toLowerCase() as AST.PropertyModifier);
    }

    // Type
    let typeAnnotation: AST.TypeNode | undefined;
    if (!this.check(TokenKind.Ellipsis) && !this.check(TokenKind.Ampersand) && !this.check(TokenKind.Variable)) {
      typeAnnotation = this.parseType();
    }

    // By reference
    const byReference = this.match(TokenKind.Ampersand);

    // Variadic
    const variadic = this.match(TokenKind.Ellipsis);

    // Name
    this.consume(TokenKind.Variable, "Expected parameter variable");
    const name = this.parseVariable();

    // Default value
    let defaultValue: AST.Expression | undefined;
    if (this.match(TokenKind.Equal)) {
      defaultValue = this.parseExpression();
    }

    const end = defaultValue?.location?.end || name.location!.end;

    return {
      type: 'Parameter',
      name,
      typeAnnotation,
      defaultValue,
      byReference,
      variadic,
      promoted: promoted.length > 0 ? promoted : undefined,
      location: createLocation(start, end)
    };
  }
  
  /**
   * Checks if the current token can start a type declaration.
   * 
   * @returns True if a type can be parsed
   */
  checkType(): boolean {
    // Check if current token can start a type
    const token = this.peek();
    return token.kind === TokenKind.Identifier ||
           token.kind === TokenKind.Array ||
           token.kind === TokenKind.Callable ||
           token.kind === TokenKind.Question ||
           token.kind === TokenKind.Namespace ||
           token.kind === TokenKind.Backslash;
  }
  
  /**
   * Parses a type declaration.
   * 
   * Handles:
   * - Nullable types (?Type)
   * - Union types (Type1|Type2)
   * - Intersection types (Type1&Type2)
   * - Built-in types (array, callable)
   * - Named types (classes, interfaces)
   * 
   * @protected
   * @returns The parsed type node
   */
  protected parseType(): AST.TypeNode {
    const start = this.peek().location.start;

    // Nullable type
    if (this.match(TokenKind.Question)) {
      const typeAnnotation = this.parseType();
      return {
        type: 'NullableType',
        typeAnnotation,
        location: createLocation(start, typeAnnotation.location!.end)
      };
    }

    // Union/Intersection types
    let types: AST.TypeNode[] = [];
    types.push(this.parseSingleType());

    // Union type (|)
    if (this.check(TokenKind.Pipe)) {
      while (this.match(TokenKind.Pipe)) {
        types.push(this.parseSingleType());
      }

      return {
        type: 'UnionType',
        types,
        location: createLocation(start, types[types.length - 1].location!.end)
      };
    }

    // Intersection type (&)
    if (this.check(TokenKind.Ampersand)) {
      while (this.match(TokenKind.Ampersand)) {
        types.push(this.parseSingleType());
      }

      return {
        type: 'IntersectionType',
        types,
        location: createLocation(start, types[types.length - 1].location!.end)
      };
    }

    return types[0];
  }

  /**
   * Parses a single type (not union or intersection).
   * 
   * Handles:
   * - Built-in types (array, callable)
   * - Named types (classes, interfaces)
   * - Fully qualified names
   * 
   * @private
   * @returns The parsed single type node
   */
  private parseSingleType(): AST.TypeNode {
    // Array type
    if (this.match(TokenKind.Array)) {
      return {
        type: 'ArrayType',
        elementType: { type: 'SimpleType', name: 'mixed' } as AST.SimpleType,
        location: this.previous().location
      };
    }

    // Callable type
    if (this.match(TokenKind.Callable)) {
      return {
        type: 'CallableType',
        location: this.previous().location
      };
    }

    // Named type
    const name = this.parseNameExpression();

    return {
      type: 'SimpleType',
      name: name.parts.join('\\'),
      location: name.location
    } as AST.SimpleType;
  }

}