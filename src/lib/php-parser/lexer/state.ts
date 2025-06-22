/**
 * レクサー状態管理
 * 文字列補間やヒアドキュメントなどの複雑な状態を管理
 */

import { Token, TokenKind } from '../core/token.js';

/**
 * レクサーの状態タイプ
 */
export enum LexerState {
  /** 通常の PHP コード */
  Normal = 'Normal',
  /** ダブルクォート文字列内 */
  InDoubleQuoteString = 'InDoubleQuoteString',
  /** ヒアドキュメント内 */
  InHeredoc = 'InHeredoc',
  /** 文字列内の変数展開 */
  InStringInterpolation = 'InStringInterpolation',
  /** バックティック（シェル実行）内 */
  InBacktick = 'InBacktick',
  /** 複雑な変数展開 ${...} 内 */
  InComplexInterpolation = 'InComplexInterpolation'
}

/**
 * 文字列補間のコンテキスト
 */
export interface StringContext {
  /** 文字列の種類 */
  type: 'double' | 'heredoc' | 'backtick';
  /** 終了デリミタ */
  delimiter?: string;
  /** ネストレベル */
  nestLevel: number;
  /** 補間の深さ */
  interpolationDepth: number;
}

/**
 * レクサー状態マネージャー
 */
export class LexerStateManager {
  private stateStack: LexerState[] = [LexerState.Normal];
  private stringContextStack: StringContext[] = [];

  /**
   * 現在の状態を取得
   */
  get currentState(): LexerState {
    return this.stateStack[this.stateStack.length - 1];
  }

  /**
   * 現在の文字列コンテキストを取得
   */
  get currentStringContext(): StringContext | undefined {
    return this.stringContextStack[this.stringContextStack.length - 1];
  }

  /**
   * 新しい状態をプッシュ
   */
  pushState(state: LexerState, context?: StringContext): void {
    this.stateStack.push(state);
    if (context) {
      this.stringContextStack.push(context);
    }
  }

  /**
   * 状態をポップ
   */
  popState(): LexerState | undefined {
    if (this.stateStack.length > 1) {
      const state = this.stateStack.pop();

      // 文字列関連の状態の場合、コンテキストもポップ
      if (state && this.isStringState(state)) {
        this.stringContextStack.pop();
      }

      return state;
    }
    return undefined;
  }

  /**
   * 文字列関連の状態かチェック
   */
  private isStringState(state: LexerState): boolean {
    return state === LexerState.InDoubleQuoteString ||
      state === LexerState.InHeredoc ||
      state === LexerState.InBacktick ||
      state === LexerState.InStringInterpolation ||
      state === LexerState.InComplexInterpolation;
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.stateStack = [LexerState.Normal];
    this.stringContextStack = [];
  }

  /**
   * トークンによる状態遷移
   */
  transitionByToken(token: Token): void {
    switch (this.currentState) {
      case LexerState.Normal:
        this.handleNormalState(token);
        break;

      case LexerState.InDoubleQuoteString:
      case LexerState.InHeredoc:
      case LexerState.InBacktick:
        this.handleStringState(token);
        break;

      case LexerState.InStringInterpolation:
        this.handleInterpolationState(token);
        break;

      case LexerState.InComplexInterpolation:
        this.handleComplexInterpolationState(token);
        break;
    }
  }

  /**
   * 通常状態でのトークン処理
   */
  private handleNormalState(token: Token): void {
    switch (token.kind) {
      case TokenKind.String:
        if ('quote' in token && token.quote === '"') {
          // ダブルクォート文字列の開始
          this.pushState(LexerState.InDoubleQuoteString, {
            type: 'double',
            nestLevel: 0,
            interpolationDepth: 0
          });
        }
        break;

      // ヒアドキュメントやバックティックの処理も同様に実装
    }
  }

