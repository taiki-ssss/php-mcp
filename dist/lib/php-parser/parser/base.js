"use strict";
/**
 * パーサー基底クラス
 * トークン管理とエラーハンドリング
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserBase = exports.ParseError = void 0;
const token_js_1 = require("../core/token.js");
const location_js_1 = require("../core/location.js");
/**
 * パーサーエラー
 */
class ParseError extends Error {
    location;
    token;
    constructor(message, location, token) {
        super(message);
        this.location = location;
        this.token = token;
        this.name = 'ParseError';
    }
}
exports.ParseError = ParseError;
/**
 * パーサー基底クラス
 */
class ParserBase {
    tokens;
    current = 0;
    options;
    constructor(tokens, options = {}) {
        this.tokens = tokens;
        this.options = {
            phpVersion: options.phpVersion ?? '8.0',
            errorRecovery: options.errorRecovery ?? true,
            strict: options.strict ?? false
        };
    }
    /**
     * 現在のトークンを取得
     */
    peek() {
        return this.tokens[this.current];
    }
    /**
     * 前のトークンを取得
     */
    previous() {
        return this.tokens[this.current - 1];
    }
    /**
     * 終端に達しているか
     */
    isAtEnd() {
        return this.peek().kind === token_js_1.TokenKind.EOF;
    }
    /**
     * トークンを進める
     */
    advance() {
        if (!this.isAtEnd())
            this.current++;
        return this.previous();
    }
    /**
     * トークンタイプをチェック
     */
    check(kind) {
        if (this.isAtEnd())
            return false;
        return this.peek().kind === kind;
    }
    /**
     * トークンがマッチしたら進める
     */
    match(...kinds) {
        for (const kind of kinds) {
            if (this.check(kind)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    /**
     * トークンを消費（エラーチェック付き）
     */
    consume(kind, message) {
        if (this.check(kind))
            return this.advance();
        throw this.error(this.peek(), message);
    }
    /**
     * エラーを生成
     */
    error(token, message) {
        return new ParseError(message, token.location, token);
    }
    /**
     * 同期ポイントまでスキップ（エラーリカバリー）
     */
    synchronize() {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().kind === token_js_1.TokenKind.Semicolon)
                return;
            switch (this.peek().kind) {
                case token_js_1.TokenKind.Class:
                case token_js_1.TokenKind.Function:
                case token_js_1.TokenKind.Var:
                case token_js_1.TokenKind.For:
                case token_js_1.TokenKind.If:
                case token_js_1.TokenKind.While:
                case token_js_1.TokenKind.Print:
                case token_js_1.TokenKind.Return:
                    return;
            }
            this.advance();
        }
    }
    /**
     * 識別子をパース
     */
    parseIdentifier() {
        const token = this.consume(token_js_1.TokenKind.Identifier, "Expected identifier");
        return {
            type: 'Identifier',
            name: token.text,
            location: token.location
        };
    }
    /**
     * 変数をパース
     */
    parseVariable() {
        const token = this.consume(token_js_1.TokenKind.Variable, "Expected variable");
        return {
            type: 'VariableExpression',
            name: token.text.substring(1), // Remove $
            location: token.location
        };
    }
    /**
     * 名前式をパース
     */
    parseNameExpression() {
        const start = this.peek().location.start;
        const parts = [];
        // 絶対パス
        const isAbsolute = this.match(token_js_1.TokenKind.Backslash);
        do {
            parts.push(this.parseIdentifier());
        } while (this.match(token_js_1.TokenKind.Backslash));
        const end = parts[parts.length - 1].location.end;
        return {
            type: 'NameExpression',
            parts: parts.map(p => p.name),
            qualified: isAbsolute ? 'fully' : (parts.length > 1 ? 'qualified' : 'unqualified'),
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
}
exports.ParserBase = ParserBase;
