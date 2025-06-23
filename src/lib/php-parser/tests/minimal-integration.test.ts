import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Minimal Integration Test', () => {
  test('can read test.php', () => {
    const testPhpPath = join(__dirname, '../stub/test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    expect(testPhpContent).toBeTruthy();
    expect(testPhpContent.length).toBeGreaterThan(100);
  });

  test('can import parsePhp', async () => {
    const { parsePhp } = await import('../index.js');
    expect(typeof parsePhp).toBe('function');
  });

  test('can parse simple PHP', async () => {
    const { parsePhp } = await import('../index.js');
    const result = parsePhp('<?php echo "Hello";');
    expect(result.success).toBe(true);
  });
});