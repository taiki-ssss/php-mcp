"use strict";
/**
 * PHP トークン定義
 * TypeScript の Enum と Discriminated Union で型安全に
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYWORDS = exports.TokenKind = void 0;
exports.createToken = createToken;
exports.isTokenKind = isTokenKind;
/**
 * トークンの種類
 */
var TokenKind;
(function (TokenKind) {
    // リテラル
    TokenKind["Number"] = "Number";
    TokenKind["String"] = "String";
    TokenKind["Identifier"] = "Identifier";
    TokenKind["Variable"] = "Variable";
    // キーワード
    TokenKind["Abstract"] = "abstract";
    TokenKind["And"] = "and";
    TokenKind["Array"] = "array";
    TokenKind["As"] = "as";
    TokenKind["Async"] = "async";
    TokenKind["Await"] = "await";
    TokenKind["Break"] = "break";
    TokenKind["Callable"] = "callable";
    TokenKind["Case"] = "case";
    TokenKind["Catch"] = "catch";
    TokenKind["Class"] = "class";
    TokenKind["Clone"] = "clone";
    TokenKind["Const"] = "const";
    TokenKind["Continue"] = "continue";
    TokenKind["Declare"] = "declare";
    TokenKind["Default"] = "default";
    TokenKind["Do"] = "do";
    TokenKind["Echo"] = "echo";
    TokenKind["Else"] = "else";
    TokenKind["ElseIf"] = "elseif";
    TokenKind["Empty"] = "empty";
    TokenKind["EndDeclare"] = "enddeclare";
    TokenKind["EndFor"] = "endfor";
    TokenKind["EndForeach"] = "endforeach";
    TokenKind["EndIf"] = "endif";
    TokenKind["EndSwitch"] = "endswitch";
    TokenKind["EndWhile"] = "endwhile";
    TokenKind["Enum"] = "enum";
    TokenKind["Eval"] = "eval";
    TokenKind["Exit"] = "exit";
    TokenKind["Extends"] = "extends";
    TokenKind["False"] = "false";
    TokenKind["Final"] = "final";
    TokenKind["Finally"] = "finally";
    TokenKind["Fn"] = "fn";
    TokenKind["For"] = "for";
    TokenKind["Foreach"] = "foreach";
    TokenKind["Function"] = "function";
    TokenKind["Global"] = "global";
    TokenKind["Goto"] = "goto";
    TokenKind["If"] = "if";
    TokenKind["Implements"] = "implements";
    TokenKind["Include"] = "include";
    TokenKind["IncludeOnce"] = "include_once";
    TokenKind["Instanceof"] = "instanceof";
    TokenKind["Insteadof"] = "insteadof";
    TokenKind["Interface"] = "interface";
    TokenKind["Isset"] = "isset";
    TokenKind["List"] = "list";
    TokenKind["Match"] = "match";
    TokenKind["Namespace"] = "namespace";
    TokenKind["New"] = "new";
    TokenKind["Null"] = "null";
    TokenKind["Or"] = "or";
    TokenKind["Print"] = "print";
    TokenKind["Private"] = "private";
    TokenKind["Protected"] = "protected";
    TokenKind["Public"] = "public";
    TokenKind["Readonly"] = "readonly";
    TokenKind["Require"] = "require";
    TokenKind["RequireOnce"] = "require_once";
    TokenKind["Return"] = "return";
    TokenKind["Static"] = "static";
    TokenKind["Switch"] = "switch";
    TokenKind["Throw"] = "throw";
    TokenKind["Trait"] = "trait";
    TokenKind["True"] = "true";
    TokenKind["Try"] = "try";
    TokenKind["Unset"] = "unset";
    TokenKind["Use"] = "use";
    TokenKind["Var"] = "var";
    TokenKind["While"] = "while";
    TokenKind["Xor"] = "xor";
    TokenKind["Yield"] = "yield";
    // 演算子
    TokenKind["Plus"] = "+";
    TokenKind["Minus"] = "-";
    TokenKind["Star"] = "*";
    TokenKind["Slash"] = "/";
    TokenKind["Percent"] = "%";
    TokenKind["StarStar"] = "**";
    TokenKind["PlusEqual"] = "+=";
    TokenKind["MinusEqual"] = "-=";
    TokenKind["StarEqual"] = "*=";
    TokenKind["SlashEqual"] = "/=";
    TokenKind["PercentEqual"] = "%=";
    TokenKind["StarStarEqual"] = "**=";
    TokenKind["Dot"] = ".";
    TokenKind["DotEqual"] = ".=";
    TokenKind["Equal"] = "=";
    TokenKind["EqualEqual"] = "==";
    TokenKind["EqualEqualEqual"] = "===";
    TokenKind["BangEqual"] = "!=";
    TokenKind["BangEqualEqual"] = "!==";
    TokenKind["Less"] = "<";
    TokenKind["Greater"] = ">";
    TokenKind["LessEqual"] = "<=";
    TokenKind["GreaterEqual"] = ">=";
    TokenKind["Spaceship"] = "<=>";
    TokenKind["Ampersand"] = "&";
    TokenKind["Pipe"] = "|";
    TokenKind["Caret"] = "^";
    TokenKind["Tilde"] = "~";
    TokenKind["LessLess"] = "<<";
    TokenKind["GreaterGreater"] = ">>";
    TokenKind["AmpersandEqual"] = "&=";
    TokenKind["PipeEqual"] = "|=";
    TokenKind["CaretEqual"] = "^=";
    TokenKind["LessLessEqual"] = "<<=";
    TokenKind["GreaterGreaterEqual"] = ">>=";
    TokenKind["AmpersandAmpersand"] = "&&";
    TokenKind["PipePipe"] = "||";
    TokenKind["Question"] = "?";
    TokenKind["QuestionQuestion"] = "??";
    TokenKind["QuestionQuestionEqual"] = "??=";
    TokenKind["Colon"] = ":";
    TokenKind["Semicolon"] = ";";
    TokenKind["Comma"] = ",";
    TokenKind["Bang"] = "!";
    TokenKind["At"] = "@";
    TokenKind["Dollar"] = "$";
    TokenKind["Arrow"] = "->";
    TokenKind["QuestionArrow"] = "?->";
    TokenKind["DoubleArrow"] = "=>";
    TokenKind["DoubleColon"] = "::";
    TokenKind["Backslash"] = "\\";
    TokenKind["Ellipsis"] = "...";
    TokenKind["PlusPlus"] = "++";
    TokenKind["MinusMinus"] = "--";
    // 括弧
    TokenKind["LeftParen"] = "(";
    TokenKind["RightParen"] = ")";
    TokenKind["LeftBracket"] = "[";
    TokenKind["RightBracket"] = "]";
    TokenKind["LeftBrace"] = "{";
    TokenKind["RightBrace"] = "}";
    // 特殊
    TokenKind["OpenTag"] = "<?php";
    TokenKind["OpenTagEcho"] = "<?=";
    TokenKind["CloseTag"] = "?>";
    TokenKind["InlineHTML"] = "InlineHTML";
    TokenKind["Comment"] = "Comment";
    TokenKind["DocComment"] = "DocComment";
    TokenKind["Whitespace"] = "Whitespace";
    TokenKind["Newline"] = "Newline";
    // 文字列補間
    TokenKind["StringStart"] = "StringStart";
    TokenKind["StringMiddle"] = "StringMiddle";
    TokenKind["StringEnd"] = "StringEnd";
    // 終端
    TokenKind["EOF"] = "EOF";
    TokenKind["Unknown"] = "Unknown";
})(TokenKind || (exports.TokenKind = TokenKind = {}));
/**
 * トークンを作成するヘルパー関数
 */
function createToken(kind, text, location, props) {
    return {
        kind,
        text,
        location,
        ...props
    };
}
/**
 * キーワードのマップ
 */
exports.KEYWORDS = new Map([
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
function isTokenKind(token, kind) {
    return token.kind === kind;
}
