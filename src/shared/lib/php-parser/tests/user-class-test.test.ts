import { describe, expect, test } from 'vitest';
import { parsePhp } from './test-helpers';

describe('User Class Test', () => {
  test('simple class with trait use', () => {
    const code = `<?php
class User {
    use Timestampable;
}
`;
    
    const result = parsePhp(code);
    
    if (result.success) {
    }
    
    expect(result.success).toBe(true);
  });
  
  test('class in namespace with trait use', () => {
    const code = `<?php
namespace MyApp\\Models;

trait Timestampable {}

class User {
    use Timestampable;
}
`;
    
    const result = parsePhp(code);
    
    if (result.success) {
    }
    
    expect(result.success).toBe(true);
  });
});