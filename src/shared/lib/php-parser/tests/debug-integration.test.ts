import { describe, expect, test } from 'vitest';

describe('Debug Integration', () => {
  test('simple test', () => {
    expect(1 + 1).toBe(2);
  });

  test('can import modules', async () => {
    const { parsePhp } = await import('../index.js');
    expect(typeof parsePhp).toBe('function');
  });

  test('can read file', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    
    const testPhpPath = join(__dirname, '../stub/test.php');
    const exists = require('fs').existsSync(testPhpPath);
    expect(exists).toBe(true);
  });
});