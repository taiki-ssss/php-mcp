import { describe, expect, test } from 'vitest';
import { isTokenKind, createToken, TokenKind, Token } from '../core/token';

describe('Token utilities', () => {
  describe('isTokenKind', () => {
    test('should return true for matching token kind', () => {
      const token: Token = {
        kind: TokenKind.Variable,
        value: '$foo',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 5, offset: 4 }
        }
      };

      expect(isTokenKind(token, TokenKind.Variable)).toBe(true);
    });

    test('should return false for non-matching token kind', () => {
      const token: Token = {
        kind: TokenKind.Identifier,
        value: 'foo',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 4, offset: 3 }
        }
      };

      expect(isTokenKind(token, TokenKind.Variable)).toBe(false);
    });

    test('should narrow type correctly', () => {
      const token: Token = {
        kind: TokenKind.String,
        value: 'hello',
        quote: '"',
        range: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 8, offset: 7 }
        }
      };

      if (isTokenKind(token, TokenKind.String)) {
        // TypeScript should know that token has quote property here
        expect(token.quote).toBe('"');
      }
    });

    test('should work with different token types', () => {
      const tokens: Token[] = [
        {
          kind: TokenKind.Number,
          value: '123',
          range: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 4, offset: 3 }
          }
        },
        {
          kind: TokenKind.Class,
          value: 'class',
          range: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 6, offset: 5 }
          }
        },
        {
          kind: TokenKind.Function,
          value: 'function',
          range: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 9, offset: 8 }
          }
        }
      ];

      expect(isTokenKind(tokens[0], TokenKind.Number)).toBe(true);
      expect(isTokenKind(tokens[1], TokenKind.Class)).toBe(true);
      expect(isTokenKind(tokens[2], TokenKind.Function)).toBe(true);
      
      expect(isTokenKind(tokens[0], TokenKind.Class)).toBe(false);
      expect(isTokenKind(tokens[1], TokenKind.Function)).toBe(false);
      expect(isTokenKind(tokens[2], TokenKind.Number)).toBe(false);
    });
  });

});