import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePhp } from './test-helpers';

describe('Parse test.php incrementally', () => {
  const testPhpPath = join(__dirname, '../stub/small-test.php');
  const testPhpContent = readFileSync(testPhpPath, 'utf-8');
  const lines = testPhpContent.split('\n');

  test('parse lines 0-150', () => {
    const partial = lines.slice(0, 150).join('\n');
    const result = parsePhp(partial);
    expect(result.success).toBe(true);
  });

  test('parse lines 0-175', () => {
    const partial = lines.slice(0, 175).join('\n');
    const result = parsePhp(partial);
    expect(result.success).toBe(true);
  });

  test('parse lines 0-180', () => {
    const partial = lines.slice(0, 180).join('\n');
    const result = parsePhp(partial);
    expect(result.success).toBe(true);
  });

  test('parse lines 0-185', () => {
    const partial = lines.slice(0, 185).join('\n');
    const result = parsePhp(partial);
    expect(result.success).toBe(true);
  });

  test('parse lines 0-190', () => {
    const partial = lines.slice(0, 190).join('\n');
    const result = parsePhp(partial);
    expect(result.success).toBe(true);
  });

  test('parse lines 0-195', () => {
    const partial = lines.slice(0, 195).join('\n');
    const result = parsePhp(partial);
    expect(result.success).toBe(true);
  });

  test('parse lines 0-200', () => {
    const partial = lines.slice(0, 200).join('\n');
    const result = parsePhp(partial);
    expect(result.success).toBe(true);
  });

  test('print lines 175-200', () => {
  });
});