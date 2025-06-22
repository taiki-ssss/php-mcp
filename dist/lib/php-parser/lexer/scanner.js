"use strict";
/**
 * 文字列スキャナー
 * 効率的な文字単位の読み取りとバックトラック
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharUtils = exports.Scanner = void 0;
const location_js_1 = require("../core/location.js");
/**
 * 文字列をスキャンするクラス
 */
class Scanner {
    source;
    position = 0;
    line = 1;
    column = 1;
    constructor(source) {
        this.source = source;
    }
    /**
     * 現在の文字を取得（進めない）
     */
    peek(offset = 0) {
        const pos = this.position + offset;
        return pos < this.source.length ? this.source[pos] : '\0';
    }
    /**
     * 現在の文字を取得して次に進む
     */
    advance() {
        const char = this.peek();
        if (char !== '\0') {
            this.position++;
            if (char === '\n') {
                this.line++;
                this.column = 1;
            }
            else {
                this.column++;
            }
        }
        return char;
    }
    /**
     * 指定された文字数分進む
     */
    skip(count = 1) {
        for (let i = 0; i < count; i++) {
            this.advance();
        }
    }
    /**
     * 文字列がマッチするかチェック（進めない）
     */
    matches(text) {
        for (let i = 0; i < text.length; i++) {
            if (this.peek(i) !== text[i]) {
                return false;
            }
        }
        return true;
    }
    /**
     * 文字列を消費（マッチしたら進む）
     */
    consume(text) {
        if (this.matches(text)) {
            this.skip(text.length);
            return true;
        }
        return false;
    }
    /**
     * 正規表現にマッチする部分を消費
     */
    consumeRegex(pattern) {
        const remaining = this.source.slice(this.position);
        const match = remaining.match(pattern);
        if (match && match.index === 0) {
            const text = match[0];
            this.skip(text.length);
            return text;
        }
        return null;
    }
    /**
     * 条件を満たす間、文字を消費
     */
    consumeWhile(predicate) {
        let result = '';
        while (!this.isAtEnd() && predicate(this.peek())) {
            result += this.advance();
        }
        return result;
    }
    /**
     * 条件を満たすまで文字を消費
     */
    consumeUntil(predicate) {
        return this.consumeWhile(char => !predicate(char));
    }
    /**
     * 現在位置を保存
     */
    save() {
        return {
            position: this.position,
            line: this.line,
            column: this.column
        };
    }
    /**
     * 保存した位置に戻る
     */
    restore(state) {
        this.position = state.position;
        this.line = state.line;
        this.column = state.column;
    }
    /**
     * 現在の位置情報を取得
     */
    getCurrentPosition() {
        return (0, location_js_1.createPosition)(this.line, this.column, this.position);
    }
    /**
     * ファイルの終端かチェック
     */
    isAtEnd() {
        return this.position >= this.source.length;
    }
    /**
     * 残りの文字列を取得
     */
    remaining() {
        return this.source.slice(this.position);
    }
    /**
     * エラー用のコンテキストを取得
     */
    getContext(length = 20) {
        const start = Math.max(0, this.position - length);
        const end = Math.min(this.source.length, this.position + length);
        const before = this.source.slice(start, this.position);
        const after = this.source.slice(this.position, end);
        return `${before}│${after}`;
    }
}
exports.Scanner = Scanner;
/**
 * 文字判定ヘルパー
 */
exports.CharUtils = {
    isAlpha(char) {
        return /[a-zA-Z]/.test(char);
    },
    isDigit(char) {
        return /[0-9]/.test(char);
    },
    isHexDigit(char) {
        return /[0-9a-fA-F]/.test(char);
    },
    isOctalDigit(char) {
        return /[0-7]/.test(char);
    },
    isBinaryDigit(char) {
        return /[01]/.test(char);
    },
    isWhitespace(char) {
        return /[\s]/.test(char);
    },
    isNewline(char) {
        return char === '\n' || char === '\r';
    },
    isIdentifierStart(char) {
        return /[a-zA-Z_\x80-\xff]/.test(char);
    },
    isIdentifierPart(char) {
        return /[a-zA-Z0-9_\x80-\xff]/.test(char);
    }
};
