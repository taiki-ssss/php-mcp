/**
 * 文字列スキャナー
 * 効率的な文字単位の読み取りとバックトラック
 */

import { SourcePosition, createPosition } from '../core/location.js';

/**
 * 文字列をスキャンするクラス
 */
export class Scanner {
  private readonly source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  /**
   * 現在の文字を取得（進めない）
   */
  peek(offset: number = 0): string {
    const pos = this.position + offset;
    return pos < this.source.length ? this.source[pos] : '\0';
  }

  /**
   * 現在の文字を取得して次に進む
   */
  advance(): string {
    const char = this.peek();
    if (char !== '\0') {
      this.position++;
      if (char === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
    return char;
  }

  /**
   * 指定された文字数分進む
   */
  skip(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      this.advance();
    }
  }

  /**
   * 文字列がマッチするかチェック（進めない）
   */
  matches(text: string): boolean {
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
  consume(text: string): boolean {
    if (this.matches(text)) {
      this.skip(text.length);
      return true;
    }
    return false;
  }

  /**
   * 正規表現にマッチする部分を消費
   */
  consumeRegex(pattern: RegExp): string | null {
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
  consumeWhile(predicate: (char: string) => boolean): string {
    let result = '';
    while (!this.isAtEnd() && predicate(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  /**
   * 条件を満たすまで文字を消費
   */
  consumeUntil(predicate: (char: string) => boolean): string {
    return this.consumeWhile(char => !predicate(char));
  }

  /**
   * 現在位置を保存
   */
  save(): ScannerState {
    return {
      position: this.position,
      line: this.line,
      column: this.column
    };
  }

  /**
   * 保存した位置に戻る
   */
  restore(state: ScannerState): void {
    this.position = state.position;
    this.line = state.line;
    this.column = state.column;
  }

  /**
   * 現在の位置情報を取得
   */
  getCurrentPosition(): SourcePosition {
    return createPosition(this.line, this.column, this.position);
  }

  /**
   * ファイルの終端かチェック
   */
  isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  /**
   * 残りの文字列を取得
   */
  remaining(): string {
    return this.source.slice(this.position);
  }

  /**
   * エラー用のコンテキストを取得
   */
  getContext(length: number = 20): string {
    const start = Math.max(0, this.position - length);
    const end = Math.min(this.source.length, this.position + length);
    const before = this.source.slice(start, this.position);
    const after = this.source.slice(this.position, end);
    return `${before}│${after}`;
  }
}

/**
 * スキャナーの状態
 */
interface ScannerState {
  position: number;
  line: number;
  column: number;
}

/**
 * 文字判定ヘルパー
 */
export const CharUtils = {
  isAlpha(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  },

  isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  },

  isHexDigit(char: string): boolean {
    return /[0-9a-fA-F]/.test(char);
  },

  isOctalDigit(char: string): boolean {
    return /[0-7]/.test(char);
  },

  isBinaryDigit(char: string): boolean {
    return /[01]/.test(char);
  },

  isWhitespace(char: string): boolean {
    return /[\s]/.test(char);
  },

  isNewline(char: string): boolean {
    return char === '\n' || char === '\r';
  },

  isIdentifierStart(char: string): boolean {
    return /[a-zA-Z_\x80-\xff]/.test(char);
  },

  isIdentifierPart(char: string): boolean {
    return /[a-zA-Z0-9_\x80-\xff]/.test(char);
  }
};