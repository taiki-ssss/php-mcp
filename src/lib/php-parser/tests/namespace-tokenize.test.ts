import { describe, expect, test } from 'vitest';
import { tokenizePhp } from './test-helpers';

describe('Namespace Tokenization Debug', () => {
  test('should tokenize namespace statement', () => {
    const code = `<?php
namespace MyApp\\Models;

use Exception;

interface PaymentInterface {
    public function processPayment(float $amount): bool;
}
`;
    
    const result = tokenizePhp(code);
    expect(result.success).toBe(true);
    if (!result.success) return;
    
    // Find namespace-related tokens
    const namespaceTokens = result.value.filter(t => 
      t.type === 'T_NAMESPACE' || 
      (t.text && t.text.includes('MyApp')) ||
      (t.text && t.text.includes('Models'))
    );
    
    
    // Check if T_NAMESPACE token exists
    const hasNamespaceToken = result.value.some(t => t.type === 'T_NAMESPACE');
    expect(hasNamespaceToken).toBe(true);
    
    // Print first 20 tokens
  });
});