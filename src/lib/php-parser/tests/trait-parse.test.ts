import { describe, expect, test } from 'vitest';
import { parsePhp } from './test-helpers';

describe('Trait Parsing', () => {
  test('simple trait', () => {
    const code = `<?php
trait Timestampable {
    private \\DateTime $createdAt;
}
`;
    
    const result = parsePhp(code);
    
    if (result.success) {
    }
    
    expect(result.success).toBe(true);
  });
  
  test('trait with error recovery off', () => {
    const code = `<?php
trait Timestampable {
    private \\DateTime $createdAt;
}
`;
    
    try {
      const result = parsePhp(code, { errorRecovery: false });
    } catch (error) {
    }
  });
});