  /**
   * 文字列状態でのトークン処理
   */
  private handleStringState(token: Token): void {
    const context = this.currentStringContext;
    if (!context) return;

    // 変数の開始をチェック
    if (token.kind === TokenKind.Variable) {
      this.pushState(LexerState.InStringInterpolation);
      context.interpolationDepth++;
    }

    // ${...} の開始をチェック
    if (token.kind === TokenKind.Dollar && this.peekNextToken()?.kind === TokenKind.LeftBrace) {
      this.pushState(LexerState.InComplexInterpolation);
      context.nestLevel++;
    }

    // 文字列の終了をチェック
    if (token.kind === TokenKind.StringEnd) {
      this.popState();
    }
  }

  /**
   * 補間状態でのトークン処理
   */
  private handleInterpolationState(token: Token): void {
    // 補間の終了条件をチェック
    if (!this.isInterpolationContinuation(token)) {
      this.popState();
      const context = this.currentStringContext;
      if (context) {
        context.interpolationDepth--;
      }
    }
  }

  /**
   * 複雑な補間状態でのトークン処理
   */
  private handleComplexInterpolationState(token: Token): void {
    const context = this.currentStringContext;
    if (!context) return;

    if (token.kind === TokenKind.LeftBrace) {
      context.nestLevel++;
    } else if (token.kind === TokenKind.RightBrace) {
      context.nestLevel--;
      if (context.nestLevel === 0) {
        this.popState();
      }
    }
  }

  /**
   * 補間が継続するかチェック
   */
  private isInterpolationContinuation(token: Token): boolean {
    // 変数の後に続く可能性のあるトークン
    return token.kind === TokenKind.LeftBracket ||  // 配列アクセス
      token.kind === TokenKind.Arrow ||         // プロパティアクセス
      token.kind === TokenKind.DoubleColon;     // 静的アクセス
  }

  /**
   * 次のトークンをプレビュー（実装は tokenizer に依存）
   */
  private peekNextToken(): Token | undefined {
    // この機能は tokenizer との連携が必要
    return undefined;
  }

  /**
   * 現在の状態に基づいて期待されるトークンを取得
   */
  getExpectedTokens(): Set<TokenKind> {
    const expected = new Set<TokenKind>();

    switch (this.currentState) {
      case LexerState.Normal:
        // すべての通常トークンが可能
        break;

      case LexerState.InDoubleQuoteString:
      case LexerState.InHeredoc:
        expected.add(TokenKind.StringMiddle);
        expected.add(TokenKind.Variable);
        expected.add(TokenKind.Dollar);
        expected.add(TokenKind.StringEnd);
        break;

      case LexerState.InComplexInterpolation:
        // 式として有効なすべてのトークン
        break;
    }

    return expected;
  }
}

/**
 * 文字列補間トークナイザー
 * 文字列内の変数展開を処理
 */
export class StringInterpolationTokenizer {
  /**
   * 文字列を補間トークンに分解
   */
  static tokenizeInterpolatedString(
    content: string,
    quoteType: '"' | "'" | 'heredoc' | 'nowdoc'
  ): Token[] {
    const tokens: Token[] = [];

    if (quoteType === "'" || quoteType === 'nowdoc') {
      // 補間なし
      return tokens;
    }

    // 簡易的な実装：実際はもっと複雑
    let current = '';
    let i = 0;

    while (i < content.length) {
      if (content[i] === '$' && i + 1 < content.length) {
        // 変数の可能性をチェック
        if (content[i + 1] === '{' || /[a-zA-Z_]/.test(content[i + 1])) {
          // 現在の文字列部分をトークン化
          if (current) {
            // StringMiddle トークンを作成
            current = '';
          }

          // 変数部分を処理
          if (content[i + 1] === '{') {
            // ${...} 形式
            i += 2; // ${ をスキップ
            // 複雑な式の処理
          } else {
            // $var 形式
            i++; // $ をスキップ
            // 変数名を読み取り
          }
          continue;
        }
      }

      current += content[i];
      i++;
    }

    // 残りの文字列部分
    if (current) {
      // StringMiddle トークンを作成
    }

    return tokens;
  }
}