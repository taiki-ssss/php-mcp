import { describe, expect, test } from 'vitest';
import { tokenize } from '../lexer/tokenizer';
import { parse } from '../parser/parser';
import { TokenKind } from '../core/token';

describe('Trait Error Test', () => {
  test('parse trait with error details', () => {
    const code = `<?php
trait Timestampable {
    private \\DateTime $createdAt;
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