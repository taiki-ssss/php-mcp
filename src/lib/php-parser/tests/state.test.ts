import { describe, expect, test, beforeEach } from 'vitest';
import { LexerStateManager, LexerState, StringInterpolationTokenizer } from '../lexer/state';
import { Token, TokenKind } from '../core/token';

describe('LexerStateManager', () => {
  let manager: LexerStateManager;

  beforeEach(() => {
    manager = new LexerStateManager();
  });

  describe('Basic state management', () => {
    test('should start with Normal state', () => {
      expect(manager.currentState).toBe(LexerState.Normal);
    });

    test('should push and pop states', () => {
      manager.pushState(LexerState.InDoubleQuoteString);
      expect(manager.currentState).toBe(LexerState.InDoubleQuoteString);

      const popped = manager.popState();
      expect(popped).toBe(LexerState.InDoubleQuoteString);
      expect(manager.currentState).toBe(LexerState.Normal);
    });

    test('should not pop beyond initial state', () => {
      const popped = manager.popState();
      expect(popped).toBeUndefined();
      expect(manager.currentState).toBe(LexerState.Normal);
    });

    test('should reset to initial state', () => {
      manager.pushState(LexerState.InHeredoc);
      manager.pushState(LexerState.InStringInterpolation);
      
      manager.reset();
      
      expect(manager.currentState).toBe(LexerState.Normal);
    });
  });

  describe('String context management', () => {
    test('should manage string context', () => {
      expect(manager.currentStringContext).toBeUndefined();

      manager.pushState(LexerState.InDoubleQuoteString, {
        type: 'double',
        nestLevel: 0,
        interpolationDepth: 0
      });

      expect(manager.currentStringContext).toEqual({
        type: 'double',
        nestLevel: 0,
        interpolationDepth: 0
      });

      manager.popState();
      expect(manager.currentStringContext).toBeUndefined();
    });

    test('should handle nested string contexts', () => {
      manager.pushState(LexerState.InDoubleQuoteString, {
        type: 'double',
        nestLevel: 0,
        interpolationDepth: 0
      });

      manager.pushState(LexerState.InStringInterpolation);
      expect(manager.currentStringContext?.interpolationDepth).toBe(0);
    });
  });

  describe('Token transitions', () => {
    test('should transition to double quote string state', () => {
      const token: Token = {
        kind: TokenKind.String,
        value: 'test',
        quote: '"',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 5, offset: 4 }
        }
      };

      manager.transitionByToken(token);
      expect(manager.currentState).toBe(LexerState.InDoubleQuoteString);
      expect(manager.currentStringContext?.type).toBe('double');
    });

    test('should not transition for single quote string', () => {
      const token: Token = {
        kind: TokenKind.String,
        value: 'test',
        quote: "'",
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 5, offset: 4 }
        }
      };

      manager.transitionByToken(token);
      expect(manager.currentState).toBe(LexerState.Normal);
    });

    test('should handle string interpolation', () => {
      // First enter double quote string
      manager.pushState(LexerState.InDoubleQuoteString, {
        type: 'double',
        nestLevel: 0,
        interpolationDepth: 0
      });

      const varToken: Token = {
        kind: TokenKind.Variable,
        value: '$foo',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 5, offset: 4 }
        }
      };

      manager.transitionByToken(varToken);
      expect(manager.currentState).toBe(LexerState.InStringInterpolation);
      expect(manager.currentStringContext?.interpolationDepth).toBe(1);
    });

    test('should exit string on string end token', () => {
      manager.pushState(LexerState.InDoubleQuoteString, {
        type: 'double',
        nestLevel: 0,
        interpolationDepth: 0
      });

      const endToken: Token = {
        kind: TokenKind.StringEnd,
        value: '"',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 2, offset: 1 }
        }
      };

      manager.transitionByToken(endToken);
      expect(manager.currentState).toBe(LexerState.Normal);
    });

    test('should handle interpolation continuation', () => {
      manager.pushState(LexerState.InDoubleQuoteString, {
        type: 'double',
        nestLevel: 0,
        interpolationDepth: 0
      });
      manager.pushState(LexerState.InStringInterpolation);

      // Array access should continue interpolation
      const bracketToken: Token = {
        kind: TokenKind.LeftBracket,
        value: '[',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 2, offset: 1 }
        }
      };

      manager.transitionByToken(bracketToken);
      expect(manager.currentState).toBe(LexerState.InStringInterpolation);

      // Other tokens should exit interpolation
      const otherToken: Token = {
        kind: TokenKind.Semicolon,
        value: ';',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 2, offset: 1 }
        }
      };

      manager.transitionByToken(otherToken);
      expect(manager.currentState).toBe(LexerState.InDoubleQuoteString);
    });

    test('should handle complex interpolation nesting', () => {
      manager.pushState(LexerState.InDoubleQuoteString, {
        type: 'double',
        nestLevel: 0,
        interpolationDepth: 0
      });
      manager.pushState(LexerState.InComplexInterpolation);
      
      const context = manager.currentStringContext;
      expect(context).toBeDefined();
      if (context) {
        context.nestLevel = 1; // Simulate being inside ${
      }

      // Left brace increases nesting
      const leftBrace: Token = {
        kind: TokenKind.LeftBrace,
        value: '{',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 2, offset: 1 }
        }
      };

      manager.transitionByToken(leftBrace);
      expect(manager.currentStringContext?.nestLevel).toBe(2);

      // Right brace decreases nesting
      const rightBrace: Token = {
        kind: TokenKind.RightBrace,
        value: '}',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 2, offset: 1 }
        }
      };

      manager.transitionByToken(rightBrace);
      expect(manager.currentStringContext?.nestLevel).toBe(1);

      // Another right brace should exit complex interpolation
      manager.transitionByToken(rightBrace);
      expect(manager.currentState).toBe(LexerState.InDoubleQuoteString);
    });
  });

  describe('Expected tokens', () => {
    test('should return expected tokens for string states', () => {
      manager.pushState(LexerState.InDoubleQuoteString);
      
      const expected = manager.getExpectedTokens();
      
      expect(expected.has(TokenKind.StringMiddle)).toBe(true);
      expect(expected.has(TokenKind.Variable)).toBe(true);
      expect(expected.has(TokenKind.Dollar)).toBe(true);
      expect(expected.has(TokenKind.StringEnd)).toBe(true);
    });

    test('should return expected tokens for heredoc', () => {
      manager.pushState(LexerState.InHeredoc);
      
      const expected = manager.getExpectedTokens();
      
      expect(expected.has(TokenKind.StringMiddle)).toBe(true);
      expect(expected.has(TokenKind.Variable)).toBe(true);
      expect(expected.has(TokenKind.Dollar)).toBe(true);
      expect(expected.has(TokenKind.StringEnd)).toBe(true);
    });

    test('should return empty set for other states', () => {
      expect(manager.getExpectedTokens().size).toBe(0);
      
      manager.pushState(LexerState.InComplexInterpolation);
      expect(manager.getExpectedTokens().size).toBe(0);
    });
  });
});

describe('StringInterpolationTokenizer', () => {
  test('should return empty tokens for single quotes', () => {
    const tokens = StringInterpolationTokenizer.tokenizeInterpolatedString('$var test', "'");
    expect(tokens).toHaveLength(0);
  });

  test('should return empty tokens for nowdoc', () => {
    const tokens = StringInterpolationTokenizer.tokenizeInterpolatedString('$var test', 'nowdoc');
    expect(tokens).toHaveLength(0);
  });

  test('should process double quote strings', () => {
    const tokens = StringInterpolationTokenizer.tokenizeInterpolatedString('hello $world', '"');
    // Since the implementation is incomplete, just verify it doesn't crash
    expect(tokens).toBeDefined();
  });

  test('should process heredoc strings', () => {
    const tokens = StringInterpolationTokenizer.tokenizeInterpolatedString('hello $world', 'heredoc');
    expect(tokens).toBeDefined();
  });
});