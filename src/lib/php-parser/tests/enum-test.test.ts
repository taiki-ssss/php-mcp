import { describe, expect, test } from 'vitest';
import { parsePhp } from './test-helpers';

describe('Enum Test', () => {
  test('simple enum', () => {
    const code = `<?php
enum Status: string {
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
}
`;
    
    const result = parsePhp(code);
    
    if (result.success) {
    }
    
    expect(result.success).toBe(true);
  });
  
  test('enum in namespace', () => {
    const code = `<?php
namespace MyApp\\Models;

enum Status: string {
    case ACTIVE = 'active';
}
`;
    
    const result = parsePhp(code);
    
    if (result.success) {
    }
    
    expect(result.success).toBe(true);
  });
});