"use strict";
/**
 * PHP トークナイザー
 * Scanner を使用して PHP コードをトークン列に変換
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tokenizer = void 0;
exports.tokenize = tokenize;
const token_js_1 = require("../core/token.js");
const location_js_1 = require("../core/location.js");
const scanner_js_1 = require("./scanner.js");
/**
 * PHP コードをトークン化
 */
class Tokenizer {
    scanner;
    options;
    inPhpTag = false;
    constructor(source, options = {}) {
        this.scanner = new scanner_js_1.Scanner(source);
        this.options = {
            preserveComments: options.preserveComments ?? true,
            preserveWhitespace: options.preserveWhitespace ?? false,
            preserveInlineHTML: options.preserveInlineHTML ?? true
        };
    }
    /**
     * 全てのトークンを取得
     */
    tokenize() {
        const tokens = [];
        while (!this.scanner.isAtEnd()) {
            const token = this.nextToken();
            // フィルタリング
            if (!this.shouldKeepToken(token)) {
                continue;
            }
            tokens.push(token);
        }
        // EOF トークンを追加
        const eofPos = this.scanner.getCurrentPosition();
        tokens.push((0, token_js_1.createToken)(token_js_1.TokenKind.EOF, '', (0, location_js_1.createLocation)(eofPos, eofPos)));
        return tokens;
    }
    /**
     * トークンを保持すべきか判定
     */
    shouldKeepToken(token) {
        switch (token.kind) {
            case token_js_1.TokenKind.Comment:
            case token_js_1.TokenKind.DocComment:
                return this.options.preserveComments;
            case token_js_1.TokenKind.Whitespace:
            case token_js_1.TokenKind.Newline:
                return this.options.preserveWhitespace;
            case token_js_1.TokenKind.InlineHTML:
                return this.options.preserveInlineHTML;
            default:
                return true;
        }
    }
    /**
     * 次のトークンを取得
     */
    nextToken() {
        const start = this.scanner.getCurrentPosition();
        // PHP タグ外の処理
        if (!this.inPhpTag) {
            return this.scanOutsidePhp(start);
        }
        // 空白スキップ
        const whitespace = this.scanner.consumeWhile((char) => scanner_js_1.CharUtils.isWhitespace(char) && !scanner_js_1.CharUtils.isNewline(char));
        if (whitespace) {
            return this.makeToken(token_js_1.TokenKind.Whitespace, whitespace, start);
        }
        // 改行
        if (scanner_js_1.CharUtils.isNewline(this.scanner.peek())) {
            const newline = this.scanner.advance();
            // Windows CRLF 対応
            if (newline === '\r' && this.scanner.peek() === '\n') {
                this.scanner.advance();
                return this.makeToken(token_js_1.TokenKind.Newline, '\r\n', start);
            }
            return this.makeToken(token_js_1.TokenKind.Newline, newline, start);
        }
        const char = this.scanner.peek();
        // コメント
        if (char === '/') {
            const next = this.scanner.peek(1);
            if (next === '/') {
                return this.scanSingleLineComment(start);
            }
            else if (next === '*') {
                return this.scanMultiLineComment(start);
            }
        }
        // # コメント
        if (char === '#') {
            return this.scanHashComment(start);
        }
        // 文字列
        if (char === '"' || char === "'") {
            return this.scanString(start);
        }
        // バックティック（シェル実行）
        if (char === '`') {
            return this.scanBacktickString(start);
        }
        // Heredoc/Nowdoc
        if (char === '<' && this.scanner.peek(1) === '<' && this.scanner.peek(2) === '<') {
            return this.scanHeredoc(start);
        }
        // 数値
        if (scanner_js_1.CharUtils.isDigit(char)) {
            return this.scanNumber(start);
        }
        // 変数
        if (char === '$') {
            return this.scanVariable(start);
        }
        // 識別子・キーワード
        if (scanner_js_1.CharUtils.isIdentifierStart(char)) {
            return this.scanIdentifierOrKeyword(start);
        }
        // 演算子・記号
        return this.scanOperatorOrPunctuation(start);
    }
    /**
     * PHP タグ外のスキャン
     */
    scanOutsidePhp(start) {
        // <?php タグをチェック
        if (this.scanner.matches('<?php')) {
            this.scanner.skip(5);
            this.inPhpTag = true;
            return this.makeToken(token_js_1.TokenKind.OpenTag, '<?php', start);
        }
        // <?= タグをチェック
        if (this.scanner.matches('<?=')) {
            this.scanner.skip(3);
            this.inPhpTag = true;
            return this.makeToken(token_js_1.TokenKind.OpenTagEcho, '<?=', start);
        }
        // <? タグをチェック（short_open_tag）
        if (this.scanner.matches('<?') && !this.scanner.matches('<?xml')) {
            this.scanner.skip(2);
            this.inPhpTag = true;
            return this.makeToken(token_js_1.TokenKind.OpenTag, '<?', start);
        }
        // インライン HTML
        const html = this.scanner.consumeUntil(char => this.scanner.matches('<?php') ||
            this.scanner.matches('<?=') ||
            (this.scanner.matches('<?') && !this.scanner.matches('<?xml')));
        return this.makeToken(token_js_1.TokenKind.InlineHTML, html || this.scanner.advance(), start);
    }
    /**
     * 単一行コメント
     */
    scanSingleLineComment(start) {
        this.scanner.skip(2); // //
        const content = this.scanner.consumeUntil(char => scanner_js_1.CharUtils.isNewline(char));
        return this.makeToken(token_js_1.TokenKind.Comment, '//' + content, start);
    }
    /**
     * 複数行コメント
     */
    scanMultiLineComment(start) {
        this.scanner.skip(2); // /*
        let content = '/*';
        let isDocComment = this.scanner.peek() === '*' && this.scanner.peek(1) !== '/';
        while (!this.scanner.isAtEnd()) {
            if (this.scanner.matches('*/')) {
                content += '*/';
                this.scanner.skip(2);
                break;
            }
            content += this.scanner.advance();
        }
        return this.makeToken(isDocComment ? token_js_1.TokenKind.DocComment : token_js_1.TokenKind.Comment, content, start);
    }
    /**
     * # コメント
     */
    scanHashComment(start) {
        this.scanner.advance(); // #
        const content = this.scanner.consumeUntil(char => scanner_js_1.CharUtils.isNewline(char));
        return this.makeToken(token_js_1.TokenKind.Comment, '#' + content, start);
    }
    /**
     * 文字列リテラル
     */
    scanString(start) {
        const quote = this.scanner.advance();
        let value = '';
        let raw = quote;
        while (!this.scanner.isAtEnd() && this.scanner.peek() !== quote) {
            if (this.scanner.peek() === '\\') {
                raw += this.scanner.advance();
                raw += this.scanner.advance();
                // エスケープシーケンスの処理は後で
            }
            else {
                const char = this.scanner.advance();
                value += char;
                raw += char;
            }
        }
        if (this.scanner.peek() === quote) {
            raw += this.scanner.advance();
        }
        return (0, token_js_1.createToken)(token_js_1.TokenKind.String, raw, (0, location_js_1.createLocation)(start, this.scanner.getCurrentPosition()), { value, quote: quote });
    }
    /**
     * バックティック文字列（シェル実行）
     */
    scanBacktickString(start) {
        return this.scanString(start);
    }
    /**
     * Heredoc/Nowdoc
     */
    scanHeredoc(start) {
        this.scanner.skip(3); // <<<
        this.scanner.consumeWhile(char => scanner_js_1.CharUtils.isWhitespace(char));
        const isNowdoc = this.scanner.peek() === "'";
        if (isNowdoc)
            this.scanner.advance();
        const label = this.scanner.consumeWhile(char => scanner_js_1.CharUtils.isIdentifierPart(char));
        if (isNowdoc)
            this.scanner.consume("'");
        // 改行まで読み飛ばす
        this.scanner.consumeUntil(char => scanner_js_1.CharUtils.isNewline(char));
        this.scanner.advance();
        // 終了ラベルまで読む
        let content = '';
        let lineStart = true;
        while (!this.scanner.isAtEnd()) {
            // 行頭でのみ終了ラベルをチェック
            if (lineStart && this.scanner.matches(label)) {
                // 行頭の終了ラベルをチェック
                const savedState = this.scanner.save();
                this.scanner.skip(label.length);
                // ラベルの後は改行か ; のみ許可
                const next = this.scanner.peek();
                if (scanner_js_1.CharUtils.isNewline(next) || next === ';') {
                    this.scanner.restore(savedState);
                    this.scanner.skip(label.length);
                    if (next === ';')
                        this.scanner.advance();
                    break;
                }
                this.scanner.restore(savedState);
            }
            const char = this.scanner.advance();
            content += char;
            // 改行後は行頭
            lineStart = scanner_js_1.CharUtils.isNewline(char);
        }
        return (0, token_js_1.createToken)(token_js_1.TokenKind.String, content, (0, location_js_1.createLocation)(start, this.scanner.getCurrentPosition()), { value: content, quote: isNowdoc ? "'" : '"' });
    }
    /**
     * 数値リテラル
     */
    scanNumber(start) {
        let text = '';
        // 0x, 0b, 0o プレフィックスチェック
        if (this.scanner.peek() === '0') {
            const next = this.scanner.peek(1);
            if (next === 'x' || next === 'X') {
                // 16進数
                text = this.scanner.advance() + this.scanner.advance();
                text += this.scanDigits(char => scanner_js_1.CharUtils.isHexDigit(char) || char === '_');
            }
            else if (next === 'b' || next === 'B') {
                // 2進数
                text = this.scanner.advance() + this.scanner.advance();
                text += this.scanDigits(char => scanner_js_1.CharUtils.isBinaryDigit(char) || char === '_');
            }
            else if (next === 'o' || next === 'O') {
                // 8進数（明示的）
                text = this.scanner.advance() + this.scanner.advance();
                text += this.scanDigits(char => scanner_js_1.CharUtils.isOctalDigit(char) || char === '_');
            }
            else if (scanner_js_1.CharUtils.isOctalDigit(next)) {
                // 8進数（暗黙的）
                text = this.scanner.advance();
                text += this.scanDigits(char => scanner_js_1.CharUtils.isOctalDigit(char) || char === '_');
            }
            else {
                // 通常の10進数
                text = this.scanDecimalNumber();
            }
        }
        else {
            text = this.scanDecimalNumber();
        }
        // アンダースコアを除去して数値に変換
        const cleanText = text.replace(/_/g, '');
        const value = Number(cleanText);
        return (0, token_js_1.createToken)(token_js_1.TokenKind.Number, text, (0, location_js_1.createLocation)(start, this.scanner.getCurrentPosition()), { value });
    }
    /**
     * 10進数のスキャン
     */
    scanDecimalNumber() {
        let text = this.scanDigits(char => scanner_js_1.CharUtils.isDigit(char) || char === '_');
        // 小数部
        if (this.scanner.peek() === '.' && scanner_js_1.CharUtils.isDigit(this.scanner.peek(1))) {
            text += this.scanner.advance();
            text += this.scanDigits(char => scanner_js_1.CharUtils.isDigit(char) || char === '_');
        }
        // 指数部
        const exp = this.scanner.peek();
        if (exp === 'e' || exp === 'E') {
            const sign = this.scanner.peek(1);
            if (sign === '+' || sign === '-' || scanner_js_1.CharUtils.isDigit(sign)) {
                text += this.scanner.advance();
                if (sign === '+' || sign === '-') {
                    text += this.scanner.advance();
                }
                text += this.scanDigits(char => scanner_js_1.CharUtils.isDigit(char) || char === '_');
            }
        }
        return text;
    }
    /**
     * 数字列のスキャン
     */
    scanDigits(predicate) {
        return this.scanner.consumeWhile(predicate);
    }
    /**
     * 変数
     */
    scanVariable(start) {
        let text = this.scanner.advance(); // $
        // ${expr} 形式
        if (this.scanner.peek() === '{') {
            // パーサーで処理
            return this.makeToken(token_js_1.TokenKind.Dollar, text, start);
        }
        // 通常の変数名
        text += this.scanner.consumeWhile(char => scanner_js_1.CharUtils.isIdentifierPart(char));
        return (0, token_js_1.createToken)(token_js_1.TokenKind.Variable, text, (0, location_js_1.createLocation)(start, this.scanner.getCurrentPosition()), { name: text.slice(1) });
    }
    /**
     * 識別子またはキーワード
     */
    scanIdentifierOrKeyword(start) {
        const text = this.scanner.consumeWhile(char => scanner_js_1.CharUtils.isIdentifierPart(char));
        // キーワードチェック
        const keywordKind = token_js_1.KEYWORDS.get(text.toLowerCase());
        if (keywordKind) {
            return this.makeToken(keywordKind, text, start);
        }
        // 識別子
        return (0, token_js_1.createToken)(token_js_1.TokenKind.Identifier, text, (0, location_js_1.createLocation)(start, this.scanner.getCurrentPosition()), { name: text });
    }
    /**
     * 演算子・記号
     */
    scanOperatorOrPunctuation(start) {
        const char = this.scanner.peek();
        const next = this.scanner.peek(1);
        const next2 = this.scanner.peek(2);
        // 3文字演算子
        const three = char + next + next2;
        switch (three) {
            case '===':
                this.scanner.skip(3);
                return this.makeToken(token_js_1.TokenKind.EqualEqualEqual, three, start);
            case '!==':
                this.scanner.skip(3);
                return this.makeToken(token_js_1.TokenKind.BangEqualEqual, three, start);
            case '<<=':
                this.scanner.skip(3);
                return this.makeToken(token_js_1.TokenKind.LessLessEqual, three, start);
            case '>>=':
                this.scanner.skip(3);
                return this.makeToken(token_js_1.TokenKind.GreaterGreaterEqual, three, start);
            case '**=':
                this.scanner.skip(3);
                return this.makeToken(token_js_1.TokenKind.StarStarEqual, three, start);
            case '<=>':
                this.scanner.skip(3);
                return this.makeToken(token_js_1.TokenKind.Spaceship, three, start);
            case '??=':
                this.scanner.skip(3);
                return this.makeToken(token_js_1.TokenKind.QuestionQuestionEqual, three, start);
            case '...':
                this.scanner.skip(3);
                return this.makeToken(token_js_1.TokenKind.Ellipsis, three, start);
        }
        // 2文字演算子
        const two = char + next;
        switch (two) {
            case '++':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.PlusPlus, two, start);
            case '--':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.MinusMinus, two, start);
            case '==':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.EqualEqual, two, start);
            case '!=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.BangEqual, two, start);
            case '<=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.LessEqual, two, start);
            case '>=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.GreaterEqual, two, start);
            case '<<':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.LessLess, two, start);
            case '>>':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.GreaterGreater, two, start);
            case '&&':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.AmpersandAmpersand, two, start);
            case '||':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.PipePipe, two, start);
            case '??':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.QuestionQuestion, two, start);
            case '->':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.Arrow, two, start);
            case '=>':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.DoubleArrow, two, start);
            case '::':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.DoubleColon, two, start);
            case '+=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.PlusEqual, two, start);
            case '-=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.MinusEqual, two, start);
            case '*=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.StarEqual, two, start);
            case '/=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.SlashEqual, two, start);
            case '%=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.PercentEqual, two, start);
            case '.=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.DotEqual, two, start);
            case '&=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.AmpersandEqual, two, start);
            case '|=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.PipeEqual, two, start);
            case '^=':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.CaretEqual, two, start);
            case '**':
                this.scanner.skip(2);
                return this.makeToken(token_js_1.TokenKind.StarStar, two, start);
            case '?>':
                // PHP 終了タグ
                this.scanner.skip(2);
                this.inPhpTag = false;
                return this.makeToken(token_js_1.TokenKind.CloseTag, two, start);
        }
        // ?-> (null-safe)
        if (char === '?' && next === '-' && next2 === '>') {
            this.scanner.skip(3);
            return this.makeToken(token_js_1.TokenKind.QuestionArrow, '?->', start);
        }
        // 1文字演算子・記号
        this.scanner.advance();
        switch (char) {
            case '+': return this.makeToken(token_js_1.TokenKind.Plus, char, start);
            case '-': return this.makeToken(token_js_1.TokenKind.Minus, char, start);
            case '*': return this.makeToken(token_js_1.TokenKind.Star, char, start);
            case '/': return this.makeToken(token_js_1.TokenKind.Slash, char, start);
            case '%': return this.makeToken(token_js_1.TokenKind.Percent, char, start);
            case '.': return this.makeToken(token_js_1.TokenKind.Dot, char, start);
            case '=': return this.makeToken(token_js_1.TokenKind.Equal, char, start);
            case '<': return this.makeToken(token_js_1.TokenKind.Less, char, start);
            case '>': return this.makeToken(token_js_1.TokenKind.Greater, char, start);
            case '&': return this.makeToken(token_js_1.TokenKind.Ampersand, char, start);
            case '|': return this.makeToken(token_js_1.TokenKind.Pipe, char, start);
            case '^': return this.makeToken(token_js_1.TokenKind.Caret, char, start);
            case '~': return this.makeToken(token_js_1.TokenKind.Tilde, char, start);
            case '!': return this.makeToken(token_js_1.TokenKind.Bang, char, start);
            case '?': return this.makeToken(token_js_1.TokenKind.Question, char, start);
            case ':': return this.makeToken(token_js_1.TokenKind.Colon, char, start);
            case ';': return this.makeToken(token_js_1.TokenKind.Semicolon, char, start);
            case ',': return this.makeToken(token_js_1.TokenKind.Comma, char, start);
            case '@': return this.makeToken(token_js_1.TokenKind.At, char, start);
            case '$': return this.makeToken(token_js_1.TokenKind.Dollar, char, start);
            case '\\': return this.makeToken(token_js_1.TokenKind.Backslash, char, start);
            case '(': return this.makeToken(token_js_1.TokenKind.LeftParen, char, start);
            case ')': return this.makeToken(token_js_1.TokenKind.RightParen, char, start);
            case '[': return this.makeToken(token_js_1.TokenKind.LeftBracket, char, start);
            case ']': return this.makeToken(token_js_1.TokenKind.RightBracket, char, start);
            case '{': return this.makeToken(token_js_1.TokenKind.LeftBrace, char, start);
            case '}': return this.makeToken(token_js_1.TokenKind.RightBrace, char, start);
            default: return this.makeToken(token_js_1.TokenKind.Unknown, char, start);
        }
    }
    /**
     * トークンを作成
     */
    makeToken(kind, text, start) {
        const location = (0, location_js_1.createLocation)(start, this.scanner.getCurrentPosition());
        // 各トークンタイプに応じて適切なプロパティを追加
        switch (kind) {
            case token_js_1.TokenKind.Number:
                return (0, token_js_1.createToken)(kind, text, location, { value: Number(text) });
            case token_js_1.TokenKind.String:
            case token_js_1.TokenKind.StringStart:
            case token_js_1.TokenKind.StringMiddle:
            case token_js_1.TokenKind.StringEnd:
                return (0, token_js_1.createToken)(kind, text, location, { value: text, quote: '"' });
            case token_js_1.TokenKind.Identifier:
                return (0, token_js_1.createToken)(kind, text, location, { name: text });
            case token_js_1.TokenKind.Variable:
                return (0, token_js_1.createToken)(kind, text, location, { name: text.slice(1) });
            default:
                // その他のトークンは追加プロパティなし
                return (0, token_js_1.createToken)(kind, text, location);
        }
    }
}
exports.Tokenizer = Tokenizer;
/**
 * 便利な関数：文字列をトークン化
 */
function tokenize(source, options) {
    const tokenizer = new Tokenizer(source, options);
    return tokenizer.tokenize();
}
