/**
 * PHP Tokenizer Module
 * 
 * Converts PHP source code into a stream of tokens using the Scanner.
 * 
 * @module tokenizer
 */

import { Token, TokenKind, KEYWORDS, createToken } from '../core/token.js';
import { SourcePosition, createLocation } from '../core/location.js';
import { Scanner, CharUtils } from './scanner.js';

/**
 * トークナイザーのオプション
 */
export interface TokenizerOptions {
  /** コメントを保持するか */
  preserveComments?: boolean;
  /** 空白を保持するか */
  preserveWhitespace?: boolean;
  /** PHP タグ外の HTML を保持するか */
  preserveInlineHTML?: boolean;
}

/**
 * PHP コードをトークン化
 */
export class Tokenizer {
  private scanner: Scanner;
  private options: Required<TokenizerOptions>;
  private inPhpTag = false;
  private pendingHeredoc: {
    label: string;
    isNowdoc: boolean;
    startToken: Token;
  } | null = null;

  constructor(source: string, options: TokenizerOptions = {}) {
    this.scanner = new Scanner(source);
    this.options = {
      preserveComments: options.preserveComments ?? true,
      preserveWhitespace: options.preserveWhitespace ?? true,
      preserveInlineHTML: options.preserveInlineHTML ?? true
    };
  }

  /**
   * 全てのトークンを取得
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.scanner.isAtEnd()) {
      const token = this.nextToken();

      // フィルタリング
      if (!this.shouldKeepToken(token)) {
        continue;
      }

      tokens.push(token);
    }

    // EOF トークンを追加しない（PHP互換性のため）

    return tokens;
  }

  /**
   * Determines whether a token should be kept based on options.
   * 
   * @private
   * @param token - The token to check
   * @returns True if the token should be kept
   */
  private shouldKeepToken(token: Token): boolean {
    switch (token.kind) {
      case TokenKind.Comment:
      case TokenKind.DocComment:
        return this.options.preserveComments;
      case TokenKind.Whitespace:
      case TokenKind.Newline:
        return this.options.preserveWhitespace;
      case TokenKind.InlineHTML:
        return this.options.preserveInlineHTML;
      default:
        return true;
    }
  }

  /**
   * Gets the next token from the source.
   * 
   * @private
   * @returns The next token
   */
  private nextToken(): Token {
    const start = this.scanner.getCurrentPosition();

    // Heredoc/Nowdocの内容処理中
    if (this.pendingHeredoc) {
      const content = this.scanHeredocContent();
      if (content) return content;
    }

    // PHP タグ外の処理
    if (!this.inPhpTag) {
      return this.scanOutsidePhp(start);
    }

    // 空白スキップ
    const whitespace = this.scanner.consumeWhile((char: string) =>
      CharUtils.isWhitespace(char) && !CharUtils.isNewline(char)
    );
    if (whitespace) {
      return this.makeToken(TokenKind.Whitespace, whitespace, start);
    }

    // 改行
    if (CharUtils.isNewline(this.scanner.peek())) {
      const newline = this.scanner.advance();
      // Windows CRLF 対応
      if (newline === '\r' && this.scanner.peek() === '\n') {
        this.scanner.advance();
        return this.makeToken(TokenKind.Newline, '\r\n', start);
      }
      return this.makeToken(TokenKind.Newline, newline, start);
    }

    const char = this.scanner.peek();

    // コメント
    if (char === '/') {
      const next = this.scanner.peek(1);
      if (next === '/') {
        return this.scanSingleLineComment(start);
      } else if (next === '*') {
        return this.scanMultiLineComment(start);
      }
    }

    // # コメントまたは属性
    if (char === '#') {
      // 属性のチェック（#[）
      if (this.scanner.peek(1) === '[') {
        return this.scanAttribute(start);
      }
      return this.scanHashComment(start);
    }

    // 文字列
    if (char === '"' || char === "'") {
      return this.scanString(start);
    }

    // バックティック（シェル実行）
    if (char === '`') {
      return this.scanBacktickString(start);
    }

    // Heredoc/Nowdoc
    if (char === '<' && this.scanner.peek(1) === '<' && this.scanner.peek(2) === '<') {
      return this.scanHeredoc(start);
    }

    // 数値（.25のような小数点で始まる数値も対応）
    if (CharUtils.isDigit(char) || (char === '.' && CharUtils.isDigit(this.scanner.peek(1)))) {
      return this.scanNumber(start);
    }

    // 変数
    if (char === '$') {
      return this.scanVariable(start);
    }

    // 識別子・キーワード
    if (CharUtils.isIdentifierStart(char)) {
      return this.scanIdentifierOrKeyword(start);
    }

    // 演算子・記号
    return this.scanOperatorOrPunctuation(start);
  }

