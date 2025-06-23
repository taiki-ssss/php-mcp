import { describe, expect, test } from 'vitest';
import {
  ok, err, isOk, isErr, unwrap, unwrapOr, map, mapErr,
  flatMap, andThen, orElse, match, toPromise, fromPromise,
  Result
} from '../utils/result';

describe('Result utilities', () => {
  describe('ok and err constructors', () => {
    test('should create successful result', () => {
      const result = ok(42);
      expect(result).toEqual({ success: true, value: 42 });
    });

    test('should create failed result', () => {
      const result = err('error message');
      expect(result).toEqual({ success: false, error: 'error message' });
    });

    test('should handle different error types', () => {
      const result = err({ code: 404, message: 'Not found' });
      expect(result.success).toBe(false);
      expect(result.error).toEqual({ code: 404, message: 'Not found' });
    });
  });

  describe('Type guards', () => {
    test('isOk should identify successful results', () => {
      const success = ok(42);
      const failure = err('error');

      expect(isOk(success)).toBe(true);
      expect(isOk(failure)).toBe(false);
    });

    test('isErr should identify failed results', () => {
      const success = ok(42);
      const failure = err('error');

      expect(isErr(success)).toBe(false);
      expect(isErr(failure)).toBe(true);
    });
  });

  describe('unwrap functions', () => {
    test('unwrap should return value for success', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    test('unwrap should throw for failure', () => {
      const result = err('error message');
      expect(() => unwrap(result)).toThrow('error message');
    });

    test('unwrap should throw generic error for non-string errors', () => {
      const result = err({ code: 404 });
      expect(() => unwrap(result)).toThrow('Unwrap failed');
    });

    test('unwrapOr should return value for success', () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    test('unwrapOr should return default for failure', () => {
      const result = err('error');
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('map functions', () => {
    test('map should transform success value', () => {
      const result = ok(21);
      const mapped = map(result, x => x * 2);
      
      expect(mapped).toEqual({ success: true, value: 42 });
    });

    test('map should pass through failure', () => {
      const result = err('error');
      const mapped = map(result, x => x * 2);
      
      expect(mapped).toEqual({ success: false, error: 'error' });
    });

    test('mapErr should transform error value', () => {
      const result = err('error');
      const mapped = mapErr(result, e => e.toUpperCase());
      
      expect(mapped).toEqual({ success: false, error: 'ERROR' });
    });

    test('mapErr should pass through success', () => {
      const result = ok(42);
      const mapped = mapErr(result, e => e);
      
      expect(mapped).toEqual({ success: true, value: 42 });
    });
  });

  describe('flatMap/andThen', () => {
    test('flatMap should chain successful operations', () => {
      const result = ok(21);
      const chained = flatMap(result, x => ok(x * 2));
      
      expect(chained).toEqual({ success: true, value: 42 });
    });

    test('flatMap should short-circuit on failure', () => {
      const result = err('initial error');
      const chained = flatMap(result, x => ok(x * 2));
      
      expect(chained).toEqual({ success: false, error: 'initial error' });
    });

    test('flatMap should propagate failure from chained function', () => {
      const result = ok(21);
      const chained = flatMap(result, x => err('chained error'));
      
      expect(chained).toEqual({ success: false, error: 'chained error' });
    });

    test('andThen should be alias for flatMap', () => {
      expect(andThen).toBe(flatMap);
    });
  });

  describe('orElse', () => {
    test('orElse should return original on success', () => {
      const result = ok(42);
      const fallback = orElse(result, () => ok(0));
      
      expect(fallback).toEqual({ success: true, value: 42 });
    });

    test('orElse should return fallback on failure', () => {
      const result = err('error');
      const fallback = orElse(result, () => ok(42));
      
      expect(fallback).toEqual({ success: true, value: 42 });
    });

    test('orElse can change error type', () => {
      const result: Result<number, string> = err('string error');
      const fallback = orElse(result, () => err({ code: 404 }));
      
      expect(fallback.success).toBe(false);
      if (!fallback.success) {
        expect(fallback.error).toEqual({ code: 404 });
      }
    });
  });

  describe('match', () => {
    test('match should handle success case', () => {
      const result = ok(42);
      const output = match(result, {
        ok: value => `Success: ${value}`,
        err: error => `Error: ${error}`
      });
      
      expect(output).toBe('Success: 42');
    });

    test('match should handle error case', () => {
      const result = err('failed');
      const output = match(result, {
        ok: value => `Success: ${value}`,
        err: error => `Error: ${error}`
      });
      
      expect(output).toBe('Error: failed');
    });

    test('match can return different types', () => {
      const result = ok(42);
      const output = match(result, {
        ok: value => value * 2,
        err: error => 0
      });
      
      expect(output).toBe(84);
    });
  });

  describe('Promise conversions', () => {
    test('toPromise should resolve for success', async () => {
      const result = ok(42);
      const value = await toPromise(result);
      expect(value).toBe(42);
    });

    test('toPromise should reject for failure', async () => {
      const result = err('error');
      await expect(toPromise(result)).rejects.toBe('error');
    });

    test('fromPromise should convert resolved promise', async () => {
      const promise = Promise.resolve(42);
      const result = await fromPromise(promise);
      
      expect(result).toEqual({ success: true, value: 42 });
    });

    test('fromPromise should convert rejected promise', async () => {
      const promise = Promise.reject('error');
      const result = await fromPromise<number, string>(promise);
      
      expect(result).toEqual({ success: false, error: 'error' });
    });
  });

  describe('Complex scenarios', () => {
    test('should chain multiple operations', () => {
      const parseNumber = (s: string): Result<number> =>
        isNaN(+s) ? err('Not a number') : ok(+s);

      const divide = (a: number, b: number): Result<number> =>
        b === 0 ? err('Division by zero') : ok(a / b);

      const result = flatMap(
        parseNumber('42'),
        x => flatMap(divide(x, 2), y => ok(y * 10))
      );

      expect(result).toEqual({ success: true, value: 210 });
    });

    test('should handle error in chain', () => {
      const parseNumber = (s: string): Result<number> =>
        isNaN(+s) ? err('Not a number') : ok(+s);

      const result = flatMap(parseNumber('abc'), x => ok(x * 2));
      
      expect(result).toEqual({ success: false, error: 'Not a number' });
    });

    test('should combine with map and mapErr', () => {
      const result = ok(10);
      const processed = map(
        mapErr(result, e => `Error: ${e}`),
        v => v * 2
      );
      
      expect(processed).toEqual({ success: true, value: 20 });
    });
  });
});