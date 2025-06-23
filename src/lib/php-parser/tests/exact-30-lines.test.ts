import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePhp } from './test-helpers';
import { tokenize } from '../lexer/tokenizer';
import { TokenKind } from '../core/token';

describe('Exact 30 Lines Test', () => {
  test('parse exact first 30 lines', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    const lines = testPhpContent.split('\n');
    const code = lines.slice(0, 35).join('\n');  // Include more lines to close the function
    
    
    // Get tokens
    const tokens = tokenize(code);
    const filteredTokens = tokens.filter(t =>
      t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline
    );
    
    
    // Parse with error recovery off
    const result = parsePhp(code, { errorRecovery: false });
    
    if (result.success) {
    }
  });
});