  /**
   * Scans content outside PHP tags (inline HTML).
   * 
   * @private
   * @param start - Starting position
   * @returns InlineHTML or PHP opening tag token
   */
  private scanOutsidePhp(start: SourcePosition): Token {
    // <?php タグをチェック
    if (this.scanner.matches('<?php')) {
      this.scanner.skip(5);
      // タグの後の空白文字を含める
      let tagText = '<?php';
      if (this.scanner.peek() === ' ' || this.scanner.peek() === '\t') {
        tagText += this.scanner.advance();
      }
      this.inPhpTag = true;
      return this.makeToken(TokenKind.OpenTag, tagText, start);
    }

    // <?= タグをチェック
    if (this.scanner.matches('<?=')) {
      this.scanner.skip(3);
      // タグの後の空白文字を含める
      let tagText = '<?=';
      if (this.scanner.peek() === ' ' || this.scanner.peek() === '\t') {
        tagText += this.scanner.advance();
      }
      this.inPhpTag = true;
      return this.makeToken(TokenKind.OpenTagEcho, tagText, start);
    }

    // <? タグをチェック（short_open_tag）
    if (this.scanner.matches('<?') && !this.scanner.matches('<?xml')) {
      this.scanner.skip(2);
      // タグの後の空白文字を含める
      let tagText = '<?';
      if (this.scanner.peek() === ' ' || this.scanner.peek() === '\t') {
        tagText += this.scanner.advance();
      }
      this.inPhpTag = true;
      return this.makeToken(TokenKind.OpenTag, tagText, start);
    }

    // インライン HTML
    const html = this.scanner.consumeUntil(char =>
      this.scanner.matches('<?php') ||
      this.scanner.matches('<?=') ||
      (this.scanner.matches('<?') && !this.scanner.matches('<?xml'))
    );

    return this.makeToken(TokenKind.InlineHTML, html || this.scanner.advance(), start);
  }

  /**
   * Scans a single-line comment (// style).
   * 
   * @private
   * @param start - Starting position
   * @returns Comment token
   */
  private scanSingleLineComment(start: SourcePosition): Token {
    this.scanner.skip(2); // //
    const content = this.scanner.consumeUntil(char => CharUtils.isNewline(char));
    return this.makeToken(TokenKind.Comment, '//' + content, start);
  }

  /**
   * Scans a multi-line comment (block comment style).
   * Distinguishes between regular comments and doc comments.
   * 
   * @private
   * @param start - Starting position
   * @returns Comment or DocComment token
   */
  private scanMultiLineComment(start: SourcePosition): Token {
    this.scanner.skip(2); // /*
    let content = '/*';
    let isDocComment = this.scanner.peek() === '*' && this.scanner.peek(1) !== '/';

    while (!this.scanner.isAtEnd()) {
      if (this.scanner.matches('*/')) {
        content += '*/';
        this.scanner.skip(2);
        break;
      }
      content += this.scanner.advance();
    }

    return this.makeToken(
      isDocComment ? TokenKind.DocComment : TokenKind.Comment,
      content,
      start
    );
  }

