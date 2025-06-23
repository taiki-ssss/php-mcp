/**
 * PHP Token Definitions Module
 * 
 * Provides type-safe token definitions using TypeScript's Enum
 * and Discriminated Unions for the PHP parser.
 * 
 * @module token
 */

import { SourceLocation } from './location.js';

/**
 * Token kinds enumeration.
 * 
 * Defines all possible token types in PHP including:
 * - Literals (numbers, strings, identifiers)
 * - Keywords (if, class, function, etc.)
 * - Operators (+, -, ==, etc.)
 * - Delimiters (parentheses, brackets, braces)
 * - Special tokens (PHP tags, comments, etc.)
 */
export enum TokenKind {
  // Literals
  Number = 'Number',
  String = 'String',
  Identifier = 'Identifier',
  Variable = 'Variable',

  // Keywords
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

  // Operators
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

  // Delimiters
  LeftParen = '(',
  RightParen = ')',
  LeftBracket = '[',
  RightBracket = ']',
  LeftBrace = '{',
  RightBrace = '}',

  // Special
  OpenTag = '<?php',
  OpenTagEcho = '<?=',
  CloseTag = '?>',
  InlineHTML = 'InlineHTML',
  Comment = 'Comment',
  DocComment = 'DocComment',
  Whitespace = 'Whitespace',
  Newline = 'Newline',

  // String interpolation
  StringStart = 'StringStart',
  StringMiddle = 'StringMiddle',
  StringEnd = 'StringEnd',
  
  // Heredoc/Nowdoc
  StartHeredoc = 'StartHeredoc',
  EndHeredoc = 'EndHeredoc',
  EncapsedAndWhitespace = 'EncapsedAndWhitespace',
  
  // Attributes
  Attribute = 'Attribute',

  // Termination
  EOF = 'EOF',
  Unknown = 'Unknown'
}

/**
 * Base token interface.
 * 
 * All tokens share these common properties.
 */
export interface BaseToken {
  /** Token kind discriminator */
  readonly kind: TokenKind;
  /** Raw text of the token */
  readonly text: string;
  /** Source location information */
  readonly location: SourceLocation;
  /** PHP-compatible token type (e.g., T_STRING) */
  readonly type?: string;
  /** PHP-compatible token value */
  readonly value?: string | number;
}

/**
 * Number token interface.
 * 
 * Represents integer and floating-point literals.
 */
export interface NumberToken extends BaseToken {
  readonly kind: TokenKind.Number;
  /** Numeric value (preserved as string for precision) */
  readonly value: string | number;
}

/**
 * String token interface.
 * 
 * Represents string literals including interpolated strings.
 */
export interface StringToken extends BaseToken {
  readonly kind: TokenKind.String | TokenKind.StringStart | TokenKind.StringMiddle | TokenKind.StringEnd;
  /** Interpreted string value */
  readonly value: string;
  /** Quote character used */
  readonly quote: '"' | "'" | '`';
}

/**
 * Identifier token interface.
 * 
 * Represents names (class names, function names, etc.).
 */
export interface IdentifierToken extends BaseToken {
  readonly kind: TokenKind.Identifier;
  /** Identifier name */
  readonly name: string;
}

/**
 * Variable token interface.
 * 
 * Represents variable names (without the $ prefix).
 */
export interface VariableToken extends BaseToken {
  readonly kind: TokenKind.Variable;
  /** Variable name (without $) */
  readonly name: string;
}

/**
 * Keyword token interface.
 * 
 * Represents PHP reserved keywords.
 */
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

/**
 * Operator token interface.
 * 
 * Represents all PHP operators (arithmetic, logical, etc.).
 */
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

/**
 * Delimiter token interface.
 * 
 * Represents parentheses, brackets, and braces.
 */
export interface DelimiterToken extends BaseToken {
  readonly kind:
  | TokenKind.LeftParen | TokenKind.RightParen
  | TokenKind.LeftBracket | TokenKind.RightBracket
  | TokenKind.LeftBrace | TokenKind.RightBrace;
}

