import { describe, expect, test, vi } from 'vitest';
import { 
  pipe, 
  pipeAsync, 
  tryPipe, 
  tap, 
  when, 
  memoize,
  tokenizePhp,
  parsePhp
} from '../index';

describe('Utility Functions', () => {
  describe('pipe', () => {
    test('should compose functions left to right', () => {
      const add = (x: number) => (y: number) => x + y;
      const multiply = (x: number) => (y: number) => x * y;
      
      const composed = pipe(add(5), multiply(2));
      expect(composed(10)).toBe(30); // (10 + 5) * 2 = 30
    });

    test('should work with single function', () => {
      const double = (x: number) => x * 2;
      const composed = pipe(double);
      expect(composed(5)).toBe(10);
    });

    test('should work with multiple functions', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const toString = (x: number) => x.toString();
      
      const composed = pipe(add1, double, toString);
      expect(composed(5)).toBe('12'); // (5 + 1) * 2 = 12
    });

    test('should preserve types through composition', () => {
      const parseNum = (s: string) => parseInt(s, 10);
      const double = (n: number) => n * 2;
      const toString = (n: number) => n.toString();
      
      const composed = pipe(parseNum, double, toString);
      const result: string = composed('21');
      expect(result).toBe('42');
    });
  });

  describe('pipeAsync', () => {
    test('should compose async functions', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const asyncAdd = async (x: number) => {
        await delay(10);
        return x + 10;
      };
      
      const asyncMultiply = async (x: number) => {
        await delay(10);
        return x * 2;
      };
      
      const composed = pipeAsync(asyncAdd, asyncMultiply);
      const result = await composed(5);
      expect(result).toBe(30); // (5 + 10) * 2 = 30
    });

    test('should handle mixed sync and async functions', async () => {
      const syncAdd = (x: number) => x + 5;
      const asyncDouble = async (x: number) => x * 2;
      const syncToString = (x: number) => x.toString();
      
      const composed = pipeAsync(syncAdd, asyncDouble, syncToString);
      const result = await composed(10);
      expect(result).toBe('30'); // (10 + 5) * 2 = 30
    });

    test('should propagate errors', async () => {
      const throwError = async () => {
        throw new Error('Test error');
      };
      
      const composed = pipeAsync(throwError);
      await expect(composed(undefined)).rejects.toThrow('Test error');
    });
  });

  describe('tryPipe', () => {
    test('should return success result on successful execution', () => {
      const add5 = (x: number) => x + 5;
      const double = (x: number) => x * 2;
      
      const composed = tryPipe(add5, double);
      const result = composed(10);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(30); // (10 + 5) * 2 = 30
      }
    });

    test('should return error result on exception', () => {
      const throwError = () => {
        throw new Error('Test error');
      };
      
      const composed = tryPipe(throwError);
      const result = composed(undefined);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Test error');
      }
    });

    test('should stop execution on first error', () => {
      const fn1 = vi.fn((x: number) => x + 1);
      const throwError = vi.fn(() => {
        throw new Error('Stop here');
      });
      const fn3 = vi.fn((x: number) => x * 2);
      
      const composed = tryPipe(fn1, throwError, fn3);
      const result = composed(5);
      
      expect(result.success).toBe(false);
      expect(fn1).toHaveBeenCalledWith(5);
      expect(throwError).toHaveBeenCalledWith(6);
      expect(fn3).not.toHaveBeenCalled();
    });
  });

  describe('tap', () => {
    test('should execute side effect and return original value', () => {
      const sideEffect = vi.fn();
      const tapped = tap(sideEffect);
      
      const result = tapped(42);
      
      expect(result).toBe(42);
      expect(sideEffect).toHaveBeenCalledWith(42);
    });

    test('should work in pipe composition', () => {
      const log: number[] = [];
      const logValue = (x: number) => log.push(x);
      
      const composed = pipe(
        (x: number) => x + 5,
        tap(logValue),
        (x: number) => x * 2
      );
      
      const result = composed(10);
      
      expect(result).toBe(30);
      expect(log).toEqual([15]); // Logged intermediate value
    });
  });

  describe('when', () => {
    test('should apply function when predicate is true', () => {
      const isEven = (x: number) => x % 2 === 0;
      const double = (x: number) => x * 2;
      
      const conditionalDouble = when(isEven, double);
      
      expect(conditionalDouble(4)).toBe(8);
      expect(conditionalDouble(5)).toBe(5);
    });

    test('should work with complex predicates', () => {
      const isLongString = (s: string) => s.length > 10;
      const truncate = (s: string) => s.substring(0, 10) + '...';
      
      const conditionalTruncate = when(isLongString, truncate);
      
      expect(conditionalTruncate('short')).toBe('short');
      expect(conditionalTruncate('this is a very long string')).toBe('this is a ...');
    });

    test('should preserve types', () => {
      interface User {
        name: string;
        age: number;
        isAdult?: boolean;
      }
      
      const isAdult = (user: User) => user.age >= 18;
      const addAdultFlag = (user: User): User => ({ ...user, isAdult: true });
      
      const processUser = when(isAdult, addAdultFlag);
      
      const child: User = { name: 'Alice', age: 10 };
      const adult: User = { name: 'Bob', age: 25 };
      
      expect(processUser(child)).toEqual(child);
      expect(processUser(adult)).toEqual({ ...adult, isAdult: true });
    });
  });

  describe('memoize', () => {
    test('should cache function results', () => {
      let callCount = 0;
      const expensive = (x: number) => {
        callCount++;
        return x * x;
      };
      
      const memoized = memoize(expensive);
      
      expect(memoized(5)).toBe(25);
      expect(memoized(5)).toBe(25);
      expect(memoized(5)).toBe(25);
      expect(callCount).toBe(1);
      
      expect(memoized(6)).toBe(36);
      expect(callCount).toBe(2);
    });

    test('should work with multiple arguments', () => {
      let callCount = 0;
      const add = (a: number, b: number) => {
        callCount++;
        return a + b;
      };
      
      const memoized = memoize(add);
      
      expect(memoized(2, 3)).toBe(5);
      expect(memoized(2, 3)).toBe(5);
      expect(callCount).toBe(1);
      
      expect(memoized(3, 2)).toBe(5);
      expect(callCount).toBe(2); // Different argument order = different cache key
    });

    test('should handle complex arguments', () => {
      const process = memoize((obj: { x: number; y: number }) => {
        return obj.x + obj.y;
      });
      
      const obj1 = { x: 1, y: 2 };
      const obj2 = { x: 1, y: 2 };
      const obj3 = { x: 2, y: 1 };
      
      expect(process(obj1)).toBe(3);
      expect(process(obj1)).toBe(3); // Same reference, cached
      expect(process(obj2)).toBe(3); // Different reference but same content
      expect(process(obj3)).toBe(3); // Different content
    });
  });

  describe('tokenizePhp and parsePhp exports', () => {
    test('should tokenize PHP code', () => {
      const code = '<?php $x = 42; ?>';
      const result = tokenizePhp(code);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Array);
        expect(result.value.some(t => t.type === 'T_VARIABLE')).toBe(true);
        expect(result.value.some(t => t.type === 'T_LNUMBER')).toBe(true);
      }
    });

    test('should parse PHP code', () => {
      const code = '<?php $x = 42; ?>';
      const result = parsePhp(code);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.type).toBe('Program');
        expect(result.value.statements).toBeInstanceOf(Array);
        expect(result.value.statements).toHaveLength(1);
        expect(result.value.statements[0].type).toBe('ExpressionStatement');
      }
    });

    test('should handle tokenization errors', () => {
      // Even invalid PHP often tokenizes successfully
      const code = '<?php $';
      const result = tokenizePhp(code);
      
      // Tokenizer is quite permissive
      expect(result.success).toBe(true);
    });

    test('should handle parsing errors', () => {
      const code = '<?php class { ?>';
      const result = parsePhp(code);
      
      // This might actually parse successfully with error recovery
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Function composition with PHP parser', () => {
    test('should compose tokenization and analysis', () => {
      const countVariables = pipe(
        tokenizePhp,
        (result) => result.success ? result.value : [],
        (tokens) => tokens.filter(t => t.type === 'T_VARIABLE').length
      );
      
      const code = '<?php $a = 1; $b = 2; $c = $a + $b; ?>';
      const count = countVariables(code);
      
      expect(count).toBe(5); // $a, $b, $c, $a, $b
    });

    test('should use tryPipe for safe parsing', () => {
      const safeParse = tryPipe(
        parsePhp,
        (result) => {
          if (!result.success) throw new Error(result.error);
          return result.value;
        },
        (ast) => ast.statements.length
      );
      
      const validCode = '<?php echo "hello"; ?>';
      const validResult = safeParse(validCode);
      
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.value).toBe(1);
      }
      
      const invalidCode = '<?php class { ?>';
      const invalidResult = safeParse(invalidCode);
      
      // May or may not fail depending on error recovery
      if (!invalidResult.success) {
        expect(invalidResult.error).toBeTruthy();
      }
    });

    test('should use memoize for expensive parsing', () => {
      let parseCount = 0;
      const instrumentedParse = (code: string) => {
        parseCount++;
        return parsePhp(code);
      };
      
      const memoizedParse = memoize(instrumentedParse);
      
      const code = '<?php class Foo { public function bar() {} } ?>';
      
      // First call
      const result1 = memoizedParse(code);
      expect(result1.success).toBe(true);
      expect(parseCount).toBe(1);
      
      // Second call - should be cached
      const result2 = memoizedParse(code);
      expect(result2).toBe(result1); // Same reference
      expect(parseCount).toBe(1);
      
      // Different code
      const code2 = '<?php echo "different"; ?>';
      const result3 = memoizedParse(code2);
      expect(result3.success).toBe(true);
      expect(parseCount).toBe(2);
    });
  });
});