  /**
   * Scans a hash comment (# style).
   * 
   * @private
   * @param start - Starting position
   * @returns Comment token
   */
  private scanHashComment(start: SourcePosition): Token {
    this.scanner.advance(); // #
    const content = this.scanner.consumeUntil(char => CharUtils.isNewline(char));
    return this.makeToken(TokenKind.Comment, '#' + content, start);
  }

  /**
   * Scans a string literal (single or double quoted).
   * Handles escape sequences.
   * 
   * @private
   * @param start - Starting position
   * @returns String token
   */
  private scanString(start: SourcePosition): Token {
    const quote = this.scanner.advance();
    let raw = quote;

    while (!this.scanner.isAtEnd() && this.scanner.peek() !== quote) {
      if (this.scanner.peek() === '\\') {
        raw += this.scanner.advance();
        if (!this.scanner.isAtEnd()) {
          raw += this.scanner.advance();
        }
      } else {
        raw += this.scanner.advance();
      }
    }

    if (this.scanner.peek() === quote) {
      raw += this.scanner.advance();
    }

    return createToken(
      TokenKind.String,
      raw,
      createLocation(start, this.scanner.getCurrentPosition())
    );
  }

  /**
   * Scans a backtick string (shell execution).
   * 
   * @private
   * @param start - Starting position
   * @returns String token for shell execution
   */
  private scanBacktickString(start: SourcePosition): Token {
    return this.scanString(start);
  }

  /**
   * Scans the start of a Heredoc or Nowdoc.
   * Sets up pending heredoc state for content scanning.
   * 
   * @private
   * @param start - Starting position
   * @returns StartHeredoc token
   */
  private scanHeredoc(start: SourcePosition): Token {
    // Heredoc/Nowdocのラベルを解析
    this.scanner.skip(3); // <<<
    this.scanner.consumeWhile(char => CharUtils.isWhitespace(char));

    const isNowdoc = this.scanner.peek() === "'";
    if (isNowdoc) this.scanner.advance();

    const label = this.scanner.consumeWhile(char => CharUtils.isIdentifierPart(char));

    if (isNowdoc) this.scanner.consume("'");

    const startText = `<<<${isNowdoc ? "'" : ""}${label}${isNowdoc ? "'" : ""}`;

    // 改行まで読み飛ばす
    this.scanner.consumeUntil((char: string) => CharUtils.isNewline(char));
    if (!this.scanner.isAtEnd()) this.scanner.advance();

    // StartHeredocトークンを作成
    const startToken = createToken(
      TokenKind.StartHeredoc,
      startText,
      createLocation(start, this.scanner.getCurrentPosition())
    );

    // Heredoc/Nowdocの内容を保存
    this.pendingHeredoc = {
      label,
      isNowdoc,
      startToken
    };

    return startToken;
  }

  /**
   * Scans the content of a Heredoc or Nowdoc.
   * Called after StartHeredoc token to process content.
   * 
   * @private
   * @returns EncapsedAndWhitespace or EndHeredoc token, or null
   */
  private scanHeredocContent(): Token | null {
    if (!this.pendingHeredoc) return null;

    const { label } = this.pendingHeredoc;
    const start = this.scanner.getCurrentPosition();

    // 内容を収集
    let content = '';
    let lineStart = this.scanner.getCurrentPosition().column === 1;

    while (!this.scanner.isAtEnd()) {
      // 行頭でのみ終了ラベルをチェック
      if (lineStart && this.scanner.matches(label)) {
        const savedState = this.scanner.save();
        this.scanner.skip(label.length);

        // ラベルの後は改行か ; のみ許可
        const next = this.scanner.peek();
        if (CharUtils.isNewline(next) || next === ';') {
          // 終了ラベルの前に内容があれば、それを返す
          if (content.length > 0) {
            this.scanner.restore(savedState);
            return createToken(
              TokenKind.EncapsedAndWhitespace,
              content,
              createLocation(start, this.scanner.getCurrentPosition())
            );
          }

          // 終了ラベルを処理
          const endToken = createToken(
            TokenKind.EndHeredoc,
            label,
            createLocation(start, this.scanner.getCurrentPosition())
          );
          
          this.pendingHeredoc = null;
          return endToken;
        }

        this.scanner.restore(savedState);
      }

      const char = this.scanner.advance();
      content += char;

      // 改行後は行頭
      lineStart = CharUtils.isNewline(char);
    }

    // EOF に達した場合
    if (content.length > 0) {
      const token = createToken(
        TokenKind.EncapsedAndWhitespace,
        content,
        createLocation(start, this.scanner.getCurrentPosition())
      );
      this.pendingHeredoc = null;
      return token;
    }

    this.pendingHeredoc = null;
    return null;
  }