/**
 * Special token interface.
 * 
 * Represents PHP tags, comments, whitespace, and other special tokens.
 */
export interface SpecialToken extends BaseToken {
  readonly kind:
  | TokenKind.OpenTag | TokenKind.OpenTagEcho | TokenKind.CloseTag
  | TokenKind.InlineHTML | TokenKind.Comment | TokenKind.DocComment
  | TokenKind.Whitespace | TokenKind.Newline | TokenKind.EOF | TokenKind.Unknown
  | TokenKind.StartHeredoc | TokenKind.EndHeredoc | TokenKind.EncapsedAndWhitespace
  | TokenKind.Attribute;
}

/**
 * Union type of all token types.
 * 
 * This is the main token type used throughout the parser.
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
 * Keyword mapping table.
 * 
 * Maps lowercase keyword strings to their corresponding TokenKind.
 * Used by the tokenizer to identify reserved words.
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
 * Type guard to check if a token is of a specific kind.
 * 
 * @param token - The token to check
 * @param kind - The expected token kind
 * @returns True if the token is of the specified kind
 * 
 * @example
 * ```typescript
 * if (isTokenKind(token, TokenKind.Identifier)) {
 *   console.log(token.name); // TypeScript knows token has name
 * }
 * ```
 */
export function isTokenKind<K extends TokenKind>(
  token: Token,
  kind: K
): token is Extract<Token, { kind: K }> {
  return token.kind === kind;
}

/**
 * Creates a token with the specified properties.
 * 
 * @param kind - The token kind
 * @param text - The raw text of the token
 * @param location - The source location
 * @returns A new token instance
 */
export function createToken(kind: TokenKind, text: string, location: SourceLocation): Token {
  return createExtendedToken(kind, text, location);
}

/**
 * PHP-compatible token type mapping.
 * 
 * Maps TokenKind values to PHP's T_* constants for compatibility
 * with PHP's token_get_all() function.
 */
