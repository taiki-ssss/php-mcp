import { describe, expect, test } from 'vitest';
import { tokenize } from '../lexer/tokenizer';
import { parse } from '../parser/parser';
import { TokenKind } from '../core/token';

describe('Error Test', () => {
  test('parse interface with error recovery off', () => {
    const code = `<?php
interface PaymentInterface {
    public function processPayment(float $amount): bool;
}
`;
    
    const tokens = tokenize(code);
    const filteredTokens = tokens.filter(t =>
      t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline
    );
    
    
    try {
      const ast = parse(filteredTokens, { errorRecovery: false });
    } catch (error) {
    }
  });
});