  /**
   * Scans a numeric literal.
   * Supports decimal, hexadecimal, binary, and octal formats.
   * 
   * @private
   * @param start - Starting position
   * @returns Number token
   */
  private scanNumber(start: SourcePosition): Token {
    let text = '';

    // 0x, 0b, 0o プレフィックスチェック
    if (this.scanner.peek() === '0') {
      const next = this.scanner.peek(1);
      if (next === 'x' || next === 'X') {
        // 16進数
        text = this.scanner.advance() + this.scanner.advance();
        text += this.scanDigits(char => CharUtils.isHexDigit(char) || char === '_');
      } else if (next === 'b' || next === 'B') {
        // 2進数
        text = this.scanner.advance() + this.scanner.advance();
        text += this.scanDigits(char => CharUtils.isBinaryDigit(char) || char === '_');
      } else if (next === 'o' || next === 'O') {
        // 8進数（明示的）
        text = this.scanner.advance() + this.scanner.advance();
        text += this.scanDigits(char => CharUtils.isOctalDigit(char) || char === '_');
      } else if (CharUtils.isOctalDigit(next)) {
        // 8進数（暗黙的）
        text = this.scanner.advance();
        text += this.scanDigits(char => CharUtils.isOctalDigit(char) || char === '_');
      } else {
        // 通常の10進数
        text = this.scanDecimalNumber();
      }
    } else {
      text = this.scanDecimalNumber();
    }

    return createToken(
      TokenKind.Number,
      text,
      createLocation(start, this.scanner.getCurrentPosition())
    );
  }

  /**
   * Scans a decimal number.
   * Handles integers, floats, and scientific notation.
   * 
   * @private
   * @returns The numeric string
   */
  private scanDecimalNumber(): string {
    let text = '';
    
    // 小数点で始まる場合（.25など）
    if (this.scanner.peek() === '.') {
      text += this.scanner.advance();
      text += this.scanDigits(char => CharUtils.isDigit(char) || char === '_');
    } else {
      // 整数部
      text = this.scanDigits(char => CharUtils.isDigit(char) || char === '_');
      
      // 小数部
      if (this.scanner.peek() === '.' && CharUtils.isDigit(this.scanner.peek(1))) {
        text += this.scanner.advance();
        text += this.scanDigits(char => CharUtils.isDigit(char) || char === '_');
      }
    }

    // 指数部
    const exp = this.scanner.peek();
    if (exp === 'e' || exp === 'E') {
      const sign = this.scanner.peek(1);
      if (sign === '+' || sign === '-' || CharUtils.isDigit(sign)) {
        text += this.scanner.advance();
        if (sign === '+' || sign === '-') {
          text += this.scanner.advance();
        }
        text += this.scanDigits(char => CharUtils.isDigit(char) || char === '_');
      }
    }

    return text;
  }

  /**
   * Scans a sequence of digits based on a predicate.
   * 
   * @private
   * @param predicate - Function to test if a character is a valid digit
   * @returns The digit string
   */
  private scanDigits(predicate: (char: string) => boolean): string {
    return this.scanner.consumeWhile(predicate);
  }

