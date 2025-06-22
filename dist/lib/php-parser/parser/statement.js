"use strict";
/**
 * 文パーサー
 * 制御構造や基本的な文のパース
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatementParser = void 0;
const token_js_1 = require("../core/token.js");
const location_js_1 = require("../core/location.js");
const expression_js_1 = require("./expression.js");
/**
 * 文パーサー
 */
class StatementParser extends expression_js_1.ExpressionParser {
    /**
     * 文をパース
     */
    parseStatement() {
        // ブロック文
        if (this.check(token_js_1.TokenKind.LeftBrace)) {
            return this.parseBlockStatement();
        }
        // 制御構造
        if (this.match(token_js_1.TokenKind.If)) {
            return this.parseIfStatement();
        }
        if (this.match(token_js_1.TokenKind.While)) {
            return this.parseWhileStatement();
        }
        if (this.match(token_js_1.TokenKind.Do)) {
            return this.parseDoWhileStatement();
        }
        if (this.match(token_js_1.TokenKind.For)) {
            return this.parseForStatement();
        }
        if (this.match(token_js_1.TokenKind.Foreach)) {
            return this.parseForeachStatement();
        }
        if (this.match(token_js_1.TokenKind.Switch)) {
            return this.parseSwitchStatement();
        }
        if (this.match(token_js_1.TokenKind.Break)) {
            return this.parseBreakStatement();
        }
        if (this.match(token_js_1.TokenKind.Continue)) {
            return this.parseContinueStatement();
        }
        if (this.match(token_js_1.TokenKind.Return)) {
            return this.parseReturnStatement();
        }
        if (this.match(token_js_1.TokenKind.Throw)) {
            return this.parseThrowStatement();
        }
        if (this.match(token_js_1.TokenKind.Try)) {
            return this.parseTryStatement();
        }
        // その他の文
        if (this.match(token_js_1.TokenKind.Echo)) {
            return this.parseEchoStatement();
        }
        if (this.match(token_js_1.TokenKind.Global)) {
            return this.parseGlobalStatement();
        }
        if (this.match(token_js_1.TokenKind.Static)) {
            return this.parseStaticStatement();
        }
        if (this.match(token_js_1.TokenKind.Unset)) {
            return this.parseUnsetStatement();
        }
        if (this.match(token_js_1.TokenKind.Goto)) {
            return this.parseGotoStatement();
        }
        if (this.check(token_js_1.TokenKind.Identifier)) {
            // ラベルの可能性をチェック
            const savedPos = this.current;
            const id = this.parseIdentifier();
            if (this.match(token_js_1.TokenKind.Colon)) {
                // ラベル文
                // Label statements are not in the AST, return an expression statement instead
                return {
                    type: 'ExpressionStatement',
                    expression: id,
                    location: (0, location_js_1.mergeLocations)(id.location, this.previous().location)
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
    parseBlockStatement() {
        const start = this.consume(token_js_1.TokenKind.LeftBrace, "Expected '{'").location.start;
        const statements = [];
        while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt)
                statements.push(stmt);
        }
        const end = this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after block").location.end;
        return {
            type: 'BlockStatement',
            statements,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * if文をパース
     */
    parseIfStatement() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'if'");
        const test = this.parseExpression();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after if condition");
        const consequent = this.parseStatement();
        let alternate;
        if (this.match(token_js_1.TokenKind.ElseIf)) {
            // elseif は if 文として扱う
            alternate = this.parseIfStatement();
        }
        else if (this.match(token_js_1.TokenKind.Else)) {
            alternate = this.parseStatement();
        }
        const end = alternate?.location?.end || consequent.location.end;
        return {
            type: 'IfStatement',
            condition: test,
            then: consequent,
            else: alternate,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * while文をパース
     */
    parseWhileStatement() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'while'");
        const test = this.parseExpression();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after while condition");
        const body = this.parseStatement();
        return {
            type: 'WhileStatement',
            condition: test,
            body,
            location: (0, location_js_1.createLocation)(start, body.location.end)
        };
    }
    /**
     * do-while文をパース
     */
    parseDoWhileStatement() {
        const start = this.previous().location.start;
        const body = this.parseStatement();
        this.consume(token_js_1.TokenKind.While, "Expected 'while' after do body");
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'while'");
        const test = this.parseExpression();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after while condition");
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after do-while").location.end;
        return {
            type: 'DoWhileStatement',
            body,
            condition: test,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * for文をパース
     */
    parseForStatement() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'for'");
        // 初期化
        let init;
        if (!this.check(token_js_1.TokenKind.Semicolon)) {
            init = [this.parseExpression()];
        }
        this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after for init");
        // 条件
        let test;
        if (!this.check(token_js_1.TokenKind.Semicolon)) {
            test = this.parseExpression();
        }
        this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after for condition");
        // 更新
        let update;
        if (!this.check(token_js_1.TokenKind.RightParen)) {
            update = [this.parseExpression()];
        }
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after for clauses");
        const body = this.parseStatement();
        return {
            type: 'ForStatement',
            init,
            condition: test,
            update,
            body,
            location: (0, location_js_1.createLocation)(start, body.location.end)
        };
    }
    /**
     * foreach文をパース
     */
    parseForeachStatement() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'foreach'");
        const iterable = this.parseExpression();
        this.consume(token_js_1.TokenKind.As, "Expected 'as' in foreach");
        let key;
        let value;
        let byReference = false;
        // キーの可能性をチェック
        const expr1 = this.parseExpression();
        if (this.match(token_js_1.TokenKind.DoubleArrow)) {
            // key => value
            key = expr1;
            byReference = this.match(token_js_1.TokenKind.Ampersand);
            value = this.parseExpression();
        }
        else {
            // value only
            value = expr1;
            // Check for reference expression
            if (expr1.type === 'ReferenceExpression') {
                byReference = true;
                value = expr1.expression;
            }
        }
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after foreach");
        const body = this.parseStatement();
        return {
            type: 'ForeachStatement',
            iterable,
            key: key,
            value: value,
            body,
            location: (0, location_js_1.createLocation)(start, body.location.end)
        };
    }
    /**
     * switch文をパース
     */
    parseSwitchStatement() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'switch'");
        const discriminant = this.parseExpression();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after switch expression");
        this.consume(token_js_1.TokenKind.LeftBrace, "Expected '{' before switch body");
        const cases = [];
        while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            if (this.match(token_js_1.TokenKind.Case)) {
                const test = this.parseExpression();
                this.consume(token_js_1.TokenKind.Colon, "Expected ':' after case");
                const consequent = [];
                while (!this.check(token_js_1.TokenKind.Case) &&
                    !this.check(token_js_1.TokenKind.Default) &&
                    !this.check(token_js_1.TokenKind.RightBrace) &&
                    !this.isAtEnd()) {
                    const stmt = this.parseStatement();
                    if (stmt)
                        consequent.push(stmt);
                }
                cases.push({
                    type: 'SwitchCase',
                    test,
                    consequent,
                    location: (0, location_js_1.mergeLocations)(test.location, consequent.length > 0 ? consequent[consequent.length - 1].location : test.location)
                });
            }
            else if (this.match(token_js_1.TokenKind.Default)) {
                this.consume(token_js_1.TokenKind.Colon, "Expected ':' after default");
                const consequent = [];
                while (!this.check(token_js_1.TokenKind.Case) &&
                    !this.check(token_js_1.TokenKind.Default) &&
                    !this.check(token_js_1.TokenKind.RightBrace) &&
                    !this.isAtEnd()) {
                    const stmt = this.parseStatement();
                    if (stmt)
                        consequent.push(stmt);
                }
                cases.push({
                    type: 'SwitchCase',
                    test: undefined,
                    consequent,
                    location: (0, location_js_1.createLocation)(this.tokens[this.current - 2].location.start, consequent.length > 0 ? consequent[consequent.length - 1].location.end : this.previous().location.end)
                });
            }
            else {
                throw this.error(this.peek(), "Expected 'case' or 'default' in switch body");
            }
        }
        const end = this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after switch body").location.end;
        return {
            type: 'SwitchStatement',
            discriminant,
            cases,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * break文をパース
     */
    parseBreakStatement() {
        const start = this.previous().location.start;
        let level;
        if (this.check(token_js_1.TokenKind.Number)) {
            const num = this.parseNumberLiteral();
            level = num.value;
        }
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after break").location.end;
        return {
            type: 'BreakStatement',
            level,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * continue文をパース
     */
    parseContinueStatement() {
        const start = this.previous().location.start;
        let level;
        if (this.check(token_js_1.TokenKind.Number)) {
            const num = this.parseNumberLiteral();
            level = num.value;
        }
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after continue").location.end;
        return {
            type: 'ContinueStatement',
            level,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * return文をパース
     */
    parseReturnStatement() {
        const start = this.previous().location.start;
        let argument;
        if (!this.check(token_js_1.TokenKind.Semicolon) && !this.isAtEnd()) {
            argument = this.parseExpression();
        }
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after return").location.end;
        return {
            type: 'ReturnStatement',
            argument,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * throw文をパース
     */
    parseThrowStatement() {
        const start = this.previous().location.start;
        const argument = this.parseExpression();
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after throw").location.end;
        return {
            type: 'ThrowStatement',
            argument,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * try文をパース
     */
    parseTryStatement() {
        const start = this.previous().location.start;
        const block = this.parseBlockStatement();
        const handlers = [];
        let finalizer;
        while (this.match(token_js_1.TokenKind.Catch)) {
            const catchStart = this.previous().location.start;
            this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'catch'");
            // 型のリスト（PHP 7.1+ では複数の例外型を捕捉可能）
            const types = [];
            do {
                types.push(this.parseNameExpression());
            } while (this.match(token_js_1.TokenKind.Pipe));
            // 変数（PHP 8.0+ では省略可能）
            let param;
            if (this.check(token_js_1.TokenKind.Variable)) {
                param = this.parseVariable();
            }
            this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after catch clause");
            const body = this.parseBlockStatement();
            handlers.push({
                type: 'CatchClause',
                types,
                variable: param,
                body,
                location: (0, location_js_1.createLocation)(catchStart, body.location.end)
            });
        }
        if (this.match(token_js_1.TokenKind.Finally)) {
            finalizer = this.parseBlockStatement();
        }
        if (handlers.length === 0 && !finalizer) {
            throw this.error(this.peek(), "Expected 'catch' or 'finally' after 'try'");
        }
        const end = finalizer?.location?.end ||
            handlers[handlers.length - 1]?.location?.end ||
            block.location.end;
        return {
            type: 'TryStatement',
            block,
            handlers,
            finalizer,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * echo文をパース
     */
    parseEchoStatement() {
        const start = this.previous().location.start;
        const expressions = [];
        do {
            expressions.push(this.parseExpression());
        } while (this.match(token_js_1.TokenKind.Comma));
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after echo").location.end;
        return {
            type: 'EchoStatement',
            expressions,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * global文をパース
     */
    parseGlobalStatement() {
        const start = this.previous().location.start;
        const variables = [];
        do {
            variables.push(this.parseVariable());
        } while (this.match(token_js_1.TokenKind.Comma));
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after global").location.end;
        return {
            type: 'GlobalStatement',
            variables,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * static文をパース
     */
    parseStaticStatement() {
        const start = this.previous().location.start;
        const declarations = [];
        do {
            const variable = this.parseVariable();
            let initializer;
            if (this.match(token_js_1.TokenKind.Equal)) {
                initializer = this.parseExpression();
            }
            declarations.push({
                type: 'StaticVariableDeclaration',
                variable,
                initializer,
                location: (0, location_js_1.mergeLocations)(variable.location, initializer?.location || variable.location)
            });
        } while (this.match(token_js_1.TokenKind.Comma));
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after static").location.end;
        return {
            type: 'StaticStatement',
            declarations,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * unset文をパース
     */
    parseUnsetStatement() {
        const start = this.previous().location.start;
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after 'unset'");
        const variables = [];
        do {
            variables.push(this.parseExpression());
        } while (this.match(token_js_1.TokenKind.Comma));
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after unset variables");
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after unset").location.end;
        return {
            type: 'UnsetStatement',
            variables,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * goto文をパース
     */
    parseGotoStatement() {
        const start = this.previous().location.start;
        const label = this.parseIdentifier();
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after goto").location.end;
        return {
            type: 'GotoStatement',
            label,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * 式文をパース
     */
    parseExpressionStatement() {
        const expr = this.parseExpression();
        // セミコロンは省略可能な場合がある
        if (this.check(token_js_1.TokenKind.Semicolon)) {
            this.advance();
        }
        return {
            type: 'ExpressionStatement',
            expression: expr,
            location: expr.location
        };
    }
}
exports.StatementParser = StatementParser;
