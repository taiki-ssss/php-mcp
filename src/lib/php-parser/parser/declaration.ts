/**
 * 宣言パーサー
 * クラス、関数、インターフェースなどの宣言をパース
 */

import { TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { SourcePosition, createLocation, mergeLocations } from '../core/location.js';
import { StatementParser } from './statement.js';

/**
 * 宣言パーサー
 */
export class DeclarationParser extends StatementParser {
  /**
   * トップレベル宣言をパース
   */
  parseDeclaration(): AST.Statement | null {
    // 宣言
    if (this.match(TokenKind.Function)) {
      return this.parseFunctionDeclaration();
    }

    if (this.match(TokenKind.Class)) {
      return this.parseClassDeclaration();
    }

    if (this.match(TokenKind.Interface)) {
      return this.parseInterfaceDeclaration();
    }

    if (this.match(TokenKind.Trait)) {
      return this.parseTraitDeclaration();
    }

    if (this.match(TokenKind.Enum)) {
      return this.parseEnumDeclaration();
    }

    if (this.match(TokenKind.Namespace)) {
      return this.parseNamespaceDeclaration();
    }

    if (this.match(TokenKind.Use)) {
      return this.parseUseStatement();
    }

    if (this.match(TokenKind.Const)) {
      return this.parseConstStatement();
    }

    // その他は文として処理
    return this.parseStatement();
  }

  /**
   * 関数宣言をパース
   */
  private parseFunctionDeclaration(): AST.FunctionDeclaration {
    const start = this.previous().location.start;
    const byReference = this.match(TokenKind.Ampersand);
    const name = this.parseIdentifier();

    this.consume(TokenKind.LeftParen, "Expected '(' after function name");
    const parameters = this.parseParameterList();
    this.consume(TokenKind.RightParen, "Expected ')' after parameters");

    const returnType = this.match(TokenKind.Colon) ? this.parseType() : undefined;
    const body = this.parseBlockStatement();

    return {
      type: 'FunctionDeclaration',
      name,
      parameters,
      body,
      byReference,
      returnType,
      location: createLocation(start, body.location!.end)
    };
  }

  /**
   * クラス宣言をパース
   */
  private parseClassDeclaration(): AST.ClassDeclaration {
    const start = this.previous().location.start;
    const modifiers: AST.ClassModifier[] = [];

    // PHP 8.0+ readonly classes
    if (this.previous().kind === TokenKind.Readonly) {
      modifiers.push('readonly');
      this.consume(TokenKind.Class, "Expected 'class' after 'readonly'");
    }

    const name = this.parseIdentifier();

    // Extends
    let superClass: AST.NameExpression | undefined;
    if (this.match(TokenKind.Extends)) {
      superClass = this.parseNameExpression();
    }

    // Implements
    const interfaces: AST.NameExpression[] = [];
    if (this.match(TokenKind.Implements)) {
      do {
        interfaces.push(this.parseNameExpression());
      } while (this.match(TokenKind.Comma));
    }

    this.consume(TokenKind.LeftBrace, "Expected '{' before class body");
    const body = this.parseClassBody();
    const end = this.consume(TokenKind.RightBrace, "Expected '}' after class body").location.end;

    return {
      type: 'ClassDeclaration',
      name,
      body,
      modifiers: modifiers || [],
      superClass,
      interfaces: interfaces.length > 0 ? interfaces : undefined,
      location: createLocation(start, end)
    };
  }

  /**
   * インターフェース宣言をパース
   */
  private parseInterfaceDeclaration(): AST.InterfaceDeclaration {
    const start = this.previous().location.start;
    const name = this.parseIdentifier();

    const extendsInterfaces: AST.NameExpression[] = [];
    if (this.match(TokenKind.Extends)) {
      do {
        extendsInterfaces.push(this.parseNameExpression());
      } while (this.match(TokenKind.Comma));
    }

    this.consume(TokenKind.LeftBrace, "Expected '{' before interface body");
    const body: AST.InterfaceMember[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      // const
      if (this.match(TokenKind.Const)) {
        // インターフェースではConstantDeclarationを使用
        const start = this.previous().location.start;
        const constants: AST.ConstDeclaration[] = [];

        do {
          const name = this.parseIdentifier();
          this.consume(TokenKind.Equal, "Expected '=' after const name");
          const value = this.parseExpression();

          constants.push({
            type: 'ConstDeclaration',
            name,
            value,
            location: mergeLocations(name.location!, value.location!)
          });
        } while (this.match(TokenKind.Comma));

        const end = this.consume(TokenKind.Semicolon, "Expected ';' after interface constant").location.end;

        body.push({
          type: 'ConstantDeclaration',
          declarations: constants,
          modifiers: ['public'],
          location: createLocation(start, end)
        });
      } else {
        // method
        const modifiers: string[] = [];
        while (this.checkModifierToken()) {
          modifiers.push(this.advance().text.toLowerCase());
        }

        this.consume(TokenKind.Function, "Expected 'function' in interface");
        const method = this.parseMethod(modifiers as AST.MethodModifier[]);
        body.push(method);
      }
    }

    const end = this.consume(TokenKind.RightBrace, "Expected '}' after interface body").location.end;

    return {
      type: 'InterfaceDeclaration',
      name,
      extends: extendsInterfaces.length > 0 ? extendsInterfaces : undefined,
      body,
      location: createLocation(start, end)
    };
  }

  /**
   * トレイト宣言をパース
   */
  private parseTraitDeclaration(): AST.TraitDeclaration {
    const start = this.previous().location.start;
    const name = this.parseIdentifier();

    this.consume(TokenKind.LeftBrace, "Expected '{' before trait body");
    const body = this.parseTraitBody();
    const end = this.consume(TokenKind.RightBrace, "Expected '}' after trait body").location.end;

    return {
      type: 'TraitDeclaration',
      name,
      body,
      location: createLocation(start, end)
    };
  }

  /**
   * Enum宣言をパース
   */
  private parseEnumDeclaration(): AST.EnumDeclaration {
    const start = this.previous().location.start;
    const name = this.parseIdentifier();

    // Backed enums
    let scalarType: 'int' | 'string' | undefined;
    if (this.match(TokenKind.Colon)) {
      const type = this.parseIdentifier();
      if (type.name === 'int' || type.name === 'string') {
        scalarType = type.name;
      } else {
        throw this.error(this.previous(), "Enum backing type must be 'int' or 'string'");
      }
    }

    // Implements
    const interfaces: AST.NameExpression[] = [];
    if (this.match(TokenKind.Implements)) {
      do {
        interfaces.push(this.parseNameExpression());
      } while (this.match(TokenKind.Comma));
    }

    this.consume(TokenKind.LeftBrace, "Expected '{' before enum body");
    const body: AST.EnumMember[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      if (this.match(TokenKind.Case)) {
        const caseName = this.parseIdentifier();

        let value: AST.Expression | undefined;
        if (this.match(TokenKind.Equal)) {
          value = this.parseExpression();
        }

        this.consume(TokenKind.Semicolon, "Expected ';' after enum case");

        body.push({
          type: 'EnumCase',
          name: caseName,
          value,
          location: mergeLocations(
            caseName.location!,
            value?.location || caseName.location!
          )
        });
      } else {
        // Methods and constants in enums
        const member = this.parseClassMember();
        if (member) body.push(member as any);
      }
    }

    const end = this.consume(TokenKind.RightBrace, "Expected '}' after enum body").location.end;

    return {
      type: 'EnumDeclaration',
      name,
      scalarType,
      implements: interfaces.length > 0 ? interfaces : undefined,
      body,
      location: createLocation(start, end)
    };
  }

  /**
   * namespace宣言をパース
   */
  private parseNamespaceDeclaration(): AST.NamespaceDeclaration {
    const start = this.previous().location.start;
    let name: AST.NameExpression | undefined;

    // Namespace name is optional (global namespace)
    if (!this.check(TokenKind.LeftBrace) && !this.check(TokenKind.Semicolon)) {
      name = this.parseNameExpression();
    }

    let statements: AST.Statement[] = [];
    let end: SourcePosition;

    if (this.match(TokenKind.LeftBrace)) {
      // Bracketed namespace
      while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
      }
      end = this.consume(TokenKind.RightBrace, "Expected '}' after namespace body").location.end;
    } else {
      // Unbracketed namespace
      this.consume(TokenKind.Semicolon, "Expected ';' or '{' after namespace name");

      // Parse until end of file or next namespace
      while (!this.isAtEnd() && !this.check(TokenKind.Namespace)) {
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
      }

      end = statements.length > 0
        ? statements[statements.length - 1].location!.end
        : this.previous().location.end;
    }

    return {
      type: 'NamespaceDeclaration',
      name,
      statements,
      location: createLocation(start, end)
    };
  }

  /**
   * use文をパース
   */
  private parseUseStatement(): AST.UseStatement {
    const start = this.previous().location.start;
    const items: AST.UseItem[] = [];

    // use function/const
    let kind: 'normal' | 'function' | 'const' = 'normal';
    if (this.match(TokenKind.Function)) {
      kind = 'function';
    } else if (this.match(TokenKind.Const)) {
      kind = 'const';
    }

    do {
      const name = this.parseNameExpression();
      let alias: AST.Identifier | undefined;

      if (this.match(TokenKind.As)) {
        alias = this.parseIdentifier();
      }

      items.push({
        type: 'UseItem',
        name,
        alias,
        location: mergeLocations(name.location!, alias?.location || name.location!)
      });
    } while (this.match(TokenKind.Comma));

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after use statement").location.end;

    return {
      type: 'UseStatement',
      items,
      kind,
      location: createLocation(start, end)
    };
  }

  /**
   * const文をパース
   */
  private parseConstStatement(): AST.ConstStatement {
    const start = this.previous().location.start;
    const declarations: AST.ConstDeclaration[] = [];

    do {
      const name = this.parseIdentifier();
      this.consume(TokenKind.Equal, "Expected '=' after const name");
      const value = this.parseExpression();

      declarations.push({
        type: 'ConstDeclaration',
        name,
        value,
        location: mergeLocations(name.location!, value.location!)
      });
    } while (this.match(TokenKind.Comma));

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after const declaration").location.end;

    return {
      type: 'ConstStatement',
      declarations,
      location: createLocation(start, end)
    };
  }

  /**
   * 修飾子をパース
   */
  private parseModifiers(): string[] {
    const modifiers: string[] = [];

    while (this.checkModifierToken()) {
      modifiers.push(this.advance().text.toLowerCase());
    }

    return modifiers;
  }

  /**
   * 修飾子かチェック
   */
  private checkModifierToken(): boolean {
    const kind = this.peek().kind;
    return kind === TokenKind.Public ||
      kind === TokenKind.Private ||
      kind === TokenKind.Protected ||
      kind === TokenKind.Static ||
      kind === TokenKind.Abstract ||
      kind === TokenKind.Final ||
      kind === TokenKind.Readonly;
  }

  /**
   * トレイトボディをパース
   */
  private parseTraitBody(): AST.TraitMember[] {
    const members: AST.TraitMember[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      if (this.match(TokenKind.Use)) {
        members.push(this.parseTraitUse());
      } else {
        const modifiers = this.parseModifiers();

        if (this.match(TokenKind.Function)) {
          members.push(this.parseMethod(modifiers as AST.MethodModifier[]));
        } else if (this.check(TokenKind.Variable)) {
          members.push(this.parseProperty(modifiers as ('public' | 'private' | 'protected' | 'static' | 'readonly')[]));
        } else {
          throw this.error(this.peek(), "Expected method or property in trait body");
        }
      }
    }

    return members;
  }

  /**
   * クラスボディをパース
   */
  private parseClassBody(): AST.ClassMember[] {
    const members: AST.ClassMember[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      const member = this.parseClassMember();
      if (member) members.push(member);
    }

    return members;
  }

  /**
   * クラスメンバーをパース
   */
  private parseClassMember(): AST.ClassMember | null {
    // Trait use
    if (this.match(TokenKind.Use)) {
      return this.parseTraitUse();
    }

    // Const
    if (this.match(TokenKind.Const)) {
      return this.parseClassConstant();
    }

    // Modifiers
    const modifiers: string[] = [];
    while (this.checkModifierToken()) {
      modifiers.push(this.advance().text.toLowerCase());
    }

    // Function (method)
    if (this.match(TokenKind.Function)) {
      return this.parseMethod(modifiers as AST.MethodModifier[]);
    }

    // Property
    if (this.check(TokenKind.Variable)) {
      return this.parseProperty(modifiers as AST.PropertyModifier[]);
    }

    // PHP 8.0+ typed properties without explicit visibility
    if (modifiers.length > 0 || this.checkType()) {
      return this.parseProperty(modifiers as AST.PropertyModifier[]);
    }

    return null;
  }

  /**
   * trait use をパース
   */
  private parseTraitUse(): AST.TraitUse {
    const start = this.tokens[this.current - 1].location.start;
    const traits: AST.NameExpression[] = [];

    do {
      traits.push(this.parseNameExpression());
    } while (this.match(TokenKind.Comma));

    let adaptations: AST.TraitAdaptation[] | undefined;

    if (this.match(TokenKind.LeftBrace)) {
      adaptations = [];

      while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
        const trait = this.parseNameExpression();
        this.consume(TokenKind.DoubleColon, "Expected '::' in trait adaptation");
        const method = this.parseIdentifier();

        if (this.match(TokenKind.As)) {
          // Alias
          let visibility: AST.Visibility | undefined;
          if (this.match(TokenKind.Public)) visibility = 'public';
          else if (this.match(TokenKind.Protected)) visibility = 'protected';
          else if (this.match(TokenKind.Private)) visibility = 'private';

          const alias = visibility ? this.parseIdentifier() : method;

          adaptations.push({
            type: 'TraitAlias',
            trait,
            method,
            visibility,
            alias,
            location: mergeLocations(trait.location!, alias.location!)
          });
        } else if (this.match(TokenKind.Insteadof)) {
          // Precedence
          const insteadof: AST.NameExpression[] = [];
          do {
            insteadof.push(this.parseNameExpression());
          } while (this.match(TokenKind.Comma));

          adaptations.push({
            type: 'TraitPrecedence',
            trait,
            method,
            insteadOf: insteadof,
            location: mergeLocations(
              trait.location!,
              insteadof[insteadof.length - 1].location!
            )
          });
        }

        this.consume(TokenKind.Semicolon, "Expected ';' after trait adaptation");
      }

      this.consume(TokenKind.RightBrace, "Expected '}' after trait adaptations");
    } else {
      this.consume(TokenKind.Semicolon, "Expected ';' or '{' after trait use");
    }

    const end = this.previous().location.end;

    return {
      type: 'TraitUseStatement',
      traits,
      adaptations,
      location: createLocation(start, end)
    };
  }

  /**
   * クラス定数をパース
   */
  parseClassConstant(): AST.ClassConstant {
    const start = this.tokens[this.current - 1].location.start;
    const constants: Array<{ name: AST.Identifier; value: AST.Expression }> = [];

    do {
      const name = this.parseIdentifier();
      this.consume(TokenKind.Equal, "Expected '=' after const name");
      const value = this.parseExpression();

      constants.push({
        name,
        value
      });
    } while (this.match(TokenKind.Comma));

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after class constant").location.end;

    return {
      type: 'ClassConstant',
      constants,
      modifiers: [], // TODO: parse visibility modifiers
      location: createLocation(start, end)
    };
  }

  /**
   * メソッドをパース
   */
  parseMethod(modifiers: AST.MethodModifier[]): AST.MethodDeclaration {
    const start = this.previous().location.start;
    const byReference = this.match(TokenKind.Ampersand);
    const name = this.parseIdentifier();

    this.consume(TokenKind.LeftParen, "Expected '(' after method name");
    const parameters = this.parseParameterList();
    this.consume(TokenKind.RightParen, "Expected ')' after parameters");

    const returnType = this.match(TokenKind.Colon) ? this.parseType() : undefined;

    let body: AST.BlockStatement | undefined;
    if (!modifiers.includes('abstract')) {
      body = this.parseBlockStatement();
    } else {
      this.consume(TokenKind.Semicolon, "Expected ';' after abstract method");
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
      location: createLocation(start, end)
    };
  }

  /**
   * プロパティをパース
   */
  private parseProperty(modifiers: ('public' | 'private' | 'protected' | 'static' | 'readonly')[]): AST.PropertyDeclaration {
    const start = modifiers.length > 0
      ? this.tokens[this.current - modifiers.length].location.start
      : this.peek().location.start;

    // Type hint
    let typeAnnotation: AST.TypeNode | undefined;
    if (!this.check(TokenKind.Variable)) {
      typeAnnotation = this.parseType();
    }

    // PHPでは一度に一つのプロパティしか宣言できないので、直接PropertyDeclarationを作成

    const varExpr = this.parseVariable();
    // VariableExpression から property 名を取得
    if (varExpr.type !== 'VariableExpression' || typeof varExpr.name !== 'string') {
      throw this.error(this.peek(), 'Property name must be a simple variable');
    }

    const name: AST.Identifier = {
      type: 'Identifier',
      name: varExpr.name.substring(1), // $ を除去
      location: varExpr.location
    };

    let initializer: AST.Expression | undefined;

    if (this.match(TokenKind.Equal)) {
      initializer = this.parseExpression();
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after property declaration").location.end;

    return {
      type: 'PropertyDeclaration',
      name,
      initializer,
      typeAnnotation,
      modifiers: modifiers.length > 0 ? modifiers : [],
      location: createLocation(start, end)
    };
  }

  /**
   * パラメータリストをパース
   */
  protected parseParameterList(): AST.Parameter[] {
    const parameters: AST.Parameter[] = [];

    while (!this.check(TokenKind.RightParen) && !this.isAtEnd()) {
      parameters.push(this.parseParameter());

      if (!this.check(TokenKind.RightParen)) {
        this.consume(TokenKind.Comma, "Expected ',' after parameter");
      }
    }

    return parameters;
  }

  /**
   * パラメータをパース
   */
  private parseParameter(): AST.Parameter {
    const start = this.peek().location.start;

    // Promoted properties (PHP 8.0+)
    const promoted: AST.PropertyModifier[] = [];
    while (this.match(TokenKind.Public, TokenKind.Protected, TokenKind.Private, TokenKind.Readonly)) {
      promoted.push(this.previous().text.toLowerCase() as AST.PropertyModifier);
    }

    // Type
    let typeAnnotation: AST.TypeNode | undefined;
    if (!this.check(TokenKind.Ellipsis) && !this.check(TokenKind.Ampersand) && !this.check(TokenKind.Variable)) {
      typeAnnotation = this.parseType();
    }

    // By reference
    const byReference = this.match(TokenKind.Ampersand);

    // Variadic
    const variadic = this.match(TokenKind.Ellipsis);

    // Name
    const name = this.parseVariable();

    // Default value
    let defaultValue: AST.Expression | undefined;
    if (this.match(TokenKind.Equal)) {
      defaultValue = this.parseExpression();
    }

    const end = defaultValue?.location?.end || name.location!.end;

    return {
      type: 'Parameter',
      name,
      typeAnnotation,
      defaultValue,
      byReference,
      variadic,
      promoted: promoted.length > 0 ? promoted : undefined,
      location: createLocation(start, end)
    };
  }

  /**
   * 型をパース
   */
  parseType(): AST.TypeNode {
    const start = this.peek().location.start;

    // Nullable type
    if (this.match(TokenKind.Question)) {
      const typeAnnotation = this.parseType();
      return {
        type: 'NullableType',
        typeAnnotation,
        location: createLocation(start, typeAnnotation.location!.end)
      };
    }

    // Union/Intersection types
    let types: AST.TypeNode[] = [];
    types.push(this.parseSingleType());

    // Union type (|)
    if (this.check(TokenKind.Pipe)) {
      while (this.match(TokenKind.Pipe)) {
        types.push(this.parseSingleType());
      }

      return {
        type: 'UnionType',
        types,
        location: createLocation(start, types[types.length - 1].location!.end)
      };
    }

    // Intersection type (&)
    if (this.check(TokenKind.Ampersand)) {
      while (this.match(TokenKind.Ampersand)) {
        types.push(this.parseSingleType());
      }

      return {
        type: 'IntersectionType',
        types,
        location: createLocation(start, types[types.length - 1].location!.end)
      };
    }

    return types[0];
  }

  /**
   * 単一型をパース
   */
  private parseSingleType(): AST.TypeNode {

    // Array type
    if (this.match(TokenKind.Array)) {
      return {
        type: 'ArrayType',
        elementType: { type: 'SimpleType', name: 'mixed' } as AST.SimpleType,
        location: this.previous().location
      };
    }

    // Callable type
    if (this.match(TokenKind.Callable)) {
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
    } as AST.SimpleType;
  }


  /**
   * 型の開始をチェック
   */
  private checkType(): boolean {
    return this.check(TokenKind.Array) ||
      this.check(TokenKind.Callable) ||
      this.check(TokenKind.Question) ||
      this.check(TokenKind.Identifier) ||
      this.check(TokenKind.Backslash);
  }
}