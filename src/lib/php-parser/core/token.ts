/**
 * PHP トークン定義
 * TypeScript の Enum と Discriminated Union で型安全に
 */

import { SourceLocation } from './location.js';

/**
 * トークンの種類
 */
export enum TokenKind {
  // リテラル
  Number = 'Number',
  String = 'String',
  Identifier = 'Identifier',
  Variable = 'Variable',

  // キーワード
  Abstract = 'abstract',
  And = 'and',
  Array = 'array',
  As = 'as',
  Async = 'async',
  Await = 'await',
  Break = 'break',
  Callable = 'callable',
  Case = 'case',
  Catch = 'catch',
  Class = 'class',
  Clone = 'clone',
  Const = 'const',
  Continue = 'continue',
  Declare = 'declare',
  Default = 'default',
  Do = 'do',
  Echo = 'echo',
  Else = 'else',
  ElseIf = 'elseif',
  Empty = 'empty',
  EndDeclare = 'enddeclare',
  EndFor = 'endfor',
  EndForeach = 'endforeach',
  EndIf = 'endif',
  EndSwitch = 'endswitch',
  EndWhile = 'endwhile',
  Enum = 'enum',
  Eval = 'eval',
  Exit = 'exit',
  Extends = 'extends',
  False = 'false',
  Final = 'final',
  Finally = 'finally',
  Fn = 'fn',
  For = 'for',
  Foreach = 'foreach',
  Function = 'function',
  Global = 'global',
  Goto = 'goto',
  If = 'if',
  Implements = 'implements',
  Include = 'include',
  IncludeOnce = 'include_once',
  Instanceof = 'instanceof',
  Insteadof = 'insteadof',
  Interface = 'interface',
  Isset = 'isset',
  List = 'list',
  Match = 'match',
  Namespace = 'namespace',
  New = 'new',
  Null = 'null',
  Or = 'or',
  Print = 'print',
  Private = 'private',
  Protected = 'protected',
  Public = 'public',
  Readonly = 'readonly',
  Require = 'require',
  RequireOnce = 'require_once',
  Return = 'return',
  Static = 'static',
  Switch = 'switch',
  Throw = 'throw',
  Trait = 'trait',
  True = 'true',
  Try = 'try',
  Unset = 'unset',
  Use = 'use',
  Var = 'var',
  While = 'while',
  Xor = 'xor',
  Yield = 'yield',

  // 演算子
  Plus = '+',
  Minus = '-',
  Star = '*',
  Slash = '/',
  Percent = '%',
  StarStar = '**',
  PlusEqual = '+=',
  MinusEqual = '-=',
  StarEqual = '*=',
  SlashEqual = '/=',
  PercentEqual = '%=',
  StarStarEqual = '**=',
  Dot = '.',
  DotEqual = '.=',
  Equal = '=',
  EqualEqual = '==',
  EqualEqualEqual = '===',
  BangEqual = '!=',
  BangEqualEqual = '!==',
  Less = '<',
  Greater = '>',
  LessEqual = '<=',
  GreaterEqual = '>=',
  Spaceship = '<=>',
  Ampersand = '&',
  Pipe = '|',
  Caret = '^',
  Tilde = '~',
  LessLess = '<<',
  GreaterGreater = '>>',
  AmpersandEqual = '&=',
  PipeEqual = '|=',
  CaretEqual = '^=',
  LessLessEqual = '<<=',
  GreaterGreaterEqual = '>>=',
  AmpersandAmpersand = '&&',
  PipePipe = '||',
  Question = '?',
  QuestionQuestion = '??',
  QuestionQuestionEqual = '??=',
  Colon = ':',
  Semicolon = ';',
  Comma = ',',
  Bang = '!',
  At = '@',
  Dollar = '$',
  Arrow = '->',
  QuestionArrow = '?->',
  DoubleArrow = '=>',
  DoubleColon = '::',
  Backslash = '\\',
  Ellipsis = '...',
  PlusPlus = '++',
  MinusMinus = '--',

  // 括弧
  LeftParen = '(',
  RightParen = ')',
  LeftBracket = '[',
  RightBracket = ']',
  LeftBrace = '{',
  RightBrace = '}',

  // 特殊
  OpenTag = '<?php',
  OpenTagEcho = '<?=',
  CloseTag = '?>',
  InlineHTML = 'InlineHTML',
  Comment = 'Comment',
  DocComment = 'DocComment',
  Whitespace = 'Whitespace',
  Newline = 'Newline',

  // 文字列補間
  StringStart = 'StringStart',
  StringMiddle = 'StringMiddle',
  StringEnd = 'StringEnd',

