/**
 * PHP トークナイザー
 * Scanner を使用して PHP コードをトークン列に変換
 */

import { Token, TokenKind, KEYWORDS, createToken } from '../core/token.js';
import { SourceLocation, SourcePosition, createLocation } from '../core/location.js';
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

  constructor(source: string, options: TokenizerOptions = {}) {
    this.scanner = new Scanner(source);
    this.options = {
      preserveComments: options.preserveComments ?? true,
      preserveWhitespace: options.preserveWhitespace ?? false,
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

    // EOF トークンを追加
    const eofPos = this.scanner.getCurrentPosition();
    tokens.push(createToken(
      TokenKind.EOF,
      '',
      createLocation(eofPos, eofPos)
    ));

    return tokens;
  }

  /**
   * トークンを保持すべきか判定
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
   * 次のトークンを取得
   */
  private nextToken(): Token {
    const start = this.scanner.getCurrentPosition();

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

    // # コメント
    if (char === '#') {
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

    // 数値
    if (CharUtils.isDigit(char)) {
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
   * PHP タグ外のスキャン
   */
  private scanOutsidePhp(start: SourcePosition): Token {
    // <?php タグをチェック
    if (this.scanner.matches('<?php')) {
      this.scanner.skip(5);
      this.inPhpTag = true;
      return this.makeToken(TokenKind.OpenTag, '<?php', start);
    }

    // <?= タグをチェック
    if (this.scanner.matches('<?=')) {
      this.scanner.skip(3);
      this.inPhpTag = true;
      return this.makeToken(TokenKind.OpenTagEcho, '<?=', start);
    }

    // <? タグをチェック（short_open_tag）
    if (this.scanner.matches('<?') && !this.scanner.matches('<?xml')) {
      this.scanner.skip(2);
      this.inPhpTag = true;
      return this.makeToken(TokenKind.OpenTag, '<?', start);
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
   * 単一行コメント
   */
  private scanSingleLineComment(start: SourcePosition): Token {
    this.scanner.skip(2); // //
    const content = this.scanner.consumeUntil(char => CharUtils.isNewline(char));
    return this.makeToken(TokenKind.Comment, '//' + content, start);
  }

  /**
   * 複数行コメント
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
   * # コメント
   */
  private scanHashComment(start: SourcePosition): Token {
    this.scanner.advance(); // #
    const content = this.scanner.consumeUntil(char => CharUtils.isNewline(char));
    return this.makeToken(TokenKind.Comment, '#' + content, start);
  }

  /**
   * 文字列リテラル
   */
  private scanString(start: SourcePosition): Token {
    const quote = this.scanner.advance();
    let value = '';
    let raw = quote;

    while (!this.scanner.isAtEnd() && this.scanner.peek() !== quote) {
      if (this.scanner.peek() === '\\') {
        raw += this.scanner.advance();
        raw += this.scanner.advance();
        // エスケープシーケンスの処理は後で
      } else {
        const char = this.scanner.advance();
        value += char;
        raw += char;
      }
    }

    if (this.scanner.peek() === quote) {
      raw += this.scanner.advance();
    }

    return createToken(
      TokenKind.String,
      raw,
      createLocation(start, this.scanner.getCurrentPosition()),
      { value, quote: quote as '"' | "'" }
    );
  }

  /**
   * バックティック文字列（シェル実行）
   */
  private scanBacktickString(start: SourcePosition): Token {
    return this.scanString(start);
  }

  /**
   * Heredoc/Nowdoc
   */
  private scanHeredoc(start: SourcePosition): Token {
    this.scanner.skip(3); // <<<
    this.scanner.consumeWhile(char => CharUtils.isWhitespace(char));

    const isNowdoc = this.scanner.peek() === "'";
    if (isNowdoc) this.scanner.advance();

    const label = this.scanner.consumeWhile(char => CharUtils.isIdentifierPart(char));

    if (isNowdoc) this.scanner.consume("'");

    // 改行まで読み飛ばす
    this.scanner.consumeUntil(char => CharUtils.isNewline(char));
    this.scanner.advance();

    // 終了ラベルまで読む
    let content = '';
    let lineStart = true;

    while (!this.scanner.isAtEnd()) {
      // 行頭でのみ終了ラベルをチェック
      if (lineStart && this.scanner.matches(label)) {
        // 行頭の終了ラベルをチェック
        const savedState = this.scanner.save();
        this.scanner.skip(label.length);

        // ラベルの後は改行か ; のみ許可
        const next = this.scanner.peek();
        if (CharUtils.isNewline(next) || next === ';') {
          this.scanner.restore(savedState);
          this.scanner.skip(label.length);
          if (next === ';') this.scanner.advance();
          break;
        }

        this.scanner.restore(savedState);
      }

      const char = this.scanner.advance();
      content += char;

      // 改行後は行頭
      lineStart = CharUtils.isNewline(char);
    }

    return createToken(
      TokenKind.String,
      content,
      createLocation(start, this.scanner.getCurrentPosition()),
      { value: content, quote: isNowdoc ? "'" : '"' }
    );
  }

  /**
   * 数値リテラル
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

    // アンダースコアを除去して数値に変換
    const cleanText = text.replace(/_/g, '');
    const value = Number(cleanText);

    return createToken(
      TokenKind.Number,
      text,
      createLocation(start, this.scanner.getCurrentPosition()),
      { value }
    );
  }

  /**
   * 10進数のスキャン
   */
  private scanDecimalNumber(): string {
    let text = this.scanDigits(char => CharUtils.isDigit(char) || char === '_');

    // 小数部
    if (this.scanner.peek() === '.' && CharUtils.isDigit(this.scanner.peek(1))) {
      text += this.scanner.advance();
      text += this.scanDigits(char => CharUtils.isDigit(char) || char === '_');
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
   * 数字列のスキャン
   */
  private scanDigits(predicate: (char: string) => boolean): string {
    return this.scanner.consumeWhile(predicate);
  }

  /**
   * 変数
   */
  private scanVariable(start: SourcePosition): Token {
    let text = this.scanner.advance(); // $

    // ${expr} 形式
    if (this.scanner.peek() === '{') {
      // パーサーで処理
      return this.makeToken(TokenKind.Dollar, text, start);
    }

    // 通常の変数名
    text += this.scanner.consumeWhile(char => CharUtils.isIdentifierPart(char));

    return createToken(
      TokenKind.Variable,
      text,
      createLocation(start, this.scanner.getCurrentPosition()),
      { name: text.slice(1) }
    );
  }

  /**
   * 識別子またはキーワード
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
      createLocation(start, this.scanner.getCurrentPosition()),
      { name: text }
    );
  }

  /**
   * 演算子・記号
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
   * トークンを作成
   */
  private makeToken(kind: TokenKind, text: string, start: SourcePosition): Token {
    const location = createLocation(start, this.scanner.getCurrentPosition());
    
    // 各トークンタイプに応じて適切なプロパティを追加
    switch (kind) {
      case TokenKind.Number:
        return createToken(kind, text, location, { value: Number(text) });
      
      case TokenKind.String:
      case TokenKind.StringStart:
      case TokenKind.StringMiddle:
      case TokenKind.StringEnd:
        return createToken(kind, text, location, { value: text, quote: '"' });
      
      case TokenKind.Identifier:
        return createToken(kind, text, location, { name: text });
      
      case TokenKind.Variable:
        return createToken(kind, text, location, { name: text.slice(1) });
      
      default:
        // その他のトークンは追加プロパティなし
        return createToken(kind as any, text, location);
    }
  }
}

/**
 * 便利な関数：文字列をトークン化
 */
export function tokenize(source: string, options?: TokenizerOptions): Token[] {
  const tokenizer = new Tokenizer(source, options);
  return tokenizer.tokenize();
}