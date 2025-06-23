import { describe, expect, test } from 'vitest';
import { createPosition, createLocation, formatLocation, mergeLocations } from '../core/location';

describe('Location utilities', () => {
  describe('createPosition', () => {
    test('should create position with all parameters', () => {
      const pos = createPosition(5, 10, 50);
      expect(pos).toEqual({
        line: 5,
        column: 10,
        offset: 50
      });
    });

    test('should create position with custom offset', () => {
      const pos = createPosition(3, 8, 42);
      expect(pos).toEqual({
        line: 3,
        column: 8,
        offset: 42
      });
    });
  });

  describe('mergeLocations', () => {
    test('should merge two locations', () => {
      const first = createLocation(
        createPosition(1, 1, 0),
        createPosition(2, 5, 20),
        'file1.php'
      );
      const second = createLocation(
        createPosition(3, 1, 25),
        createPosition(4, 10, 40)
      );
      
      const merged = mergeLocations(first, second);
      
      expect(merged).toEqual({
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 4, column: 10, offset: 40 },
        source: 'file1.php'
      });
    });

    test('should prefer first source over second', () => {
      const first = createLocation(
        createPosition(1, 1, 0),
        createPosition(2, 5, 20),
        'first.php'
      );
      const second = createLocation(
        createPosition(3, 1, 25),
        createPosition(4, 10, 40),
        'second.php'
      );
      
      const merged = mergeLocations(first, second);
      expect(merged.source).toBe('first.php');
    });

    test('should use second source if first has none', () => {
      const first = createLocation(
        createPosition(1, 1, 0),
        createPosition(2, 5, 20)
      );
      const second = createLocation(
        createPosition(3, 1, 25),
        createPosition(4, 10, 40),
        'second.php'
      );
      
      const merged = mergeLocations(first, second);
      expect(merged.source).toBe('second.php');
    });
  });

  describe('createLocation', () => {
    test('should create location without source', () => {
      const location = createLocation(
        createPosition(2, 3, 10),
        createPosition(4, 7, 30)
      );
      
      expect(location).toEqual({
        start: { line: 2, column: 3, offset: 10 },
        end: { line: 4, column: 7, offset: 30 }
      });
    });

    test('should create location with source', () => {
      const location = createLocation(
        createPosition(1, 1, 0),
        createPosition(2, 5, 15),
        '/path/to/file.php'
      );
      
      expect(location).toEqual({
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 2, column: 5, offset: 15 },
        source: '/path/to/file.php'
      });
    });
  });

  describe('formatLocation', () => {
    test('should format location without source', () => {
      const location = createLocation(
        createPosition(10, 15, 100),
        createPosition(10, 20, 105)
      );
      
      expect(formatLocation(location)).toBe('10:15');
    });

    test('should format location with source', () => {
      const location = createLocation(
        createPosition(5, 8, 50),
        createPosition(5, 12, 54),
        'test.php'
      );
      
      expect(formatLocation(location)).toBe('test.php:5:8');
    });

    test('should handle empty source string', () => {
      const location = createLocation(
        createPosition(3, 4, 30),
        createPosition(3, 8, 34),
        ''
      );
      
      expect(formatLocation(location)).toBe('3:4');
    });
  });
});