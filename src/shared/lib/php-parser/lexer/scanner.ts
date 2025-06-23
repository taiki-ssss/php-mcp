/**
 * String Scanner
 * Provides efficient character-by-character reading and backtracking
 */

import { SourcePosition, createPosition } from '../core/location.js';

/**
 * Class for scanning strings
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
   * Get current character without advancing
   */
  peek(offset: number = 0): string {
    const pos = this.position + offset;
    return pos < this.source.length ? this.source[pos] : '\0';
  }

  /**
   * Get current character and advance to next
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
   * Skip specified number of characters
   */
  skip(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      this.advance();
    }
  }

  /**
   * Check if string matches without advancing
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
   * Consume string if it matches
   */
  consume(text: string): boolean {
    if (this.matches(text)) {
      this.skip(text.length);
      return true;
    }
    return false;
  }

  /**
   * Consume characters matching regex pattern
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
   * Consume characters while predicate is true
   */
  consumeWhile(predicate: (char: string) => boolean): string {
    let result = '';
    while (!this.isAtEnd() && predicate(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  /**
   * Consume characters until predicate is true
   */
  consumeUntil(predicate: (char: string) => boolean): string {
    return this.consumeWhile(char => !predicate(char));
  }

  /**
   * Save current position
   */
  save(): ScannerState {
    return {
      position: this.position,
      line: this.line,
      column: this.column
    };
  }

  /**
   * Restore to saved position
   */
  restore(state: ScannerState): void {
    this.position = state.position;
    this.line = state.line;
    this.column = state.column;
  }

  /**
   * Get current position information
   */
  getCurrentPosition(): SourcePosition {
    return createPosition(this.line, this.column, this.position);
  }

  /**
   * Check if at end of file
   */
  isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  /**
   * Get remaining string
   */
  remaining(): string {
    return this.source.slice(this.position);
  }

  /**
   * Get context for error reporting
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
 * Scanner state
 */
interface ScannerState {
  position: number;
  line: number;
  column: number;
}

/**
 * Character utility helpers
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