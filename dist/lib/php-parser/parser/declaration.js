"use strict";
/**
 * 宣言パーサー
 * クラス、関数、インターフェースなどの宣言をパース
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclarationParser = void 0;
const token_js_1 = require("../core/token.js");
const location_js_1 = require("../core/location.js");
const statement_js_1 = require("./statement.js");
/**
 * 宣言パーサー
 */
class DeclarationParser extends statement_js_1.StatementParser {
    /**
     * トップレベル宣言をパース
     */
    parseDeclaration() {
        // 宣言
        if (this.match(token_js_1.TokenKind.Function)) {
            return this.parseFunctionDeclaration();
        }
        if (this.match(token_js_1.TokenKind.Class)) {
            return this.parseClassDeclaration();
        }
        if (this.match(token_js_1.TokenKind.Interface)) {
            return this.parseInterfaceDeclaration();
        }
        if (this.match(token_js_1.TokenKind.Trait)) {
            return this.parseTraitDeclaration();
        }
        if (this.match(token_js_1.TokenKind.Enum)) {
            return this.parseEnumDeclaration();
        }
        if (this.match(token_js_1.TokenKind.Namespace)) {
            return this.parseNamespaceDeclaration();
        }
        if (this.match(token_js_1.TokenKind.Use)) {
            return this.parseUseStatement();
        }
        if (this.match(token_js_1.TokenKind.Const)) {
            return this.parseConstStatement();
        }
        // その他は文として処理
        return this.parseStatement();
    }
    /**
     * 関数宣言をパース
     */
    parseFunctionDeclaration() {
        const start = this.previous().location.start;
        const byReference = this.match(token_js_1.TokenKind.Ampersand);
        const name = this.parseIdentifier();
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after function name");
        const parameters = this.parseParameterList();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after parameters");
        const returnType = this.match(token_js_1.TokenKind.Colon) ? this.parseType() : undefined;
        const body = this.parseBlockStatement();
        return {
            type: 'FunctionDeclaration',
            name,
            parameters,
            body,
            byReference,
            returnType,
            location: (0, location_js_1.createLocation)(start, body.location.end)
        };
    }
    /**
     * クラス宣言をパース
     */
    parseClassDeclaration() {
        const start = this.previous().location.start;
        const modifiers = [];
        // PHP 8.0+ readonly classes
        if (this.previous().kind === token_js_1.TokenKind.Readonly) {
            modifiers.push('readonly');
            this.consume(token_js_1.TokenKind.Class, "Expected 'class' after 'readonly'");
        }
        const name = this.parseIdentifier();
        // Extends
        let superClass;
        if (this.match(token_js_1.TokenKind.Extends)) {
            superClass = this.parseNameExpression();
        }
        // Implements
        const interfaces = [];
        if (this.match(token_js_1.TokenKind.Implements)) {
            do {
                interfaces.push(this.parseNameExpression());
            } while (this.match(token_js_1.TokenKind.Comma));
        }
        this.consume(token_js_1.TokenKind.LeftBrace, "Expected '{' before class body");
        const body = this.parseClassBody();
        const end = this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after class body").location.end;
        return {
            type: 'ClassDeclaration',
            name,
            body,
            modifiers: modifiers || [],
            superClass,
            interfaces: interfaces.length > 0 ? interfaces : undefined,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * インターフェース宣言をパース
     */
    parseInterfaceDeclaration() {
        const start = this.previous().location.start;
        const name = this.parseIdentifier();
        const extendsInterfaces = [];
        if (this.match(token_js_1.TokenKind.Extends)) {
            do {
                extendsInterfaces.push(this.parseNameExpression());
            } while (this.match(token_js_1.TokenKind.Comma));
        }
        this.consume(token_js_1.TokenKind.LeftBrace, "Expected '{' before interface body");
        const body = [];
        while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            // const
            if (this.match(token_js_1.TokenKind.Const)) {
                // インターフェースではConstantDeclarationを使用
                const start = this.previous().location.start;
                const constants = [];
                do {
                    const name = this.parseIdentifier();
                    this.consume(token_js_1.TokenKind.Equal, "Expected '=' after const name");
                    const value = this.parseExpression();
                    constants.push({
                        type: 'ConstDeclaration',
                        name,
                        value,
                        location: (0, location_js_1.mergeLocations)(name.location, value.location)
                    });
                } while (this.match(token_js_1.TokenKind.Comma));
                const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after interface constant").location.end;
                body.push({
                    type: 'ConstantDeclaration',
                    declarations: constants,
                    modifiers: ['public'],
                    location: (0, location_js_1.createLocation)(start, end)
                });
            }
            else {
                // method
                const modifiers = [];
                while (this.checkModifierToken()) {
                    modifiers.push(this.advance().text.toLowerCase());
                }
                this.consume(token_js_1.TokenKind.Function, "Expected 'function' in interface");
                const method = this.parseMethod(modifiers);
                body.push(method);
            }
        }
        const end = this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after interface body").location.end;
        return {
            type: 'InterfaceDeclaration',
            name,
            extends: extendsInterfaces.length > 0 ? extendsInterfaces : undefined,
            body,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * トレイト宣言をパース
     */
    parseTraitDeclaration() {
        const start = this.previous().location.start;
        const name = this.parseIdentifier();
        this.consume(token_js_1.TokenKind.LeftBrace, "Expected '{' before trait body");
        const body = this.parseTraitBody();
        const end = this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after trait body").location.end;
        return {
            type: 'TraitDeclaration',
            name,
            body,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * Enum宣言をパース
     */
    parseEnumDeclaration() {
        const start = this.previous().location.start;
        const name = this.parseIdentifier();
        // Backed enums
        let scalarType;
        if (this.match(token_js_1.TokenKind.Colon)) {
            const type = this.parseIdentifier();
            if (type.name === 'int' || type.name === 'string') {
                scalarType = type.name;
            }
            else {
                throw this.error(this.previous(), "Enum backing type must be 'int' or 'string'");
            }
        }
        // Implements
        const interfaces = [];
        if (this.match(token_js_1.TokenKind.Implements)) {
            do {
                interfaces.push(this.parseNameExpression());
            } while (this.match(token_js_1.TokenKind.Comma));
        }
        this.consume(token_js_1.TokenKind.LeftBrace, "Expected '{' before enum body");
        const body = [];
        while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            if (this.match(token_js_1.TokenKind.Case)) {
                const caseName = this.parseIdentifier();
                let value;
                if (this.match(token_js_1.TokenKind.Equal)) {
                    value = this.parseExpression();
                }
                this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after enum case");
                body.push({
                    type: 'EnumCase',
                    name: caseName,
                    value,
                    location: (0, location_js_1.mergeLocations)(caseName.location, value?.location || caseName.location)
                });
            }
            else {
                // Methods and constants in enums
                const member = this.parseClassMember();
                if (member)
                    body.push(member);
            }
        }
        const end = this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after enum body").location.end;
        return {
            type: 'EnumDeclaration',
            name,
            scalarType,
            implements: interfaces.length > 0 ? interfaces : undefined,
            body,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * namespace宣言をパース
     */
    parseNamespaceDeclaration() {
        const start = this.previous().location.start;
        let name;
        // Namespace name is optional (global namespace)
        if (!this.check(token_js_1.TokenKind.LeftBrace) && !this.check(token_js_1.TokenKind.Semicolon)) {
            name = this.parseNameExpression();
        }
        let statements = [];
        let end;
        if (this.match(token_js_1.TokenKind.LeftBrace)) {
            // Bracketed namespace
            while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
                const stmt = this.parseStatement();
                if (stmt)
                    statements.push(stmt);
            }
            end = this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after namespace body").location.end;
        }
        else {
            // Unbracketed namespace
            this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' or '{' after namespace name");
            // Parse until end of file or next namespace
            while (!this.isAtEnd() && !this.check(token_js_1.TokenKind.Namespace)) {
                const stmt = this.parseStatement();
                if (stmt)
                    statements.push(stmt);
            }
            end = statements.length > 0
                ? statements[statements.length - 1].location.end
                : this.previous().location.end;
        }
        return {
            type: 'NamespaceDeclaration',
            name,
            statements,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * use文をパース
     */
    parseUseStatement() {
        const start = this.previous().location.start;
        const items = [];
        // use function/const
        let kind = 'normal';
        if (this.match(token_js_1.TokenKind.Function)) {
            kind = 'function';
        }
        else if (this.match(token_js_1.TokenKind.Const)) {
            kind = 'const';
        }
        do {
            const name = this.parseNameExpression();
            let alias;
            if (this.match(token_js_1.TokenKind.As)) {
                alias = this.parseIdentifier();
            }
            items.push({
                type: 'UseItem',
                name,
                alias,
                location: (0, location_js_1.mergeLocations)(name.location, alias?.location || name.location)
            });
        } while (this.match(token_js_1.TokenKind.Comma));
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after use statement").location.end;
        return {
            type: 'UseStatement',
            items,
            kind,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * const文をパース
     */
    parseConstStatement() {
        const start = this.previous().location.start;
        const declarations = [];
        do {
            const name = this.parseIdentifier();
            this.consume(token_js_1.TokenKind.Equal, "Expected '=' after const name");
            const value = this.parseExpression();
            declarations.push({
                type: 'ConstDeclaration',
                name,
                value,
                location: (0, location_js_1.mergeLocations)(name.location, value.location)
            });
        } while (this.match(token_js_1.TokenKind.Comma));
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after const declaration").location.end;
        return {
            type: 'ConstStatement',
            declarations,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * 修飾子をパース
     */
    parseModifiers() {
        const modifiers = [];
        while (this.checkModifierToken()) {
            modifiers.push(this.advance().text.toLowerCase());
        }
        return modifiers;
    }
    /**
     * 修飾子かチェック
     */
    checkModifierToken() {
        const kind = this.peek().kind;
        return kind === token_js_1.TokenKind.Public ||
            kind === token_js_1.TokenKind.Private ||
            kind === token_js_1.TokenKind.Protected ||
            kind === token_js_1.TokenKind.Static ||
            kind === token_js_1.TokenKind.Abstract ||
            kind === token_js_1.TokenKind.Final ||
            kind === token_js_1.TokenKind.Readonly;
    }
    /**
     * トレイトボディをパース
     */
    parseTraitBody() {
        const members = [];
        while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            if (this.match(token_js_1.TokenKind.Use)) {
                members.push(this.parseTraitUse());
            }
            else {
                const modifiers = this.parseModifiers();
                if (this.match(token_js_1.TokenKind.Function)) {
                    members.push(this.parseMethod(modifiers));
                }
                else if (this.check(token_js_1.TokenKind.Variable)) {
                    members.push(this.parseProperty(modifiers));
                }
                else {
                    throw this.error(this.peek(), "Expected method or property in trait body");
                }
            }
        }
        return members;
    }
    /**
     * クラスボディをパース
     */
    parseClassBody() {
        const members = [];
        while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            const member = this.parseClassMember();
            if (member)
                members.push(member);
        }
        return members;
    }
    /**
     * クラスメンバーをパース
     */
    parseClassMember() {
        // Trait use
        if (this.match(token_js_1.TokenKind.Use)) {
            return this.parseTraitUse();
        }
        // Const
        if (this.match(token_js_1.TokenKind.Const)) {
            return this.parseClassConstant();
        }
        // Modifiers
        const modifiers = [];
        while (this.checkModifierToken()) {
            modifiers.push(this.advance().text.toLowerCase());
        }
        // Function (method)
        if (this.match(token_js_1.TokenKind.Function)) {
            return this.parseMethod(modifiers);
        }
        // Property
        if (this.check(token_js_1.TokenKind.Variable)) {
            return this.parseProperty(modifiers);
        }
        // PHP 8.0+ typed properties without explicit visibility
        if (modifiers.length > 0 || this.checkType()) {
            return this.parseProperty(modifiers);
        }
        return null;
    }
    /**
     * trait use をパース
     */
    parseTraitUse() {
        const start = this.tokens[this.current - 1].location.start;
        const traits = [];
        do {
            traits.push(this.parseNameExpression());
        } while (this.match(token_js_1.TokenKind.Comma));
        let adaptations;
        if (this.match(token_js_1.TokenKind.LeftBrace)) {
            adaptations = [];
            while (!this.check(token_js_1.TokenKind.RightBrace) && !this.isAtEnd()) {
                const trait = this.parseNameExpression();
                this.consume(token_js_1.TokenKind.DoubleColon, "Expected '::' in trait adaptation");
                const method = this.parseIdentifier();
                if (this.match(token_js_1.TokenKind.As)) {
                    // Alias
                    let visibility;
                    if (this.match(token_js_1.TokenKind.Public))
                        visibility = 'public';
                    else if (this.match(token_js_1.TokenKind.Protected))
                        visibility = 'protected';
                    else if (this.match(token_js_1.TokenKind.Private))
                        visibility = 'private';
                    const alias = visibility ? this.parseIdentifier() : method;
                    adaptations.push({
                        type: 'TraitAlias',
                        trait,
                        method,
                        visibility,
                        alias,
                        location: (0, location_js_1.mergeLocations)(trait.location, alias.location)
                    });
                }
                else if (this.match(token_js_1.TokenKind.Insteadof)) {
                    // Precedence
                    const insteadof = [];
                    do {
                        insteadof.push(this.parseNameExpression());
                    } while (this.match(token_js_1.TokenKind.Comma));
                    adaptations.push({
                        type: 'TraitPrecedence',
                        trait,
                        method,
                        insteadOf: insteadof,
                        location: (0, location_js_1.mergeLocations)(trait.location, insteadof[insteadof.length - 1].location)
                    });
                }
                this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after trait adaptation");
            }
            this.consume(token_js_1.TokenKind.RightBrace, "Expected '}' after trait adaptations");
        }
        else {
            this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' or '{' after trait use");
        }
        const end = this.previous().location.end;
        return {
            type: 'TraitUseStatement',
            traits,
            adaptations,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * クラス定数をパース
     */
    parseClassConstant() {
        const start = this.tokens[this.current - 1].location.start;
        const constants = [];
        do {
            const name = this.parseIdentifier();
            this.consume(token_js_1.TokenKind.Equal, "Expected '=' after const name");
            const value = this.parseExpression();
            constants.push({
                name,
                value
            });
        } while (this.match(token_js_1.TokenKind.Comma));
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after class constant").location.end;
        return {
            type: 'ClassConstant',
            constants,
            modifiers: [], // TODO: parse visibility modifiers
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * メソッドをパース
     */
    parseMethod(modifiers) {
        const start = this.previous().location.start;
        const byReference = this.match(token_js_1.TokenKind.Ampersand);
        const name = this.parseIdentifier();
        this.consume(token_js_1.TokenKind.LeftParen, "Expected '(' after method name");
        const parameters = this.parseParameterList();
        this.consume(token_js_1.TokenKind.RightParen, "Expected ')' after parameters");
        const returnType = this.match(token_js_1.TokenKind.Colon) ? this.parseType() : undefined;
        let body;
        if (!modifiers.includes('abstract')) {
            body = this.parseBlockStatement();
        }
        else {
            this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after abstract method");
        }
        const end = body?.location?.end || this.previous().location.end;
        return {
            type: 'MethodDeclaration',
            name,
            parameters,
            body,
            modifiers: modifiers || [],
            byReference,
            returnType,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * プロパティをパース
     */
    parseProperty(modifiers) {
        const start = modifiers.length > 0
            ? this.tokens[this.current - modifiers.length].location.start
            : this.peek().location.start;
        // Type hint
        let typeAnnotation;
        if (!this.check(token_js_1.TokenKind.Variable)) {
            typeAnnotation = this.parseType();
        }
        // PHPでは一度に一つのプロパティしか宣言できないので、直接PropertyDeclarationを作成
        const varExpr = this.parseVariable();
        // VariableExpression から property 名を取得
        if (varExpr.type !== 'VariableExpression' || typeof varExpr.name !== 'string') {
            throw this.error(this.peek(), 'Property name must be a simple variable');
        }
        const name = {
            type: 'Identifier',
            name: varExpr.name.substring(1), // $ を除去
            location: varExpr.location
        };
        let initializer;
        if (this.match(token_js_1.TokenKind.Equal)) {
            initializer = this.parseExpression();
        }
        const end = this.consume(token_js_1.TokenKind.Semicolon, "Expected ';' after property declaration").location.end;
        return {
            type: 'PropertyDeclaration',
            name,
            initializer,
            typeAnnotation,
            modifiers: modifiers.length > 0 ? modifiers : [],
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * パラメータリストをパース
     */
    parseParameterList() {
        const parameters = [];
        while (!this.check(token_js_1.TokenKind.RightParen) && !this.isAtEnd()) {
            parameters.push(this.parseParameter());
            if (!this.check(token_js_1.TokenKind.RightParen)) {
                this.consume(token_js_1.TokenKind.Comma, "Expected ',' after parameter");
            }
        }
        return parameters;
    }
    /**
     * パラメータをパース
     */
    parseParameter() {
        const start = this.peek().location.start;
        // Promoted properties (PHP 8.0+)
        const promoted = [];
        while (this.match(token_js_1.TokenKind.Public, token_js_1.TokenKind.Protected, token_js_1.TokenKind.Private, token_js_1.TokenKind.Readonly)) {
            promoted.push(this.previous().text.toLowerCase());
        }
        // Type
        let typeAnnotation;
        if (!this.check(token_js_1.TokenKind.Ellipsis) && !this.check(token_js_1.TokenKind.Ampersand) && !this.check(token_js_1.TokenKind.Variable)) {
            typeAnnotation = this.parseType();
        }
        // By reference
        const byReference = this.match(token_js_1.TokenKind.Ampersand);
        // Variadic
        const variadic = this.match(token_js_1.TokenKind.Ellipsis);
        // Name
        const name = this.parseVariable();
        // Default value
        let defaultValue;
        if (this.match(token_js_1.TokenKind.Equal)) {
            defaultValue = this.parseExpression();
        }
        const end = defaultValue?.location?.end || name.location.end;
        return {
            type: 'Parameter',
            name,
            typeAnnotation,
            defaultValue,
            byReference,
            variadic,
            promoted: promoted.length > 0 ? promoted : undefined,
            location: (0, location_js_1.createLocation)(start, end)
        };
    }
    /**
     * 型をパース
     */
    parseType() {
        const start = this.peek().location.start;
        // Nullable type
        if (this.match(token_js_1.TokenKind.Question)) {
            const typeAnnotation = this.parseType();
            return {
                type: 'NullableType',
                typeAnnotation,
                location: (0, location_js_1.createLocation)(start, typeAnnotation.location.end)
            };
        }
        // Union/Intersection types
        let types = [];
        types.push(this.parseSingleType());
        // Union type (|)
        if (this.check(token_js_1.TokenKind.Pipe)) {
            while (this.match(token_js_1.TokenKind.Pipe)) {
                types.push(this.parseSingleType());
            }
            return {
                type: 'UnionType',
                types,
                location: (0, location_js_1.createLocation)(start, types[types.length - 1].location.end)
            };
        }
        // Intersection type (&)
        if (this.check(token_js_1.TokenKind.Ampersand)) {
            while (this.match(token_js_1.TokenKind.Ampersand)) {
                types.push(this.parseSingleType());
            }
            return {
                type: 'IntersectionType',
                types,
                location: (0, location_js_1.createLocation)(start, types[types.length - 1].location.end)
            };
        }
        return types[0];
    }
    /**
     * 単一型をパース
     */
    parseSingleType() {
        // Array type
        if (this.match(token_js_1.TokenKind.Array)) {
            return {
                type: 'ArrayType',
                elementType: { type: 'SimpleType', name: 'mixed' },
                location: this.previous().location
            };
        }
        // Callable type
        if (this.match(token_js_1.TokenKind.Callable)) {
            return {
                type: 'CallableType',
                location: this.previous().location
            };
        }
        // Named type
        const name = this.parseNameExpression();
        return {
            type: 'SimpleType',
            name: name.parts.join('\\'),
            location: name.location
        };
    }
    /**
     * 型の開始をチェック
     */
    checkType() {
        return this.check(token_js_1.TokenKind.Array) ||
            this.check(token_js_1.TokenKind.Callable) ||
            this.check(token_js_1.TokenKind.Question) ||
            this.check(token_js_1.TokenKind.Identifier) ||
            this.check(token_js_1.TokenKind.Backslash);
    }
}
exports.DeclarationParser = DeclarationParser;
