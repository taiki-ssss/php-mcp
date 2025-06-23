import { describe, expect, test } from 'vitest';
import { parsePhp } from './test-helpers';

describe('Interface Parsing', () => {
  test('simple interface', () => {
    const code = `<?php
interface PaymentInterface {
    public function processPayment(float $amount): bool;
}
`;
    
    const result = parsePhp(code);
    
    if (result.success) {
    }
    
    expect(result.success).toBe(true);
  });
  
  test('interface in namespace', () => {
    const code = `<?php
namespace MyApp;

interface PaymentInterface {}
`;
    
    const result = parsePhp(code);
    
    if (result.success) {
    }
    
    expect(result.success).toBe(true);
  });
});