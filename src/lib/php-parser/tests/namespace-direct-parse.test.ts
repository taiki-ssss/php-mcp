import { describe, expect, test } from 'vitest';
import { tokenize } from '../lexer/tokenizer';
import { parse } from '../parser/parser';

describe('Direct Namespace Parsing', () => {
  test('should parse namespace without filtering tokens', () => {
    const code = `<?php
namespace MyApp\\Models;

use Exception;

interface PaymentInterface {
    public function processPayment(float $amount): bool;
}

class User implements PaymentInterface {
    private int $id;
    
    public function processPayment(float $amount): bool {
        return true;
    }
}
`;
    
    // Tokenize
    const tokens = tokenize(code);
    
    // Parse without filtering
    const ast = parse(tokens);
    
    // Check first statement
    expect(ast.statements[0]?.type).toBe('NamespaceDeclaration');
  });
  
  test('should parse with filtered tokens', () => {
    const code = `<?php
namespace MyApp\\Models;

use Exception;

class User {}
`;
    
    // Tokenize
    const tokens = tokenize(code);
    
    // Filter whitespace and newlines
    const filteredTokens = tokens.filter(t => 
      t.kind !== 'Whitespace' && t.kind !== 'Newline'
    );
    
    
    // Parse filtered tokens
    const ast = parse(filteredTokens);
    
    // This might fail if parser expects whitespace tokens
    expect(ast.statements[0]?.type).toBe('NamespaceDeclaration');
  });
});