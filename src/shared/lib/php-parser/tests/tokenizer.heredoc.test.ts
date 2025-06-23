/**
 * Heredoc/Nowdocのトークナイザーテスト
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../lexer/tokenizer.js';
import { TokenKind } from '../core/token.js';

describe('Tokenizer - Heredoc/Nowdoc', () => {
  it('基本的なHeredocをトークン化', () => {
    const code = `<?php
$str = <<<EOD
Hello World
This is a heredoc
EOD;
`;
    const tokens = tokenize(code, { preserveWhitespace: false });
    
    const relevantTokens = tokens.filter(t => 
      t.kind !== TokenKind.Whitespace && 
      t.kind !== TokenKind.Newline &&
      t.kind !== TokenKind.OpenTag
    );


    expect(relevantTokens[0]).toMatchObject({ kind: TokenKind.Variable, text: '$str' });
    expect(relevantTokens[1]).toMatchObject({ kind: TokenKind.Equal, text: '=' });
    expect(relevantTokens[2]).toMatchObject({ kind: TokenKind.StartHeredoc, text: '<<<EOD' });
    expect(relevantTokens[3]).toMatchObject({ kind: TokenKind.EncapsedAndWhitespace });
    expect(relevantTokens[3].text).toContain('Hello World');
    expect(relevantTokens[3].text).toContain('This is a heredoc');
    expect(relevantTokens[4]).toMatchObject({ kind: TokenKind.EndHeredoc, text: 'EOD' });
    if (relevantTokens[5]) {
      expect(relevantTokens[5]).toMatchObject({ kind: TokenKind.Semicolon, text: ';' });
    }
  });

  it('基本的なNowdocをトークン化', () => {
    const code = `<?php
$str = <<<'EOD'
Hello World
This is a nowdoc
$var is not interpolated
EOD;
`;
    const tokens = tokenize(code, { preserveWhitespace: false });
    
    const relevantTokens = tokens.filter(t => 
      t.kind !== TokenKind.Whitespace && 
      t.kind !== TokenKind.Newline &&
      t.kind !== TokenKind.OpenTag
    );

    expect(relevantTokens[0]).toMatchObject({ kind: TokenKind.Variable, text: '$str' });
    expect(relevantTokens[1]).toMatchObject({ kind: TokenKind.Equal, text: '=' });
    expect(relevantTokens[2]).toMatchObject({ kind: TokenKind.StartHeredoc, text: "<<<'EOD'" });
    expect(relevantTokens[3]).toMatchObject({ kind: TokenKind.EncapsedAndWhitespace });
    expect(relevantTokens[3].text).toContain('Hello World');
    expect(relevantTokens[3].text).toContain('$var is not interpolated');
    expect(relevantTokens[4]).toMatchObject({ kind: TokenKind.EndHeredoc, text: 'EOD' });
    expect(relevantTokens[5]).toMatchObject({ kind: TokenKind.Semicolon, text: ';' });
  });

  it('空のHeredocをトークン化', () => {
    const code = `<?php
$str = <<<EOD
EOD;
`;
    const tokens = tokenize(code, { preserveWhitespace: false });
    
    const relevantTokens = tokens.filter(t => 
      t.kind !== TokenKind.Whitespace && 
      t.kind !== TokenKind.Newline &&
      t.kind !== TokenKind.OpenTag
    );

    expect(relevantTokens[0]).toMatchObject({ kind: TokenKind.Variable, text: '$str' });
    expect(relevantTokens[1]).toMatchObject({ kind: TokenKind.Equal, text: '=' });
    expect(relevantTokens[2]).toMatchObject({ kind: TokenKind.StartHeredoc, text: '<<<EOD' });
    expect(relevantTokens[3]).toMatchObject({ kind: TokenKind.EndHeredoc, text: 'EOD' });
    expect(relevantTokens[4]).toMatchObject({ kind: TokenKind.Semicolon, text: ';' });
  });

  it('複数行のHeredocをトークン化', () => {
    const code = `<?php
$sql = <<<SQL
SELECT *
FROM users
WHERE id = 1
  AND status = 'active'
SQL;
`;
    const tokens = tokenize(code, { preserveWhitespace: false });
    
    const relevantTokens = tokens.filter(t => 
      t.kind !== TokenKind.Whitespace && 
      t.kind !== TokenKind.Newline &&
      t.kind !== TokenKind.OpenTag
    );

    expect(relevantTokens[0]).toMatchObject({ kind: TokenKind.Variable, text: '$sql' });
    expect(relevantTokens[1]).toMatchObject({ kind: TokenKind.Equal, text: '=' });
    expect(relevantTokens[2]).toMatchObject({ kind: TokenKind.StartHeredoc, text: '<<<SQL' });
    expect(relevantTokens[3]).toMatchObject({ kind: TokenKind.EncapsedAndWhitespace });
    expect(relevantTokens[3].text).toContain('SELECT *');
    expect(relevantTokens[3].text).toContain('FROM users');
    expect(relevantTokens[3].text).toContain('WHERE id = 1');
    expect(relevantTokens[3].text).toContain("AND status = 'active'");
    expect(relevantTokens[4]).toMatchObject({ kind: TokenKind.EndHeredoc, text: 'SQL' });
    expect(relevantTokens[5]).toMatchObject({ kind: TokenKind.Semicolon, text: ';' });
  });

  it('セミコロンなしの終了ラベル', () => {
    const code = `<?php
$str = <<<EOD
Hello World
EOD
echo $str;
`;
    const tokens = tokenize(code, { preserveWhitespace: false });
    
    const relevantTokens = tokens.filter(t => 
      t.kind !== TokenKind.Whitespace && 
      t.kind !== TokenKind.Newline &&
      t.kind !== TokenKind.OpenTag
    );

    expect(relevantTokens[0]).toMatchObject({ kind: TokenKind.Variable, text: '$str' });
    expect(relevantTokens[1]).toMatchObject({ kind: TokenKind.Equal, text: '=' });
    expect(relevantTokens[2]).toMatchObject({ kind: TokenKind.StartHeredoc, text: '<<<EOD' });
    expect(relevantTokens[3]).toMatchObject({ kind: TokenKind.EncapsedAndWhitespace });
    expect(relevantTokens[3].text).toContain('Hello World');
    expect(relevantTokens[4]).toMatchObject({ kind: TokenKind.EndHeredoc, text: 'EOD' });
    expect(relevantTokens[5]).toMatchObject({ kind: TokenKind.Echo, text: 'echo' });
    expect(relevantTokens[6]).toMatchObject({ kind: TokenKind.Variable, text: '$str' });
    expect(relevantTokens[7]).toMatchObject({ kind: TokenKind.Semicolon, text: ';' });
  });
});