  /**
   * Scans a variable name.
   * Handles simple variables ($var) and complex forms (${expr}, $$var).
   * 
   * @private
   * @param start - Starting position
   * @returns Variable token
   */
  private scanVariable(start: SourcePosition): Token {
    let text = this.scanner.advance(); // $

    // ${expr} 形式または$$ (variable variable)
    if (this.scanner.peek() === '{' || this.scanner.peek() === '$') {
      // パーサーで処理
      return this.makeToken(TokenKind.Dollar, text, start);
    }

    // 通常の変数名
    text += this.scanner.consumeWhile(char => CharUtils.isIdentifierPart(char));

    return createToken(
      TokenKind.Variable,
      text,
      createLocation(start, this.scanner.getCurrentPosition())
    );
  }

  /**
   * Scans an identifier or keyword.
   * Checks if the identifier is a reserved keyword.
   * 
   * @private
   * @param start - Starting position
   * @returns Identifier or Keyword token
   */
  private scanIdentifierOrKeyword(start: SourcePosition): Token {
    const text = this.scanner.consumeWhile(char => CharUtils.isIdentifierPart(char));

    // キーワードチェック
    const keywordKind = KEYWORDS.get(text.toLowerCase());
    if (keywordKind) {
      return this.makeToken(keywordKind, text, start);
    }

    // 識別子
    return createToken(
      TokenKind.Identifier,
      text,
      createLocation(start, this.scanner.getCurrentPosition())
    );
  }

