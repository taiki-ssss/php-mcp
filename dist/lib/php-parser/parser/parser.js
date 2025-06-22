"use strict";
/**
 * PHP パーサー
 * トークン列から AST を構築
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = exports.Parser = void 0;
exports.parse = parse;
const token_js_1 = require("../core/token.js");
const location_js_1 = require("../core/location.js");
const declaration_js_1 = require("./declaration.js");
/**
 * PHP パーサー
 */
class Parser extends declaration_js_1.DeclarationParser {
    /**
     * プログラムをパース
     */
    parse() {
        const start = this.peek().location.start;
        const statements = [];
        // Skip initial HTML if any
        if (this.match(token_js_1.TokenKind.InlineHTML)) {
            // Ignore for now
        }
        // Skip opening PHP tag
        if (this.match(token_js_1.TokenKind.OpenTag, token_js_1.TokenKind.OpenTagEcho)) {
            // Process statements
        }
        while (!this.isAtEnd()) {
            // Handle closing tag
            if (this.match(token_js_1.TokenKind.CloseTag)) {
                // Skip any HTML
                if (this.match(token_js_1.TokenKind.InlineHTML)) {
                    // Ignore for now
                }
                // Look for next opening tag
                if (this.match(token_js_1.TokenKind.OpenTag, token_js_1.TokenKind.OpenTagEcho)) {
                    continue;
                }
            }
            try {
                const stmt = this.parseDeclaration();
                if (stmt)
                    statements.push(stmt);
            }
            catch (error) {
                if (this.options.errorRecovery) {
                    // エラーリカバリー: 次の文まで同期
                    this.synchronize();
                }
                else {
                    throw error;
                }
            }
        }
        const end = statements.length > 0
            ? statements[statements.length - 1].location.end
            : this.previous().location.end;
        return {
            type: 'Program',
            statements,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
}
exports.Parser = Parser;
/**
 * パーサーをエクスポート
 */
var base_js_1 = require("./base.js");
Object.defineProperty(exports, "ParseError", { enumerable: true, get: function () { return base_js_1.ParseError; } });
__exportStar(require("../core/ast.js"), exports);
/**
 * トークン列をパース
 */
function parse(tokens, options) {
    const parser = new Parser(tokens, options);
    return parser.parse();
}