  // 終端
  EOF = 'EOF',
  Unknown = 'Unknown'
}

/**
 * トークンの基本構造
 */
export interface BaseToken {
  readonly kind: TokenKind;
  readonly text: string;
  readonly location: SourceLocation;
}

/**
 * 各トークンタイプの定義
 */
export interface NumberToken extends BaseToken {
  readonly kind: TokenKind.Number;
  readonly value: number;
}

export interface StringToken extends BaseToken {
  readonly kind: TokenKind.String | TokenKind.StringStart | TokenKind.StringMiddle | TokenKind.StringEnd;
  readonly value: string;
  readonly quote: '"' | "'" | '`';
}

export interface IdentifierToken extends BaseToken {
  readonly kind: TokenKind.Identifier;
  readonly name: string;
}

export interface VariableToken extends BaseToken {
  readonly kind: TokenKind.Variable;
  readonly name: string;
}

export interface KeywordToken extends BaseToken {
  readonly kind:
  | TokenKind.Abstract | TokenKind.And | TokenKind.Array | TokenKind.As
  | TokenKind.Break | TokenKind.Callable | TokenKind.Case | TokenKind.Catch
  | TokenKind.Class | TokenKind.Clone | TokenKind.Const | TokenKind.Continue
  | TokenKind.Declare | TokenKind.Default | TokenKind.Do | TokenKind.Echo
  | TokenKind.Else | TokenKind.ElseIf | TokenKind.Empty | TokenKind.EndDeclare
  | TokenKind.EndFor | TokenKind.EndForeach | TokenKind.EndIf | TokenKind.EndSwitch
  | TokenKind.EndWhile | TokenKind.Enum | TokenKind.Eval | TokenKind.Exit
  | TokenKind.Extends | TokenKind.False | TokenKind.Final | TokenKind.Finally
  | TokenKind.Fn | TokenKind.For | TokenKind.Foreach | TokenKind.Function
  | TokenKind.Global | TokenKind.Goto | TokenKind.If | TokenKind.Implements
  | TokenKind.Include | TokenKind.IncludeOnce | TokenKind.Instanceof
  | TokenKind.Insteadof | TokenKind.Interface | TokenKind.Isset | TokenKind.List
  | TokenKind.Match | TokenKind.Namespace | TokenKind.New | TokenKind.Null
  | TokenKind.Or | TokenKind.Print | TokenKind.Private | TokenKind.Protected
  | TokenKind.Public | TokenKind.Readonly | TokenKind.Require | TokenKind.RequireOnce
  | TokenKind.Return | TokenKind.Static | TokenKind.Switch | TokenKind.Throw
  | TokenKind.Trait | TokenKind.True | TokenKind.Try | TokenKind.Unset
  | TokenKind.Use | TokenKind.Var | TokenKind.While | TokenKind.Xor | TokenKind.Yield;
}

export interface OperatorToken extends BaseToken {
  readonly kind:
  | TokenKind.Plus | TokenKind.Minus | TokenKind.Star | TokenKind.Slash
  | TokenKind.Percent | TokenKind.StarStar | TokenKind.PlusEqual
  | TokenKind.MinusEqual | TokenKind.StarEqual | TokenKind.SlashEqual
  | TokenKind.PercentEqual | TokenKind.StarStarEqual | TokenKind.Dot
  | TokenKind.DotEqual | TokenKind.Equal | TokenKind.EqualEqual
  | TokenKind.EqualEqualEqual | TokenKind.BangEqual | TokenKind.BangEqualEqual
  | TokenKind.Less | TokenKind.Greater | TokenKind.LessEqual
  | TokenKind.GreaterEqual | TokenKind.Spaceship | TokenKind.Ampersand
  | TokenKind.Pipe | TokenKind.Caret | TokenKind.Tilde | TokenKind.LessLess
  | TokenKind.GreaterGreater | TokenKind.AmpersandEqual | TokenKind.PipeEqual
  | TokenKind.CaretEqual | TokenKind.LessLessEqual | TokenKind.GreaterGreaterEqual
  | TokenKind.AmpersandAmpersand | TokenKind.PipePipe | TokenKind.Question
  | TokenKind.QuestionQuestion | TokenKind.QuestionQuestionEqual | TokenKind.Colon
  | TokenKind.Semicolon | TokenKind.Comma | TokenKind.Bang | TokenKind.At
  | TokenKind.Dollar | TokenKind.Arrow | TokenKind.QuestionArrow
  | TokenKind.DoubleArrow | TokenKind.DoubleColon | TokenKind.Backslash
  | TokenKind.Ellipsis | TokenKind.PlusPlus | TokenKind.MinusMinus;
}