  /**
   * Scans operators and punctuation.
   * Handles multi-character operators (===, <=>, etc.).
   * 
   * @private
   * @param start - Starting position
   * @returns Operator or delimiter token
   */
  private scanOperatorOrPunctuation(start: SourcePosition): Token {
    const char = this.scanner.peek();
    const next = this.scanner.peek(1);
    const next2 = this.scanner.peek(2);

    // 3文字演算子
    const three = char + next + next2;
    switch (three) {
      case '===':
        this.scanner.skip(3);
        return this.makeToken(TokenKind.EqualEqualEqual, three, start);
      case '!==':
        this.scanner.skip(3);
        return this.makeToken(TokenKind.BangEqualEqual, three, start);
      case '<<=':
        this.scanner.skip(3);
        return this.makeToken(TokenKind.LessLessEqual, three, start);
      case '>>=':
        this.scanner.skip(3);
        return this.makeToken(TokenKind.GreaterGreaterEqual, three, start);
      case '**=':
        this.scanner.skip(3);
        return this.makeToken(TokenKind.StarStarEqual, three, start);
      case '<=>':
        this.scanner.skip(3);
        return this.makeToken(TokenKind.Spaceship, three, start);
      case '??=':
        this.scanner.skip(3);
        return this.makeToken(TokenKind.QuestionQuestionEqual, three, start);
      case '...':
        this.scanner.skip(3);
        return this.makeToken(TokenKind.Ellipsis, three, start);
    }

    // 2文字演算子
    const two = char + next;
    switch (two) {
      case '++':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.PlusPlus, two, start);
      case '--':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.MinusMinus, two, start);
      case '==':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.EqualEqual, two, start);
      case '!=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.BangEqual, two, start);
      case '<=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.LessEqual, two, start);
      case '>=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.GreaterEqual, two, start);
      case '<<':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.LessLess, two, start);
      case '>>':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.GreaterGreater, two, start);
      case '&&':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.AmpersandAmpersand, two, start);
      case '||':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.PipePipe, two, start);
      case '??':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.QuestionQuestion, two, start);
      case '->':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.Arrow, two, start);
      case '=>':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.DoubleArrow, two, start);
      case '::':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.DoubleColon, two, start);
      case '+=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.PlusEqual, two, start);
      case '-=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.MinusEqual, two, start);
      case '*=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.StarEqual, two, start);
      case '/=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.SlashEqual, two, start);
      case '%=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.PercentEqual, two, start);
      case '.=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.DotEqual, two, start);
      case '&=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.AmpersandEqual, two, start);
      case '|=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.PipeEqual, two, start);
      case '^=':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.CaretEqual, two, start);
      case '**':
        this.scanner.skip(2);
        return this.makeToken(TokenKind.StarStar, two, start);
      case '?>':
        // PHP 終了タグ
        this.scanner.skip(2);
        this.inPhpTag = false;
        return this.makeToken(TokenKind.CloseTag, two, start);
    }

    // ?-> (null-safe)
    if (char === '?' && next === '-' && next2 === '>') {
      this.scanner.skip(3);
      return this.makeToken(TokenKind.QuestionArrow, '?->', start);
    }

    // 1文字演算子・記号
    this.scanner.advance();
    switch (char) {
      case '+': return this.makeToken(TokenKind.Plus, char, start);
      case '-': return this.makeToken(TokenKind.Minus, char, start);
      case '*': return this.makeToken(TokenKind.Star, char, start);
      case '/': return this.makeToken(TokenKind.Slash, char, start);
      case '%': return this.makeToken(TokenKind.Percent, char, start);
      case '.': return this.makeToken(TokenKind.Dot, char, start);
      case '=': return this.makeToken(TokenKind.Equal, char, start);
      case '<': return this.makeToken(TokenKind.Less, char, start);
      case '>': return this.makeToken(TokenKind.Greater, char, start);
      case '&': return this.makeToken(TokenKind.Ampersand, char, start);
      case '|': return this.makeToken(TokenKind.Pipe, char, start);
      case '^': return this.makeToken(TokenKind.Caret, char, start);
      case '~': return this.makeToken(TokenKind.Tilde, char, start);
      case '!': return this.makeToken(TokenKind.Bang, char, start);
      case '?': return this.makeToken(TokenKind.Question, char, start);
      case ':': return this.makeToken(TokenKind.Colon, char, start);
      case ';': return this.makeToken(TokenKind.Semicolon, char, start);
      case ',': return this.makeToken(TokenKind.Comma, char, start);
      case '@': return this.makeToken(TokenKind.At, char, start);
      case '$': return this.makeToken(TokenKind.Dollar, char, start);
      case '\\': return this.makeToken(TokenKind.Backslash, char, start);
      case '(': return this.makeToken(TokenKind.LeftParen, char, start);
      case ')': return this.makeToken(TokenKind.RightParen, char, start);
      case '[': return this.makeToken(TokenKind.LeftBracket, char, start);
      case ']': return this.makeToken(TokenKind.RightBracket, char, start);
      case '{': return this.makeToken(TokenKind.LeftBrace, char, start);
      case '}': return this.makeToken(TokenKind.RightBrace, char, start);
      default: return this.makeToken(TokenKind.Unknown, char, start);
    }
  }

  /**
   * Scans a PHP 8+ attribute (#[...]).
   * Handles nested brackets.
   * 
   * @private
   * @param start - Starting position
   * @returns Attribute token
   */
  private scanAttribute(start: SourcePosition): Token {
    this.scanner.skip(2); // #[
    let text = '#[';
    let depth = 1;

    while (!this.scanner.isAtEnd() && depth > 0) {
      const char = this.scanner.advance();
      text += char;
      
      if (char === '[') {
        depth++;
      } else if (char === ']') {
        depth--;
      }
    }

    return createToken(
      TokenKind.Attribute,
      text,
      createLocation(start, this.scanner.getCurrentPosition())
    );
  }

  /**
   * Creates a token with the given properties.
   * 
   * @private
   * @param kind - Token kind
   * @param text - Token text
   * @param start - Starting position
   * @returns Created token
   */
  private makeToken(kind: TokenKind, text: string, start: SourcePosition): Token {
    const location = createLocation(start, this.scanner.getCurrentPosition());
    
    // createToken関数を使用してトークンを作成
    return createToken(kind, text, location);
  }
}

/**
 * Convenience function to tokenize PHP source code.
 * 
 * @param source - PHP source code
 * @param options - Tokenizer options
 * @returns Array of tokens
 */
export function tokenize(source: string, options?: TokenizerOptions): Token[] {
  const tokenizer = new Tokenizer(source, options);
  return tokenizer.tokenize();
}