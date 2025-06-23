import { describe, expect, test, vi } from 'vitest';
import { tokenizePhp, partial } from '../index';

describe('Index exports', () => {
  describe('tokenizePhp', () => {
    test('should return success result for valid PHP code', () => {
      const result = tokenizePhp('<?php echo "Hello"; ?>');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Array);
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    test('should return error result when tokenizer throws', async () => {
      // Mock tokenize to throw an Error
      const tokenizerModule = await import('../lexer/tokenizer');
      vi.spyOn(tokenizerModule, 'tokenize').mockImplementationOnce(() => {
        throw new Error('Tokenizer error');
      });
      
      const { tokenizePhp: errorTokenizePhp } = await import('../index');
      const result = errorTokenizePhp('<?php ?>');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Tokenizer error');
      }
      
      vi.restoreAllMocks();
    });

    test('should handle non-Error exceptions', async () => {
      // Dynamic import and mock
      const tokenizerModule = await import('../lexer/tokenizer');
      vi.spyOn(tokenizerModule, 'tokenize').mockImplementationOnce(() => {
        throw 'string error';
      });
      
      // Re-import to get the mocked version
      const { tokenizePhp: mockedTokenizePhp } = await import('../index');
      
      const result = mockedTokenizePhp('<?php ?>');
      
      // Should handle the non-Error exception
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('string error');
      }
      
      // Restore
      vi.restoreAllMocks();
    });
  });

  describe('partial', () => {
    test('should create partially applied function', () => {
      const add = (a: number, b: number, c: number) => a + b + c;
      const add5 = partial(add, 5);
      
      expect(add5(10, 15)).toBe(30);
    });

    test('should work with multiple partial arguments', () => {
      const multiply = (a: number, b: number, c: number) => a * b * c;
      const multiplyBy2And3 = partial(multiply, 2, 3);
      
      expect(multiplyBy2And3(4)).toBe(24);
    });

    test('should work with no partial arguments', () => {
      const subtract = (a: number, b: number) => a - b;
      const subtractNone = partial(subtract);
      
      expect(subtractNone(10, 3)).toBe(7);
    });

    test('should work with different types', () => {
      const concat = (a: string, b: string, c: string) => a + b + c;
      const concatHello = partial(concat, 'Hello', ' ');
      
      expect(concatHello('World')).toBe('Hello World');
    });
  });
});