export interface DelimiterToken extends BaseToken {
  readonly kind:
  | TokenKind.LeftParen | TokenKind.RightParen
  | TokenKind.LeftBracket | TokenKind.RightBracket
  | TokenKind.LeftBrace | TokenKind.RightBrace;
}

export interface SpecialToken extends BaseToken {
  readonly kind:
  | TokenKind.OpenTag | TokenKind.OpenTagEcho | TokenKind.CloseTag
  | TokenKind.InlineHTML | TokenKind.Comment | TokenKind.DocComment
  | TokenKind.Whitespace | TokenKind.Newline | TokenKind.EOF | TokenKind.Unknown;
}

/**
 * 全てのトークンタイプの Union
 */
export type Token =
  | NumberToken
  | StringToken
  | IdentifierToken
  | VariableToken
  | KeywordToken
  | OperatorToken
  | DelimiterToken
  | SpecialToken;

/**
 * トークンを作成するヘルパー関数
 */
export function createToken<T extends Token>(
  kind: T['kind'],
  text: string,
  location: SourceLocation,
  props?: Omit<T, 'kind' | 'text' | 'location'>
): T {
  return {
    kind,
    text,
    location,
    ...props
  } as T;
}

/**
 * キーワードのマップ
 */
export const KEYWORDS = new Map<string, TokenKind>([
  ['abstract', TokenKind.Abstract],
  ['and', TokenKind.And],
  ['array', TokenKind.Array],
  ['as', TokenKind.As],
  ['break', TokenKind.Break],
  ['callable', TokenKind.Callable],
  ['case', TokenKind.Case],
  ['catch', TokenKind.Catch],
  ['class', TokenKind.Class],
  ['clone', TokenKind.Clone],
  ['const', TokenKind.Const],
  ['continue', TokenKind.Continue],
  ['declare', TokenKind.Declare],
  ['default', TokenKind.Default],
  ['do', TokenKind.Do],
  ['echo', TokenKind.Echo],
  ['else', TokenKind.Else],
  ['elseif', TokenKind.ElseIf],
  ['empty', TokenKind.Empty],
  ['enddeclare', TokenKind.EndDeclare],
  ['endfor', TokenKind.EndFor],
  ['endforeach', TokenKind.EndForeach],
  ['endif', TokenKind.EndIf],
  ['endswitch', TokenKind.EndSwitch],
  ['endwhile', TokenKind.EndWhile],
  ['enum', TokenKind.Enum],
  ['eval', TokenKind.Eval],
  ['exit', TokenKind.Exit],
  ['die', TokenKind.Exit], // alias
  ['extends', TokenKind.Extends],
  ['false', TokenKind.False],
  ['final', TokenKind.Final],
  ['finally', TokenKind.Finally],
  ['fn', TokenKind.Fn],
  ['for', TokenKind.For],
  ['foreach', TokenKind.Foreach],
  ['function', TokenKind.Function],
  ['global', TokenKind.Global],
  ['goto', TokenKind.Goto],
  ['if', TokenKind.If],
  ['implements', TokenKind.Implements],
  ['include', TokenKind.Include],
  ['include_once', TokenKind.IncludeOnce],
  ['instanceof', TokenKind.Instanceof],
  ['insteadof', TokenKind.Insteadof],
  ['interface', TokenKind.Interface],
  ['isset', TokenKind.Isset],
  ['list', TokenKind.List],
  ['match', TokenKind.Match],
  ['namespace', TokenKind.Namespace],
  ['new', TokenKind.New],
  ['null', TokenKind.Null],
  ['or', TokenKind.Or],
  ['print', TokenKind.Print],
  ['private', TokenKind.Private],
  ['protected', TokenKind.Protected],
  ['public', TokenKind.Public],
  ['readonly', TokenKind.Readonly],
  ['require', TokenKind.Require],
  ['require_once', TokenKind.RequireOnce],
  ['return', TokenKind.Return],
  ['static', TokenKind.Static],
  ['switch', TokenKind.Switch],
  ['throw', TokenKind.Throw],
  ['trait', TokenKind.Trait],
  ['true', TokenKind.True],
  ['try', TokenKind.Try],
  ['unset', TokenKind.Unset],
  ['use', TokenKind.Use],
  ['var', TokenKind.Var],
  ['while', TokenKind.While],
  ['xor', TokenKind.Xor],
  ['yield', TokenKind.Yield],
  ['__halt_compiler', TokenKind.Exit],
]);

/**
 * トークンが特定の種類かチェック
 */
export function isTokenKind<K extends TokenKind>(
  token: Token,
  kind: K
): token is Extract<Token, { kind: K }> {
  return token.kind === kind;
}