export const TOKEN_TYPE_MAP: Partial<Record<TokenKind, string>> = {
  // PHP tags
  [TokenKind.OpenTag]: 'T_OPEN_TAG',
  [TokenKind.OpenTagEcho]: 'T_OPEN_TAG_WITH_ECHO',
  [TokenKind.CloseTag]: 'T_CLOSE_TAG',
  [TokenKind.InlineHTML]: 'T_INLINE_HTML',
  
  // Keywords
  [TokenKind.If]: 'T_IF',
  [TokenKind.Else]: 'T_ELSE',
  [TokenKind.ElseIf]: 'T_ELSEIF',
  [TokenKind.While]: 'T_WHILE',
  [TokenKind.Do]: 'T_DO',
  [TokenKind.For]: 'T_FOR',
  [TokenKind.Foreach]: 'T_FOREACH',
  [TokenKind.Function]: 'T_FUNCTION',
  [TokenKind.Class]: 'T_CLASS',
  [TokenKind.Interface]: 'T_INTERFACE',
  [TokenKind.Trait]: 'T_TRAIT',
  [TokenKind.Public]: 'T_PUBLIC',
  [TokenKind.Private]: 'T_PRIVATE',
  [TokenKind.Protected]: 'T_PROTECTED',
  [TokenKind.Echo]: 'T_ECHO',
  [TokenKind.Return]: 'T_RETURN',
  [TokenKind.Break]: 'T_BREAK',
  [TokenKind.Continue]: 'T_CONTINUE',
  [TokenKind.Try]: 'T_TRY',
  [TokenKind.Catch]: 'T_CATCH',
  [TokenKind.Finally]: 'T_FINALLY',
  [TokenKind.Throw]: 'T_THROW',
  [TokenKind.New]: 'T_NEW',
  [TokenKind.Static]: 'T_STATIC',
  [TokenKind.Abstract]: 'T_ABSTRACT',
  [TokenKind.Final]: 'T_FINAL',
  [TokenKind.Const]: 'T_CONST',
  [TokenKind.Namespace]: 'T_NAMESPACE',
  [TokenKind.Use]: 'T_USE',
  [TokenKind.As]: 'T_AS',
  [TokenKind.Extends]: 'T_EXTENDS',
  [TokenKind.Implements]: 'T_IMPLEMENTS',
  [TokenKind.Array]: 'T_ARRAY',
  [TokenKind.Isset]: 'T_ISSET',
  [TokenKind.Empty]: 'T_EMPTY',
  [TokenKind.Unset]: 'T_UNSET',
  [TokenKind.List]: 'T_LIST',
  [TokenKind.Switch]: 'T_SWITCH',
  [TokenKind.Case]: 'T_CASE',
  [TokenKind.Default]: 'T_DEFAULT',
  [TokenKind.Match]: 'T_MATCH',
  [TokenKind.Fn]: 'T_FN',
  [TokenKind.And]: 'T_LOGICAL_AND',
  [TokenKind.Or]: 'T_LOGICAL_OR',
  [TokenKind.Xor]: 'T_LOGICAL_XOR',
  
  // Literals and identifiers
  [TokenKind.Variable]: 'T_VARIABLE',
  [TokenKind.String]: 'T_CONSTANT_ENCAPSED_STRING',
  [TokenKind.StringStart]: 'T_START_HEREDOC',
  [TokenKind.StringEnd]: 'T_END_HEREDOC',
  [TokenKind.StartHeredoc]: 'T_START_HEREDOC',
  [TokenKind.EndHeredoc]: 'T_END_HEREDOC',
  [TokenKind.EncapsedAndWhitespace]: 'T_ENCAPSED_AND_WHITESPACE',
  [TokenKind.Number]: 'T_LNUMBER',
  [TokenKind.Identifier]: 'T_STRING',
  
  // Operators
  [TokenKind.EqualEqual]: 'T_IS_EQUAL',
  [TokenKind.BangEqual]: 'T_IS_NOT_EQUAL',
  [TokenKind.EqualEqualEqual]: 'T_IS_IDENTICAL',
  [TokenKind.BangEqualEqual]: 'T_IS_NOT_IDENTICAL',
  [TokenKind.LessEqual]: 'T_IS_SMALLER_OR_EQUAL',
  [TokenKind.GreaterEqual]: 'T_IS_GREATER_OR_EQUAL',
  [TokenKind.AmpersandAmpersand]: 'T_BOOLEAN_AND',
  [TokenKind.PipePipe]: 'T_BOOLEAN_OR',
  [TokenKind.QuestionQuestion]: 'T_COALESCE',
  [TokenKind.Spaceship]: 'T_SPACESHIP',
  [TokenKind.DoubleColon]: 'T_DOUBLE_COLON',
  [TokenKind.Arrow]: 'T_OBJECT_OPERATOR',
  [TokenKind.QuestionArrow]: 'T_NULLSAFE_OBJECT_OPERATOR',
  [TokenKind.DoubleArrow]: 'T_DOUBLE_ARROW',
  [TokenKind.PlusEqual]: 'T_PLUS_EQUAL',
  [TokenKind.MinusEqual]: 'T_MINUS_EQUAL',
  [TokenKind.StarEqual]: 'T_MUL_EQUAL',
  [TokenKind.SlashEqual]: 'T_DIV_EQUAL',
  [TokenKind.DotEqual]: 'T_CONCAT_EQUAL',
  [TokenKind.PercentEqual]: 'T_MOD_EQUAL',
  [TokenKind.AmpersandEqual]: 'T_AND_EQUAL',
  [TokenKind.PipeEqual]: 'T_OR_EQUAL',
  [TokenKind.CaretEqual]: 'T_XOR_EQUAL',
  [TokenKind.LessLessEqual]: 'T_SL_EQUAL',
  [TokenKind.GreaterGreaterEqual]: 'T_SR_EQUAL',
  [TokenKind.StarStarEqual]: 'T_POW_EQUAL',
  [TokenKind.QuestionQuestionEqual]: 'T_COALESCE_EQUAL',
  [TokenKind.PlusPlus]: 'T_INC',
  [TokenKind.MinusMinus]: 'T_DEC',
  [TokenKind.LessLess]: 'T_SL',
  [TokenKind.GreaterGreater]: 'T_SR',
  [TokenKind.Instanceof]: 'T_INSTANCEOF',
  [TokenKind.StarStar]: 'T_POW',
  
  // Others
  [TokenKind.Comment]: 'T_COMMENT',
  [TokenKind.DocComment]: 'T_DOC_COMMENT',
  [TokenKind.Whitespace]: 'T_WHITESPACE',
  [TokenKind.Newline]: 'T_WHITESPACE',
  [TokenKind.EOF]: 'T_EOF',
  [TokenKind.Backslash]: 'T_NS_SEPARATOR',
  [TokenKind.Attribute]: 'T_ATTRIBUTE',
  
  // Symbols (without PHP token types)
  [TokenKind.LeftParen]: '(',
  [TokenKind.RightParen]: ')',
  [TokenKind.LeftBracket]: '[',
  [TokenKind.RightBracket]: ']',
  [TokenKind.LeftBrace]: '{',
  [TokenKind.RightBrace]: '}',
  [TokenKind.Plus]: '+',
  [TokenKind.Minus]: '-',
  [TokenKind.Star]: '*',
  [TokenKind.Slash]: '/',
  [TokenKind.Percent]: '%',
  [TokenKind.Dot]: '.',
  [TokenKind.Equal]: '=',
  [TokenKind.Less]: '<',
  [TokenKind.Greater]: '>',
  [TokenKind.Ampersand]: '&',
  [TokenKind.Pipe]: '|',
  [TokenKind.Caret]: '^',
  [TokenKind.Tilde]: '~',
  [TokenKind.Question]: '?',
  [TokenKind.Colon]: ':',
  [TokenKind.Semicolon]: ';',
  [TokenKind.Comma]: ',',
  [TokenKind.Bang]: '!',
  [TokenKind.At]: '@',
  [TokenKind.Dollar]: 'T_DOLLAR',
  [TokenKind.Unknown]: 'T_UNKNOWN',
};

