import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tokenize } from '../lexer/tokenizer';
import { TokenKind } from '../core/token';

describe('Trace parseDeclaration', () => {
  test('trace why namespace is not matched', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    
    // Get tokens
    const allTokens = tokenize(testPhpContent);
    
    // Filter tokens like test-helpers does
    const filteredTokens = allTokens.filter(t =>
      t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline
    );
    
    
    // Show first 20 filtered tokens
    
    // Check if namespace token exists in filtered tokens
    const namespaceTokenIndex = filteredTokens.findIndex(t => t.kind === TokenKind.Namespace);
    
    if (namespaceTokenIndex >= 0) {
    }
    
    // Check what happens after PHP tag
    const phpTagIndex = filteredTokens.findIndex(t => t.kind === TokenKind.OpenTag);
  });
});