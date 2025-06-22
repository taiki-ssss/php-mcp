"use strict";
/**
 * 式パーサー
 * 演算子優先順位に基づく式のパース
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressionParser = void 0;
const token_js_1 = require("../core/token.js");
const location_js_1 = require("../core/location.js");
const base_js_1 = require("./base.js");
/**
 * 式パーサー
 */
class ExpressionParser extends base_js_1.ParserBase {
    /**
     * 式をパース（エントリーポイント）
     */
    parseExpression() {
        return this.parseAssignment();
    }
    /**
     * 代入式をパース
     */
    parseAssignment() {
        let expr = this.parseTernary();
        while (true) {
            if (this.match(token_js_1.TokenKind.Equal)) {
                const operator = '=';
                const right = this.parseAssignment();
                expr = {
                    type: 'AssignmentExpression',
                    left: expr,
                    operator,
                    right,
                    location: (0, location_js_1.mergeLocations)(expr.location, right.location)
                };
            }
            else if (this.match(token_js_1.TokenKind.PlusEqual, token_js_1.TokenKind.MinusEqual, token_js_1.TokenKind.StarEqual, token_js_1.TokenKind.SlashEqual, token_js_1.TokenKind.PercentEqual, token_js_1.TokenKind.DotEqual, token_js_1.TokenKind.AmpersandEqual, token_js_1.TokenKind.PipeEqual, token_js_1.TokenKind.CaretEqual, token_js_1.TokenKind.LessLessEqual, token_js_1.TokenKind.GreaterGreaterEqual, token_js_1.TokenKind.StarStarEqual, token_js_1.TokenKind.QuestionQuestionEqual)) {
                const operator = this.previous().text;
                const right = this.parseAssignment();
                expr = {
                    type: 'AssignmentExpression',
                    left: expr,
                    operator,
                    right,
                    location: (0, location_js_1.mergeLocations)(expr.location, right.location)
                };
            }
            else {
                break;
            }
        }
        return expr;
    }
    /**
     * 三項演算子をパース
     */
    parseTernary() {
        let expr = this.parseCoalesce();
        if (this.match(token_js_1.TokenKind.Question)) {
            const consequent = this.parseExpression();
            this.consume(token_js_1.TokenKind.Colon, "Expected ':' after ternary consequent");
            const alternate = this.parseTernary();
            return {
                type: 'ConditionalExpression',
                test: expr,
                consequent,
                alternate,
                location: (0, location_js_1.mergeLocations)(expr.location, alternate.location)
            };
        }
        return expr;
    }
    /**
     * Null 合体演算子をパース
     */
    parseCoalesce() {
        let expr = this.parseLogicalOr();
        while (this.match(token_js_1.TokenKind.QuestionQuestion)) {
            const right = this.parseLogicalOr();
            expr = {
                type: 'CoalesceExpression',
                left: expr,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * 論理 OR をパース
     */
    parseLogicalOr() {
        let expr = this.parseLogicalAnd();
        while (this.match(token_js_1.TokenKind.PipePipe, token_js_1.TokenKind.Or)) {
            const operator = this.previous().text;
            const right = this.parseLogicalAnd();
            expr = {
                type: 'LogicalExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * 論理 AND をパース
     */
    parseLogicalAnd() {
        let expr = this.parseBitwiseOr();
        while (this.match(token_js_1.TokenKind.AmpersandAmpersand, token_js_1.TokenKind.And)) {
            const operator = this.previous().text;
            const right = this.parseBitwiseOr();
            expr = {
                type: 'LogicalExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * ビット OR をパース
     */
    parseBitwiseOr() {
        let expr = this.parseBitwiseXor();
        while (this.match(token_js_1.TokenKind.Pipe)) {
            const operator = '|';
            const right = this.parseBitwiseXor();
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * ビット XOR をパース
     */
    parseBitwiseXor() {
        let expr = this.parseBitwiseAnd();
        while (this.match(token_js_1.TokenKind.Caret, token_js_1.TokenKind.Xor)) {
            const operator = this.previous().text;
            const right = this.parseBitwiseAnd();
            expr = {
                type: 'LogicalExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * ビット AND をパース
     */
    parseBitwiseAnd() {
        let expr = this.parseEquality();
        while (this.match(token_js_1.TokenKind.Ampersand)) {
            const operator = '&';
            const right = this.parseEquality();
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * 等価演算子をパース
     */
    parseEquality() {
        let expr = this.parseComparison();
        while (this.match(token_js_1.TokenKind.EqualEqual, token_js_1.TokenKind.BangEqual, token_js_1.TokenKind.EqualEqualEqual, token_js_1.TokenKind.BangEqualEqual)) {
            const operator = this.previous().text;
            const right = this.parseComparison();
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * 比較演算子をパース
     */
    parseComparison() {
        let expr = this.parseSpaceship();
        while (this.match(token_js_1.TokenKind.Less, token_js_1.TokenKind.Greater, token_js_1.TokenKind.LessEqual, token_js_1.TokenKind.GreaterEqual, token_js_1.TokenKind.Instanceof)) {
            const operator = this.previous().text;
            const right = this.parseSpaceship();
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * 宇宙船演算子をパース
     */
    parseSpaceship() {
        let expr = this.parseShift();
        while (this.match(token_js_1.TokenKind.Spaceship)) {
            const right = this.parseShift();
            expr = {
                type: 'SpaceshipExpression',
                left: expr,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * ビットシフトをパース
     */
    parseShift() {
        let expr = this.parseAdditive();
        while (this.match(token_js_1.TokenKind.LessLess, token_js_1.TokenKind.GreaterGreater)) {
            const operator = this.previous().text;
            const right = this.parseAdditive();
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * 加算・減算・文字列連結をパース
     */
    parseAdditive() {
        let expr = this.parseMultiplicative();
        while (this.match(token_js_1.TokenKind.Plus, token_js_1.TokenKind.Minus, token_js_1.TokenKind.Dot)) {
            const operator = this.previous().text;
            const right = this.parseMultiplicative();
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * 乗算・除算・剰余をパース
     */
    parseMultiplicative() {
        let expr = this.parseExponentiation();
        while (this.match(token_js_1.TokenKind.Star, token_js_1.TokenKind.Slash, token_js_1.TokenKind.Percent)) {
            const operator = this.previous().text;
            const right = this.parseExponentiation();
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * べき乗をパース
     */
    parseExponentiation() {
        let expr = this.parseUnary();
        if (this.match(token_js_1.TokenKind.StarStar)) {
            const operator = '**';
            // 右結合
            const right = this.parseExponentiation();
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator,
                right,
                location: (0, location_js_1.mergeLocations)(expr.location, right.location)
            };
        }
        return expr;
    }
    /**
     * 単項演算子をパース
     */
    parseUnary() {
        if (this.match(token_js_1.TokenKind.Bang, token_js_1.TokenKind.Plus, token_js_1.TokenKind.Minus, token_js_1.TokenKind.Tilde, token_js_1.TokenKind.At, token_js_1.TokenKind.PlusPlus, token_js_1.TokenKind.MinusMinus)) {
            const operator = this.previous().text;
            const start = this.previous().location.start;
            const argument = this.parseUnary();
            return {
                type: 'UnaryExpression',
                operator,
                argument,
                prefix: true,
                location: (0, location_js_1.createLocation)(start, argument.location.end)
            };
        }
        // Cast expressions
        if (this.check(token_js_1.TokenKind.LeftParen)) {
            const savedPos = this.current;
            this.advance();
            // Check for cast
            if (this.match(token_js_1.TokenKind.Array, token_js_1.TokenKind.Callable, token_js_1.TokenKind.Identifier // int, float, string, bool, object
            )) {
                const castType = this.previous().text.toLowerCase();
                if (['int', 'integer', 'float', 'double', 'string', 'bool', 'boolean', 'array', 'object'].includes(castType)) {
                    this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after cast type");
                    const expr = this.parseUnary();
                    return {
                        type: 'CastExpression',
                        kind: castType,
                        argument: expr,
                        location: (0, location_js_1.mergeLocations)(this.tokens[savedPos].location, expr.location)
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
    parsePostfix() {
        let expr = this.parsePrimary();
        while (true) {
            if (this.match(token_js_1.TokenKind.PlusPlus, token_js_1.TokenKind.MinusMinus)) {
                const operator = this.previous().text;
                expr = {
                    type: 'UnaryExpression',
                    operator,
                    argument: expr,
                    prefix: false,
                    location: (0, location_js_1.mergeLocations)(expr.location, this.previous().location)
                };
            }
            else if (this.match(token_js_1.TokenKind.LeftBracket)) {
                // Array access
                const index = this.parseExpression();
                const end = this.consume(token_js_1.TokenKind.RightBracket, "Expected ']' after array index").location.end;
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property: index,
                    computed: true,
                    location: (0, location_js_1.createLocation)(expr.location.start, end)
                };
            }
            else if (this.match(token_js_1.TokenKind.Arrow, token_js_1.TokenKind.QuestionArrow)) {
                // Property access
                const nullsafe = this.previous().kind === token_js_1.TokenKind.QuestionArrow;
                const property = this.parseIdentifier();
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property,
                    computed: false,
                    nullsafe,
                    location: (0, location_js_1.mergeLocations)(expr.location, property.location)
                };
            }
            else if (this.match(token_js_1.TokenKind.DoubleColon)) {
                // Static access
                const property = this.match(token_js_1.TokenKind.Variable)
                    ? this.parseVariable()
                    : this.parseIdentifier();
                // PHP uses :: for static member access, but we model it as MemberExpression
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property,
                    computed: false,
                    location: (0, location_js_1.mergeLocations)(expr.location, property.location)
                };
            }
            else if (this.match(token_js_1.TokenKind.LeftParen)) {
                // Function call
                const args = this.parseArgumentList();
                const end = this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after arguments").location.end;
                expr = {
                    type: 'CallExpression',
                    callee: expr,
                    arguments: args,
                    location: (0, location_js_1.createLocation)(expr.location.start, end)
                };
            }
            else {
                break;
            }
        }
        return expr;
    }
    /**
     * プライマリ式をパース
     */
    parsePrimary() {
        // Literals
        if (this.match(token_js_1.TokenKind.Number)) {
            return this.parseNumberLiteral();
        }
        if (this.match(token_js_1.TokenKind.String, token_js_1.TokenKind.StringStart)) {
            return this.parseStringLiteral();
        }
        if (this.match(token_js_1.TokenKind.True, token_js_1.TokenKind.False)) {
            return this.parseBooleanLiteral();
        }
        if (this.match(token_js_1.TokenKind.Null)) {
            return this.parseNullLiteral();
        }
        // Variables
        if (this.match(token_js_1.TokenKind.Variable)) {
            return this.parseVariable();
        }
        // Arrays
        if (this.match(token_js_1.TokenKind.LeftBracket)) {
            return this.parseArrayExpression();
        }
        if (this.match(token_js_1.TokenKind.Array)) {
            this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'array'");
            const elements = this.parseArrayElements();
            this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after array elements");
            return {
                type: 'ArrayExpression',
                elements,
                location: (0, location_js_1.mergeLocations)(this.tokens[this.current - 3].location, this.previous().location)
            };
        }
        // Function expressions
        if (this.match(token_js_1.TokenKind.Function)) {
            return this.parseFunctionExpression();
        }
        if (this.match(token_js_1.TokenKind.Fn)) {
            return this.parseArrowFunction();
        }
        // New expression
        if (this.match(token_js_1.TokenKind.New)) {
            return this.parseNewExpression();
        }
        // Clone
        if (this.match(token_js_1.TokenKind.Clone)) {
            const start = this.previous().location.start;
            const expr = this.parsePostfix();
            return {
                type: 'CloneExpression',
                argument: expr,
                location: (0, location_js_1.createLocation)(start, expr.location.end)
            };
        }
        // Yield
        if (this.match(token_js_1.TokenKind.Yield)) {
            return this.parseYieldExpression();
        }
        // Parentheses
        if (this.match(token_js_1.TokenKind.LeftParen)) {
            const expr = this.parseExpression();
            this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after expression");
            return expr;
        }
        // Match expression (PHP 8.0+)
        if (this.match(token_js_1.TokenKind.Match)) {
            return this.parseMatchExpression();
        }
        // Special expressions
        if (this.match(token_js_1.TokenKind.Include, token_js_1.TokenKind.IncludeOnce)) {
            return this.parseIncludeExpression();
        }
        if (this.match(token_js_1.TokenKind.Require, token_js_1.TokenKind.RequireOnce)) {
            return this.parseRequireExpression();
        }
        if (this.match(token_js_1.TokenKind.Isset)) {
            return this.parseIssetExpression();
        }
        if (this.match(token_js_1.TokenKind.Empty)) {
            return this.parseEmptyExpression();
        }
        if (this.match(token_js_1.TokenKind.Eval)) {
            return this.parseEvalExpression();
        }
        if (this.match(token_js_1.TokenKind.Exit)) {
            return this.parseExitExpression();
        }
        if (this.match(token_js_1.TokenKind.Print)) {
            return this.parsePrintExpression();
        }
        if (this.match(token_js_1.TokenKind.List)) {
            return this.parseListExpression();
        }
        // Names (class names, function names, constants)
        if (this.check(token_js_1.TokenKind.Identifier) || this.check(token_js_1.TokenKind.Backslash)) {
            return this.parseNameExpression();
        }
        throw this.error(this.peek(), "Expected expression");
    }
    // リテラルパーサー
    parseNumberLiteral() {
        const token = this.previous();
        return {
            type: 'NumberLiteral',
            value: parseFloat(token.text),
            raw: token.text,
            location: token.location
        };
    }
    parseStringLiteral() {
        const token = this.previous();
        // 補間文字列の場合
        if (token.kind === token_js_1.TokenKind.StringStart) {
            const parts = [];
            const start = token.location.start;
            // 開始部分 - 文字列として追加
            parts.push(token.text);
            while (!this.check(token_js_1.TokenKind.StringEnd)) {
                if (this.match(token_js_1.TokenKind.StringMiddle)) {
                    parts.push(this.previous().text);
                }
                else {
                    parts.push(this.parseExpression());
                }
            }
            const endToken = this.consume(token_js_1.TokenKind.StringEnd, "Expected string end");
            parts.push(endToken.text);
            return {
                type: 'TemplateStringExpression',
                parts,
                location: (0, location_js_1.createLocation)(start, endToken.location.end)
            };
        }
        return {
            type: 'StringLiteral',
            value: token.text,
            raw: token.text,
            location: token.location
        };
    }
    parseBooleanLiteral() {
        const token = this.previous();
        return {
            type: 'BooleanLiteral',
            value: token.kind === token_js_1.TokenKind.True,
            location: token.location
        };
    }
    parseNullLiteral() {
        return {
            type: 'NullLiteral',
            location: this.previous().location
        };
    }
    // 配列関連
    parseArrayExpression() {
        const start = this.previous().location.start;
        const elements = this.parseArrayElements();
        const end = this.consume(token_js_1.TokenKind.RightBracket, "Expected ']' after array elements").location.end;
        return {
            type: 'ArrayExpression',
            elements,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    parseArrayElements() {
        const elements = [];
        while (!this.check(token_js_1.TokenKind.RightBracket) && !this.check(token_js_1.TokenKind.RightParen) && !this.isAtEnd()) {
            if (this.match(token_js_1.TokenKind.Comma)) {
                // Empty element
                continue;
            }
            elements.push(this.parseArrayElement());
            if (!this.check(token_js_1.TokenKind.RightBracket) && !this.check(token_js_1.TokenKind.RightParen)) {
                this.consume(token_js_1.TokenKind.Comma, "Expected ',' after array element");
            }
        }
        return elements;
    }
    parseArrayElement() {
        const byReference = this.match(token_js_1.TokenKind.Ampersand);
        const unpack = this.match(token_js_1.TokenKind.Ellipsis);
        let value = this.parseExpression();
        let key;
        if (this.match(token_js_1.TokenKind.DoubleArrow)) {
            key = value;
            value = this.parseExpression();
        }
        return {
            type: 'ArrayElement',
            key,
            value,
            spread: unpack,
            location: key ? (0, location_js_1.mergeLocations)(key.location, value.location) : value.location
        };
    }
    // 関数関連
    parseFunctionExpression() {
        const start = this.previous().location.start;
        const byReference = this.match(token_js_1.TokenKind.Ampersand);
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'function'");
        const parameters = this.parseParameterList();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after parameters");
        // Use declarations
        let useVariables;
        if (this.match(token_js_1.TokenKind.Use)) {
            this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'use'");
            useVariables = [];
            do {
                if (this.match(token_js_1.TokenKind.Ampersand)) {
                    // By reference
                }
                useVariables.push(this.parseVariable());
            } while (this.match(token_js_1.TokenKind.Comma));
            this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after use variables");
        }
        const returnType = this.match(token_js_1.TokenKind.Colon) ? this.parseType() : undefined;
        const body = this.parseBlockStatement();
        return {
            type: 'FunctionExpression',
            parameters,
            body,
            byReference,
            returnType,
            uses: useVariables ? useVariables.map(v => ({
                type: 'ClosureUse',
                variable: v,
                byReference: false,
                location: v.location
            })) : undefined,
            location: (0, location_js_1.createLocation)(start, body.location.end)
        };
    }
    parseArrowFunction() {
        const start = this.previous().location.start;
        const byReference = this.match(token_js_1.TokenKind.Ampersand);
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'fn'");
        const parameters = this.parseParameterList();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after parameters");
        const returnType = this.match(token_js_1.TokenKind.Colon) ? this.parseType() : undefined;
        this.consume(token_js_1.TokenKind.DoubleArrow, "Expected '=>' in arrow function");
        const body = this.parseExpression();
        return {
            type: 'ArrowFunctionExpression',
            parameters,
            body,
            byReference,
            returnType,
            location: (0, location_js_1.createLocation)(start, body.location.end)
        };
    }
    parseArgumentList() {
        const args = [];
        while (!this.check(token_js_1.TokenKind.RightParen) && !this.isAtEnd()) {
            args.push(this.parseArgument());
            if (!this.check(token_js_1.TokenKind.RightParen)) {
                this.consume(token_js_1.TokenKind.Comma, "Expected ',' after argument");
            }
        }
        return args;
    }
    parseArgument() {
        // Named argument (PHP 8.0+)
        if (this.check(token_js_1.TokenKind.Identifier)) {
            const savedPos = this.current;
            const id = this.parseIdentifier();
            if (this.match(token_js_1.TokenKind.Colon)) {
                const value = this.parseExpression();
                return {
                    type: 'Argument',
                    name: id,
                    value,
                    spread: false,
                    location: (0, location_js_1.mergeLocations)(id.location, value.location)
                };
            }
            // Not a named argument, restore
            this.current = savedPos;
        }
        const unpack = this.match(token_js_1.TokenKind.Ellipsis);
        const value = this.parseExpression();
        return {
            type: 'Argument',
            value,
            spread: unpack,
            location: value.location
        };
    }
    // その他の式
    parseNewExpression() {
        const start = this.previous().location.start;
        const className = this.parsePrimary();
        let args;
        if (this.match(token_js_1.TokenKind.LeftParen)) {
            args = this.parseArgumentList();
            this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after arguments");
        }
        const end = args ? this.previous().location.end : className.location.end;
        return {
            type: 'NewExpression',
            callee: className,
            arguments: args,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    parseMatchExpression() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'match'");
        const discriminant = this.parseExpression();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after match subject");
        this.consume(token_js_1.TokenKind.LeftBrace, "Expected '{' before match body");
        const arms = [];
        while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            const conditions = [];
            if (this.match(token_js_1.TokenKind.Default)) {
                // Default arm
            }
            else {
                // Condition(s)
                do {
                    conditions.push(this.parseExpression());
                } while (this.match(token_js_1.TokenKind.Comma) && !this.check(token_js_1.TokenKind.DoubleArrow));
            }
            this.consume(token_js_1.TokenKind.DoubleArrow, "Expected '=>' in match arm");
            const body = this.parseExpression();
            arms.push({
                type: 'MatchArm',
                conditions: conditions.length > 0 ? conditions : null,
                body,
                location: conditions.length > 0
                    ? (0, location_js_1.mergeLocations)(conditions[0].location, body.location)
                    : body.location
            });
            // Optional trailing comma
            this.match(token_js_1.TokenKind.Comma);
        }
        const end = this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after match arms").location.end;
        return {
            type: 'MatchExpression',
            discriminant,
            arms,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    parseYieldExpression() {
        const start = this.previous().location.start;
        let key;
        let value;
        // yield can be used without a value
        if (!this.check(token_js_1.TokenKind.Semicolon) && !this.check(token_js_1.TokenKind.RightParen) &&
            !this.check(token_js_1.TokenKind.Comma) && !this.isAtEnd()) {
            // Check for yield from
            if (this.peek().kind === token_js_1.TokenKind.Identifier && this.peek().text.toLowerCase() === 'from') {
                this.advance(); // consume 'from'
                // yield from is handled as a regular yield with the from expression as value
                value = this.parseExpression();
            }
            else {
                // Parse first expression
                const expr = this.parseExpression();
                // Check for key => value
                if (this.match(token_js_1.TokenKind.DoubleArrow)) {
                    key = expr;
                    value = this.parseExpression();
                }
                else {
                    value = expr;
                }
            }
        }
        const end = value?.location?.end || start;
        return {
            type: 'YieldExpression',
            key,
            value,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    // 特殊な式
    parseIncludeExpression() {
        const kind = this.previous().text;
        const start = this.previous().location.start;
        const path = this.parseExpression();
        return {
            type: 'IncludeExpression',
            kind,
            argument: path,
            location: (0, location_js_1.createLocation)(start, path.location.end)
        };
    }
    parseRequireExpression() {
        const kind = this.previous().text;
        const start = this.previous().location.start;
        const path = this.parseExpression();
        return {
            type: 'RequireExpression',
            kind,
            argument: path,
            location: (0, location_js_1.createLocation)(start, path.location.end)
        };
    }
    parseIssetExpression() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'isset'");
        const variables = [];
        do {
            variables.push(this.parseExpression());
        } while (this.match(token_js_1.TokenKind.Comma));
        const end = this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after isset variables").location.end;
        return {
            type: 'IssetExpression',
            arguments: variables,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    parseEmptyExpression() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'empty'");
        const expression = this.parseExpression();
        const end = this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after empty expression").location.end;
        return {
            type: 'EmptyExpression',
            argument: expression,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    parseEvalExpression() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'eval'");
        const code = this.parseExpression();
        const end = this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after eval code").location.end;
        return {
            type: 'EvalExpression',
            argument: code,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    parseExitExpression() {
        const start = this.previous().location.start;
        let status;
        if (this.match(token_js_1.TokenKind.LeftParen)) {
            if (!this.check(token_js_1.TokenKind.RightParen)) {
                status = this.parseExpression();
            }
            this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after exit status");
        }
        const end = status?.location?.end || start;
        return {
            type: 'ExitExpression',
            argument: status,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    parsePrintExpression() {
        const start = this.previous().location.start;
        const expression = this.parseExpression();
        return {
            type: 'PrintExpression',
            argument: expression,
            location: (0, location_js_1.createLocation)(start, expression.location.end)
        };
    }
    parseListExpression() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'list'");
        const elements = [];
        while (!this.check(token_js_1.TokenKind.RightParen) && !this.isAtEnd()) {
            if (this.match(token_js_1.TokenKind.Comma)) {
                elements.push(null);
            }
            else {
                elements.push(this.parseExpression());
                if (!this.check(token_js_1.TokenKind.RightParen)) {
                    this.consume(token_js_1.TokenKind.Comma, "Expected ',' after list element");
                }
            }
        }
        const end = this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after list elements").location.end;
        return {
            type: 'ListExpression',
            elements: elements,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    // ヘルパーメソッド（base.tsから必要なものを継承）
    parseParameterList() {
        // declarationに移動予定
        return [];
    }
    parseType() {
        // declarationに移動予定
        return { type: 'SimpleType', name: 'mixed' };
    }
    parseBlockStatement() {
        // statementに移動予定
        return { type: 'BlockStatement', statements: [], location: this.peek().location };
    }
}
exports.ExpressionParser = ExpressionParser;