/**
 * Creates an extended token with additional type-specific properties.
 * 
 * This function handles the creation of specialized token types
 * with their unique properties (e.g., NumberToken with value,
 * StringToken with quote type, etc.).
 * 
 * @param kind - The token kind
 * @param text - The raw text of the token
 * @param location - The source location
 * @param data - Optional additional data for specialized tokens
 * @returns A properly typed token instance
 */
export function createExtendedToken(
  kind: TokenKind,
  text: string,
  location: SourceLocation,
  data?: any
): Token {
  // Determine if number is integer or float
  let phpType = TOKEN_TYPE_MAP[kind] || kind;
  if (kind === TokenKind.Number) {
    // Check if it's a floating point number
    if (text.includes('.') || text.toLowerCase().includes('e')) {
      phpType = 'T_DNUMBER';
    } else {
      phpType = 'T_LNUMBER';
    }
  }
  
  const base = {
    kind,
    text,
    location,
    type: phpType,
    value: text
  };

  // Return appropriate type based on token kind
  switch (kind) {
    case TokenKind.Number:
      // Value property holds original text (PHP tokenizer compatible)
      return { ...base, kind, value: text, type: phpType } as NumberToken;
    
    case TokenKind.String:
    case TokenKind.StringStart:
    case TokenKind.StringMiddle:
    case TokenKind.StringEnd:
      return { ...base, kind: kind as any, value: data?.value ?? text, quote: data?.quote ?? '"' } as StringToken;
    
    case TokenKind.Identifier:
      return { ...base, kind, name: data?.name ?? text } as IdentifierToken;
    
    case TokenKind.Variable:
      return { ...base, kind, name: data?.name ?? text.slice(1) } as VariableToken;
    
    default:
      return base as Token;
  }
}