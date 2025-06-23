import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tokenize } from '../lexer/tokenizer';
import { parse } from '../parser/parser';
import { TokenKind } from '../core/token';

describe('Error Detail Test', () => {
  test('parse full file with error details', () => {
    const testPhpPath = join(__dirname, '../stub/small-test.php');
    const testPhpContent = readFileSync(testPhpPath, 'utf-8');
    
    const tokens = tokenize(testPhpContent);
    const filteredTokens = tokens.filter(t =>
      t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline
    );
    
    
    try {
      const ast = parse(filteredTokens, { errorRecovery: false });
    } catch (error) {
      if (error instanceof Error && 'location' in error) {
        const loc = (error as any).location;
        
        // Find token at error location
        const errorTokenIndex = filteredTokens.findIndex(t => 
          t.location.start.offset >= loc.start.offset
        );
        if (errorTokenIndex >= 0) {
        }
      }
    }
  });
});