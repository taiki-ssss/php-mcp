// Test helpers to avoid circular dependencies
import { tokenize, type TokenizerOptions } from '../lexer/tokenizer';
import { parse, type ParserOptions } from '../parser/parser';
import type { PhpProgram } from '../core/ast';
import type { Token } from '../core/token';
import { TokenKind } from '../core/token';
import { Result, ok, err } from '../utils/result';

export function tokenizePhp(
  source: string,
  options?: TokenizerOptions
): Result<Token[]> {
  try {
    const tokens = tokenize(source, options);
    return ok(tokens);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
}

export function parsePhp(
  source: string,
  options?: ParserOptions & TokenizerOptions
): Result<PhpProgram> {
  try {
    const tokens = tokenize(source, options);
    // Filter out whitespace and newline tokens before parsing
    const nonWhitespaceTokens = tokens.filter(t =>
      t.kind !== TokenKind.Whitespace && 
      t.kind !== TokenKind.Newline && 
      t.kind !== TokenKind.Comment &&
      t.kind !== TokenKind.DocComment
    );
    const program = parse(nonWhitespaceTokens, options);
    return ok(program);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
}

// Re-export analyzer functions directly to avoid circular dependencies