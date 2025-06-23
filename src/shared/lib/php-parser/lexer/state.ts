/**
 * Lexer State Management
 * Manages complex states like string interpolation and heredoc
 */

import { Token, TokenKind } from '../core/token.js';

/**
 * Lexer state types
 */
export enum LexerState {
  /** Normal PHP code */
  Normal = 'Normal',
  /** Inside double-quoted string */
  InDoubleQuoteString = 'InDoubleQuoteString',
  /** Inside heredoc */
  InHeredoc = 'InHeredoc',
  /** Variable expansion in string */
  InStringInterpolation = 'InStringInterpolation',
  /** Inside backtick (shell execution) */
  InBacktick = 'InBacktick',
  /** Inside complex interpolation ${...} */
  InComplexInterpolation = 'InComplexInterpolation'
}

/**
 * String interpolation context
 */
export interface StringContext {
  /** String type */
  type: 'double' | 'heredoc' | 'backtick';
  /** End delimiter */
  delimiter?: string;
  /** Nesting level */
  nestLevel: number;
  /** Interpolation depth */
  interpolationDepth: number;
}

/**
 * Lexer state manager
 */
export class LexerStateManager {
  private stateStack: LexerState[] = [LexerState.Normal];
  private stringContextStack: StringContext[] = [];

  /**
   * Get current state
   */
  get currentState(): LexerState {
    return this.stateStack[this.stateStack.length - 1];
  }

  /**
   * Get current string context
   */
  get currentStringContext(): StringContext | undefined {
    return this.stringContextStack[this.stringContextStack.length - 1];
  }

  /**
   * Push new state
   */
  pushState(state: LexerState, context?: StringContext): void {
    this.stateStack.push(state);
    if (context) {
      this.stringContextStack.push(context);
    }
  }

  /**
   * Pop state
   */
  popState(): LexerState | undefined {
    if (this.stateStack.length > 1) {
      const state = this.stateStack.pop();

      // For string-related states, also pop context
      if (state && this.isStringState(state)) {
        this.stringContextStack.pop();
      }

      return state;
    }
    return undefined;
  }

  /**
   * Check if state is string-related
   */
  private isStringState(state: LexerState): boolean {
    return state === LexerState.InDoubleQuoteString ||
      state === LexerState.InHeredoc ||
      state === LexerState.InBacktick ||
      state === LexerState.InStringInterpolation ||
      state === LexerState.InComplexInterpolation;
  }

  /**
   * Reset state
   */
  reset(): void {
    this.stateStack = [LexerState.Normal];
    this.stringContextStack = [];
  }

  /**
   * State transition by token
   */
  transitionByToken(token: Token): void {
    switch (this.currentState) {
      case LexerState.Normal:
        this.handleNormalState(token);
        break;

      case LexerState.InDoubleQuoteString:
      case LexerState.InHeredoc:
      case LexerState.InBacktick:
        this.handleStringState(token);
        break;

      case LexerState.InStringInterpolation:
        this.handleInterpolationState(token);
        break;

      case LexerState.InComplexInterpolation:
        this.handleComplexInterpolationState(token);
        break;
    }
  }

  /**
   * Handle token in normal state
   */
  private handleNormalState(token: Token): void {
    switch (token.kind) {
      case TokenKind.String:
        if ('quote' in token && token.quote === '"') {
          // Start of double-quoted string
          this.pushState(LexerState.InDoubleQuoteString, {
            type: 'double',
            nestLevel: 0,
            interpolationDepth: 0
          });
        }
        break;

      // Heredoc and backtick handling implemented similarly
    }
  }

  /**
   * Handle token in string state
   */
  private handleStringState(token: Token): void {
    const context = this.currentStringContext;
    if (!context) return;

    // Check for variable start
    if (token.kind === TokenKind.Variable) {
      this.pushState(LexerState.InStringInterpolation);
      context.interpolationDepth++;
    }

    // Check for ${...} start
    if (token.kind === TokenKind.Dollar && this.peekNextToken()?.kind === TokenKind.LeftBrace) {
      this.pushState(LexerState.InComplexInterpolation);
      context.nestLevel++;
    }

    // Check for string end
    if (token.kind === TokenKind.StringEnd) {
      this.popState();
    }
  }

  /**
   * Handle token in interpolation state
   */
  private handleInterpolationState(token: Token): void {
    // Check interpolation end condition
    if (!this.isInterpolationContinuation(token)) {
      this.popState();
      const context = this.currentStringContext;
      if (context) {
        context.interpolationDepth--;
      }
    }
  }

  /**
   * Handle token in complex interpolation state
   */
  private handleComplexInterpolationState(token: Token): void {
    const context = this.currentStringContext;
    if (!context) return;

    if (token.kind === TokenKind.LeftBrace) {
      context.nestLevel++;
    } else if (token.kind === TokenKind.RightBrace) {
      context.nestLevel--;
      if (context.nestLevel === 0) {
        this.popState();
      }
    }
  }

  /**
   * Check if interpolation continues
   */
  private isInterpolationContinuation(token: Token): boolean {
    // Tokens that can follow a variable
    return token.kind === TokenKind.LeftBracket ||  // Array access
      token.kind === TokenKind.Arrow ||         // Property access
      token.kind === TokenKind.DoubleColon;     // Static access
  }

  /**
   * Preview next token (implementation depends on tokenizer)
   */
  private peekNextToken(): Token | undefined {
    // This feature requires integration with tokenizer
    return undefined;
  }

  /**
   * Get expected tokens based on current state
   */
  getExpectedTokens(): Set<TokenKind> {
    const expected = new Set<TokenKind>();

    switch (this.currentState) {
      case LexerState.Normal:
        // All normal tokens are possible
        break;

      case LexerState.InDoubleQuoteString:
      case LexerState.InHeredoc:
        expected.add(TokenKind.StringMiddle);
        expected.add(TokenKind.Variable);
        expected.add(TokenKind.Dollar);
        expected.add(TokenKind.StringEnd);
        break;

      case LexerState.InComplexInterpolation:
        // All tokens valid in expressions
        break;
    }

    return expected;
  }
}

/**
 * String interpolation tokenizer
 * Processes variable expansion in strings
 */
export class StringInterpolationTokenizer {
  /**
   * Tokenize interpolated string into tokens
   */
  static tokenizeInterpolatedString(
    content: string,
    quoteType: '"' | "'" | 'heredoc' | 'nowdoc'
  ): Token[] {
    const tokens: Token[] = [];

    if (quoteType === "'" || quoteType === 'nowdoc') {
      // No interpolation
      return tokens;
    }

    // Simplified implementation: actual implementation is more complex
    let current = '';
    let i = 0;

    while (i < content.length) {
      if (content[i] === '$' && i + 1 < content.length) {
        // Check for variable possibility
        if (content[i + 1] === '{' || /[a-zA-Z_]/.test(content[i + 1])) {
          // Tokenize current string part
          if (current) {
            // Create StringMiddle token
            current = '';
          }

          // Process variable part
          if (content[i + 1] === '{') {
            // ${...} format
            i += 2; // Skip ${
            // Process complex expression
          } else {
            // $var format
            i++; // Skip $
            // Read variable name
          }
          continue;
        }
      }

      current += content[i];
      i++;
    }

    // Remaining string part
    if (current) {
      // Create StringMiddle token
    }

    return tokens;
  }
}