import { describe, expect, test } from 'vitest';
import { parsePhp, tokenizePhp } from '../index.js';

describe('Simple Trait Test', () => {
  test('parse simple trait use with alias', () => {
    const code = `<?php
class Test {
  use MyTrait {
    foo as private;
  }
}`;


    // First tokenize
    const tokens = tokenizePhp(code);
    if (tokens.success) {
    }

    // Then parse
    const result = parsePhp(code, { errorRecovery: false });
    

    expect(result.success).toBe(true);
  });
});