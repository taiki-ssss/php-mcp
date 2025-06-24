/**
 * Declaration Parser Module
 * 
 * Handles parsing of PHP declarations including classes, functions,
 * interfaces, traits, enums, and namespaces.
 * 
 * @module declaration
 */

import { TokenKind } from '../core/token.js';
import * as AST from '../core/ast.js';
import { SourcePosition, createLocation, mergeLocations } from '../core/location.js';
import { StatementParser } from './statement.js';

/**
 * Declaration parser that extends StatementParser to handle
 * PHP declarations and top-level constructs.
 * 
 * @extends StatementParser
 */
export class DeclarationParser extends StatementParser {
  /**
   * Parse a block item (statement or declaration)
   * Overrides the parent method to handle declarations inside blocks
   */
  protected parseBlockItem(): AST.Statement | null {
    return this.parseDeclaration();
  }

  /**
   * Parses a top-level declaration or statement.
   * 
   * This method handles:
   * - Class declarations (with modifiers like abstract, final, readonly)
   * - Function declarations
   * - Interface declarations
   * - Trait declarations
   * - Enum declarations
   * - Namespace declarations
   * - Use statements
   * - Const statements
   * - Regular statements (fallback)
   * 
   * @returns The parsed declaration or statement, or null
   * @throws ParseError if invalid syntax is encountered
   */
  parseDeclaration(): AST.Statement | null {
    this.skipWhitespaceAndComments();
    
    // Check for class modifiers (abstract, final, readonly)
    const modifierResult = this.tryParseClassWithModifiers();
    if (modifierResult !== null) {
      return modifierResult;
    }

    // Try to parse function declaration
    const functionResult = this.tryParseFunctionDeclaration();
    if (functionResult !== null) {
      return functionResult;
    }

    // Try to parse class declaration
    const classResult = this.tryParseClassDeclaration();
    if (classResult !== null) {
      return classResult;
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

    return this.parseStatement();
  }

  /**
   * Skip whitespace, newlines, and comments
   */
  private skipWhitespaceAndComments(): void {
    while (this.peek().kind === TokenKind.Whitespace || 
           this.peek().kind === TokenKind.Newline ||
           this.peek().kind === TokenKind.Comment ||
           this.peek().kind === TokenKind.DocComment) {
      this.advance();
    }
  }

  /**
   * Try to parse a class declaration with modifiers
   * @returns The parsed class declaration or null if not a modified class
   */
  private tryParseClassWithModifiers(): AST.Statement | null {
    if (!this.check(TokenKind.Abstract) && !this.check(TokenKind.Final) && !this.check(TokenKind.Readonly)) {
      return null;
    }

    const savedPos = this.current;
    const modifiers: string[] = [];
    
    // Collect all modifiers
    while (this.check(TokenKind.Abstract) || this.check(TokenKind.Final) || this.check(TokenKind.Readonly)) {
      modifiers.push(this.advance().text.toLowerCase());
    }
    
    // If followed by 'class', it's a class declaration with modifiers
    if (this.check(TokenKind.Class)) {
      this.advance(); // consume 'class'
      return this.parseClassDeclaration(modifiers);
    }
    
    // Otherwise, restore position and treat as statement
    this.current = savedPos;
    return this.parseStatement();
  }

  /**
   * Try to parse a function declaration
   * @returns The parsed function declaration or null if not a function
   */
  private tryParseFunctionDeclaration(): AST.Statement | null {
    if (!this.check(TokenKind.Function)) {
      return null;
    }

    // Check if this is a function declaration or an anonymous function
    const savedPos = this.current;
    this.advance(); // consume 'function'
    
    // If followed by '(' it's an anonymous function expression
    if (this.check(TokenKind.LeftParen)) {
      this.current = savedPos; // restore position
      return this.parseStatement();
    }
    
    // Otherwise, it's a function declaration
    return this.parseFunctionDeclaration();
  }

  /**
   * Try to parse a class declaration
   * @returns The parsed class declaration or null if not a class
   */
  private tryParseClassDeclaration(): AST.Statement | null {
    if (!this.check(TokenKind.Class)) {
      return null;
    }

    // Check if this is a class declaration or an expression like Class::method()
    const savedPos = this.current;
    this.advance(); // consume 'class'
    
    // If followed by an identifier, it's a class declaration
    if (this.check(TokenKind.Identifier)) {
      this.current = savedPos; // restore position
      this.advance(); // consume 'class' again
      return this.parseClassDeclaration();
    }
    
    // If followed by '{' or other declaration-specific tokens, it's an incomplete class declaration
    if (this.check(TokenKind.LeftBrace) || this.check(TokenKind.Extends) || 
        this.check(TokenKind.Implements) || this.check(TokenKind.CloseTag) ||
        this.check(TokenKind.Semicolon) || this.isAtEnd()) {
      throw this.error(this.peek(), "Expected class name after 'class'");
    }
    
    // Otherwise, treat it as an expression (e.g., Class::method())
    this.current = savedPos; // restore position
    return this.parseStatement();
  }

  /**
   * Parses a function declaration.
   * 
   * Handles:
   * - Function name
   * - Reference operator (&)
   * - Parameter list
   * - Return type declaration
   * - Function body
   * 
   * @private
   * @returns The parsed function declaration
   * @throws ParseError if function syntax is invalid
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
   * Parses a class declaration.
   * 
   * Handles:
   * - Class modifiers (abstract, final, readonly)
   * - Class name
   * - Extends clause (inheritance)
   * - Implements clause (interface implementation)
   * - Class body with members
   * 
   * @private
   * @param providedModifiers - Pre-parsed modifiers (abstract, final, readonly)
   * @returns The parsed class declaration
   * @throws ParseError if class syntax is invalid
   */
  private parseClassDeclaration(providedModifiers?: string[]): AST.ClassDeclaration {
    const start = providedModifiers && providedModifiers.length > 0
      ? this.tokens[this.current - providedModifiers.length - 1].location.start
      : this.previous().location.start;
    
    const modifiers: AST.ClassModifier[] = [];

    // Add provided modifiers if any
    if (providedModifiers) {
      for (const mod of providedModifiers) {
        if (mod === 'abstract' || mod === 'final' || mod === 'readonly') {
          modifiers.push(mod);
        }
      }
    }

    // PHP 8.0+ readonly classes (legacy check for backward compatibility)
    if (!providedModifiers && this.previous().kind === TokenKind.Readonly) {
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
   * Parses an interface declaration.
   * 
   * Handles:
   * - Interface name
   * - Extends clause (multiple interface inheritance)
   * - Interface body with method signatures and constants
   * 
   * @private
   * @returns The parsed interface declaration
   * @throws ParseError if interface syntax is invalid
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
      // Collect modifiers first
      const modifiers = this.parseModifiers();

      // const
      if (this.match(TokenKind.Const)) {
        // Parse interface constant using the same logic as class constants
        // If no modifiers provided, default to public
        const finalModifiers = modifiers.length > 0 ? modifiers : ['public'];
        const constant = this.parseClassConstantWithModifiers(finalModifiers as ('public' | 'private' | 'protected' | 'final')[]);
        body.push(constant);
      } else if (this.match(TokenKind.Function)) {
        // method
        // Interface methods are implicitly abstract
        if (!modifiers.includes('abstract')) {
          modifiers.push('abstract');
        }
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
   * Parses a trait declaration.
   * 
   * Traits are a mechanism for code reuse in PHP.
   * 
   * @private
   * @returns The parsed trait declaration
   * @throws ParseError if trait syntax is invalid
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
   * Parses an enum declaration (PHP 8.1+).
   * 
   * Handles:
   * - Enum name
   * - Backed enums (int or string type)
   * - Interface implementation
   * - Enum cases with optional values
   * - Methods and constants
   * 
   * @private
   * @returns The parsed enum declaration
   * @throws ParseError if enum syntax is invalid
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
      interfaces: interfaces.length > 0 ? interfaces : undefined,
      body,
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a namespace declaration.
   * 
   * Handles both bracketed and unbracketed namespace syntax:
   * - Bracketed: namespace Foo { ... }
   * - Unbracketed: namespace Foo; ...
   * 
   * @protected
   * @returns The parsed namespace declaration
   * @throws ParseError if namespace syntax is invalid
   */
  protected parseNamespaceDeclaration(): AST.NamespaceDeclaration {
    const start = this.previous().location.start;
    let name: AST.NameExpression | undefined;

    // Namespace name is optional (global namespace)
    if (!this.check(TokenKind.LeftBrace) && !this.check(TokenKind.Semicolon)) {
      name = this.parseNameExpression();
    } else if (this.check(TokenKind.Semicolon)) {
      // namespace; without a name is invalid
      throw this.error(this.peek(), "Expected namespace name before ';'");
    }

    let statements: AST.Statement[] = [];
    let end: SourcePosition;

    if (this.match(TokenKind.LeftBrace)) {
      // Bracketed namespace
      while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
        const stmt = this.parseDeclaration();
        if (stmt) statements.push(stmt);
      }
      end = this.consume(TokenKind.RightBrace, "Expected '}' after namespace body").location.end;
    } else {
      // Unbracketed namespace
      this.consume(TokenKind.Semicolon, "Expected ';' or '{' after namespace name");

      // Parse until end of file, next namespace, or PHP closing tag
      while (!this.isAtEnd() && !this.check(TokenKind.Namespace) && !this.check(TokenKind.CloseTag)) {
        const stmt = this.parseDeclaration();
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
   * Parses a use statement for importing namespaces.
   * 
   * Handles:
   * - Simple use: use Foo\Bar;
   * - Aliased use: use Foo\Bar as Baz;
   * - Grouped use: use Foo\{Bar, Baz};
   * - Function/const imports: use function foo; use const FOO;
   * 
   * @private
   * @returns The parsed use statement
   * @throws ParseError if use statement syntax is invalid
   */
  private parseUseStatement(): AST.UseStatement {
    const start = this.previous().location.start;
    const items: AST.UseItem[] = [];

    // Determine use statement kind (normal, function, const)
    const kind = this.parseUseKind();

    // Check for grouped use syntax: use Foo\{Bar, Baz}
    const baseNameParts: string[] = [];
    let isGrouped = false;

    // Parse the base namespace part before '{'
    while (!this.check(TokenKind.LeftBrace) && !this.check(TokenKind.Semicolon) && !this.check(TokenKind.Comma) && !this.check(TokenKind.As)) {
      if (this.check(TokenKind.Identifier)) {
        baseNameParts.push(this.advance().text);
        if (this.check(TokenKind.Backslash)) {
          this.advance(); // consume backslash
        }
      } else {
        break;
      }
    }

    // Check if this is grouped use
    if (this.match(TokenKind.LeftBrace)) {
      isGrouped = true;
      this.parseGroupedUseItems(items, baseNameParts, kind);
    } else {
      // Non-grouped use
      this.parseNonGroupedUseItems(items, baseNameParts, kind);
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after use statement").location.end;

    return {
      type: 'UseStatement',
      items,
      kind,
      location: createLocation(start, end)
    };
  }

  /**
   * Parse the kind of use statement (normal, function, or const)
   */
  private parseUseKind(): 'normal' | 'function' | 'const' {
    if (this.match(TokenKind.Function)) {
      return 'function';
    } else if (this.match(TokenKind.Const)) {
      return 'const';
    }
    return 'normal';
  }

  /**
   * Parse grouped use items (e.g., use Foo\{Bar, Baz})
   */
  private parseGroupedUseItems(items: AST.UseItem[], baseNameParts: string[], defaultKind: 'normal' | 'function' | 'const'): void {
    do {
      // Check for function/const inside group
      let itemKind = defaultKind;
      if (this.match(TokenKind.Function)) {
        itemKind = 'function';
      } else if (this.match(TokenKind.Const)) {
        itemKind = 'const';
      }

      // Parse the item name
      const itemNameParts = [...baseNameParts];
      while (this.check(TokenKind.Identifier)) {
        itemNameParts.push(this.advance().text);
        if (this.check(TokenKind.Backslash)) {
          this.advance();
        }
      }

      let alias: AST.Identifier | undefined;
      if (this.match(TokenKind.As)) {
        alias = this.parseIdentifier();
      }

      const nameLocation = this.previous().location;
      items.push({
        type: 'UseItem',
        name: {
          type: 'NameExpression',
          parts: itemNameParts,
          location: nameLocation
        },
        alias,
        kind: itemKind,
        location: mergeLocations(nameLocation, alias?.location || nameLocation)
      });
    } while (this.match(TokenKind.Comma));

    this.consume(TokenKind.RightBrace, "Expected '}' after grouped use items");
  }

  /**
   * Parse non-grouped use items
   */
  private parseNonGroupedUseItems(items: AST.UseItem[], baseNameParts: string[], kind: 'normal' | 'function' | 'const'): void {
    // Restore the parsed name if needed
    if (baseNameParts.length === 0) {
      baseNameParts.push(...this.parseNameExpression().parts);
    }

    let alias: AST.Identifier | undefined;
    if (this.match(TokenKind.As)) {
      alias = this.parseIdentifier();
    }

    const nameLocation = this.previous().location;
    items.push({
      type: 'UseItem',
      name: {
        type: 'NameExpression',
        parts: baseNameParts,
        location: nameLocation
      },
      alias,
      kind,
      location: mergeLocations(nameLocation, alias?.location || nameLocation)
    });

    // Handle multiple non-grouped use items
    while (this.match(TokenKind.Comma)) {
      const name = this.parseNameExpression();
      let alias: AST.Identifier | undefined;

      if (this.match(TokenKind.As)) {
        alias = this.parseIdentifier();
      }

      items.push({
        type: 'UseItem',
        name,
        alias,
        kind,
        location: mergeLocations(name.location!, alias?.location || name.location!)
      });
    }
  }

  /**
   * Parses a const statement for declaring constants.
   * 
   * Handles multiple constant declarations in a single statement:
   * const FOO = 1, BAR = 2;
   * 
   * @private
   * @returns The parsed const statement
   * @throws ParseError if const syntax is invalid
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
   * Parses class member modifiers.
   * 
   * Handles visibility modifiers (public, private, protected)
   * and other modifiers (static, abstract, final, readonly).
   * Validates against duplicate and conflicting modifiers.
   * 
   * @private
   * @returns Array of modifier strings
   * @throws ParseError if invalid modifier combination is found
   */
  private parseModifiers(): string[] {
    const modifiers: string[] = [];
    const modifierSet = new Set<string>();

    while (this.checkClassModifierToken()) {
      const modifier = this.advance().text.toLowerCase();
      
      // Check for duplicate visibility modifiers
      if (modifier === 'public' || modifier === 'private' || modifier === 'protected') {
        if (modifierSet.has('public') || modifierSet.has('private') || modifierSet.has('protected')) {
          throw this.error(this.previous(), "Cannot use multiple visibility modifiers");
        }
      }
      
      // Check for any duplicate modifier
      if (modifierSet.has(modifier)) {
        throw this.error(this.previous(), `Duplicate modifier '${modifier}'`);
      }
      
      modifiers.push(modifier);
      modifierSet.add(modifier);
    }

    return modifiers;
  }

  /**
   * Checks if the current token is a valid class/method/property modifier.
   * 
   * @private
   * @returns True if the current token is a modifier, false otherwise
   */
  private checkClassModifierToken(): boolean {
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
   * Parses the body of a trait declaration.
   * 
   * Trait bodies can contain:
   * - Methods
   * - Properties
   * - Use statements (for trait composition)
   * 
   * @private
   * @returns Array of trait members
   * @throws ParseError if invalid trait member is encountered
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
        } else if (this.check(TokenKind.Variable) || this.checkType()) {
          members.push(this.parseProperty(modifiers as ('public' | 'private' | 'protected' | 'static' | 'readonly')[]));
        } else {
          throw this.error(this.peek(), "Expected method or property in trait body");
        }
      }
    }

    return members;
  }

  /**
   * Parses the body of a class declaration.
   * 
   * Class bodies can contain:
   * - Properties
   * - Methods
   * - Constants
   * - Trait use statements
   * 
   * @protected
   * @returns Array of class members
   * @throws ParseError if invalid class member is encountered
   */
  protected parseClassBody(): AST.ClassMember[] {
    const members: AST.ClassMember[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      const member = this.parseClassMember();
      if (member) {
        members.push(member);
      } else {
        // If parseClassMember returns null, skip the current token to avoid infinite loop
        if (!this.check(TokenKind.RightBrace)) {
          this.advance();
        }
      }
    }

    return members;
  }

  /**
   * Parses a single class member.
   * 
   * Determines the type of member based on keywords and modifiers:
   * - Trait use statements
   * - Constants (with visibility modifiers)
   * - Methods
   * - Properties (typed or untyped)
   * 
   * @protected
   * @returns The parsed class member or null if none found
   * @throws ParseError if invalid syntax is encountered
   */
  protected parseClassMember(): AST.ClassMember | null {
    // Trait use
    if (this.match(TokenKind.Use)) {
      return this.parseTraitUse();
    }

    // Modifiers
    const modifiers = this.parseModifiers();

    // Const with modifiers
    if (this.match(TokenKind.Const)) {
      return this.parseClassConstantWithModifiers(modifiers as ('public' | 'private' | 'protected' | 'final')[]);
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

    // If we have modifiers but no recognized member type, there's an error
    if (modifiers.length > 0) {
      throw this.error(this.peek(), `Unexpected token after modifiers: ${this.peek().text}`);
    }

    return null;
  }

  /**
   * Parses a trait use statement within a class.
   * 
   * Handles:
   * - Simple trait use: use TraitA, TraitB;
   * - Trait adaptations with aliases and precedence:
   *   use TraitA {
   *     method as private aliasMethod;
   *     TraitA::method insteadof TraitB;
   *   }
   * 
   * @private
   * @returns The parsed trait use statement
   * @throws ParseError if trait use syntax is invalid
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
        // Check if this is a method-only adaptation (no trait specified)
        let trait: AST.NameExpression | undefined;
        let method: AST.Identifier;
        
        // Try to parse trait::method or just method
        const savedPos = this.current;
        
        // First, check if we have an identifier followed by :: 
        // Skip whitespace
        while (this.peek().kind === TokenKind.Whitespace || 
               this.peek().kind === TokenKind.Newline ||
               this.peek().kind === TokenKind.Comment) {
          this.advance();
        }
        
        if (this.check(TokenKind.Identifier)) {
          const firstIdentifier = this.advance();
          
          // Skip whitespace after identifier
          while (this.peek().kind === TokenKind.Whitespace || 
                 this.peek().kind === TokenKind.Newline ||
                 this.peek().kind === TokenKind.Comment) {
            this.advance();
          }
          
          if (this.check(TokenKind.DoubleColon)) {
            // It's trait::method format, parse the full name expression
            this.current = savedPos;
            trait = this.parseNameExpression();
            this.consume(TokenKind.DoubleColon, "Expected '::' after trait name");
            method = this.parseIdentifier();
          } else {
            // It's just a method name
            method = {
              type: 'Identifier',
              name: firstIdentifier.text,
              location: firstIdentifier.location
            };
          }
        } else {
          throw this.error(this.peek(), "Expected method name in trait adaptation");
        }

        if (this.match(TokenKind.As)) {
          // Alias
          let visibility: AST.Visibility | undefined;
          let alias: AST.Identifier = method; // Default alias is the method itself
          
          if (this.match(TokenKind.Public)) visibility = 'public';
          else if (this.match(TokenKind.Protected)) visibility = 'protected';
          else if (this.match(TokenKind.Private)) visibility = 'private';

          // If we have a visibility modifier, the next token should be the alias name
          if (visibility && this.check(TokenKind.Identifier)) {
            alias = this.parseIdentifier();
          } else if (!visibility && this.check(TokenKind.Identifier)) {
            // No visibility modifier, but we have an alias name
            alias = this.parseIdentifier();
          }

          adaptations.push({
            type: 'TraitAlias',
            trait,
            method,
            visibility,
            alias,
            location: mergeLocations(trait?.location || method.location!, alias.location!)
          });
        } else if (this.match(TokenKind.Insteadof)) {
          // Precedence - trait is required for insteadof
          if (!trait) {
            throw this.error(this.previous(), "Trait name is required before '::' when using 'insteadof'");
          }
          
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
   * Parses a class constant declaration with visibility modifiers.
   * 
   * Supports:
   * - Visibility modifiers (public, private, protected)
   * - Final modifier
   * - Typed constants (PHP 8.3+)
   * 
   * @private
   * @param modifiers - Pre-parsed visibility and final modifiers
   * @returns The parsed constant declaration
   * @throws ParseError if constant syntax is invalid
   */
  private parseClassConstantWithModifiers(modifiers: ('public' | 'private' | 'protected' | 'final')[]): AST.ConstantDeclaration {
    const start = modifiers.length > 0 
      ? this.tokens[this.current - modifiers.length - 1].location.start
      : this.tokens[this.current - 1].location.start;
    // Check for typed constant (PHP 8.3+)
    let typeAnnotation: AST.TypeNode | undefined;
    let name: AST.Identifier;
    
    // Look ahead to see if this is a typed constant
    // Pattern: const <type> <name> = <value>
    if (this.check(TokenKind.Identifier)) {
      const saved = this.current;
      const firstIdentifier = this.advance();
      
      // If next token is also an identifier, first was the type
      if (this.check(TokenKind.Identifier)) {
        // This is a typed constant
        typeAnnotation = {
          type: 'SimpleType',
          name: firstIdentifier.text,
          location: firstIdentifier.location
        };
        name = this.parseIdentifier();
      } else {
        // Not a typed constant, rewind
        this.current = saved;
        name = this.parseIdentifier();
      }
    } else {
      name = this.parseIdentifier();
    }
    
    this.consume(TokenKind.Equal, "Expected '=' after const name");
    const value = this.parseExpression();

    // For now, we only support single constant declarations
    // Multiple declarations in one statement are not common in modern PHP
    if (this.check(TokenKind.Comma)) {
      throw this.error(this.peek(), "Multiple constant declarations in one statement are not supported");
    }

    const end = this.consume(TokenKind.Semicolon, "Expected ';' after class constant").location.end;

    return {
      type: 'ConstantDeclaration',
      name,
      value,
      typeAnnotation,
      modifiers: modifiers.length > 0 ? modifiers : ['public'], // Default to public if no modifiers
      location: createLocation(start, end)
    };
  }

  /**
   * Parses a method declaration.
   * 
   * Handles:
   * - Method modifiers (visibility, static, abstract, final)
   * - Reference return (&)
   * - Parameter list
   * - Return type declaration
   * - Method body (or semicolon for abstract methods)
   * 
   * @param modifiers - Pre-parsed method modifiers
   * @returns The parsed method declaration
   * @throws ParseError if method syntax is invalid
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
   * Parses a property declaration.
   * 
   * Supports:
   * - Property modifiers (visibility, static, readonly)
   * - Type declarations (PHP 7.4+)
   * - Property initializers
   * 
   * @private
   * @param modifiers - Pre-parsed property modifiers
   * @returns The parsed property declaration
   * @throws ParseError if property syntax is invalid
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

    // PHP only allows one property per declaration, create PropertyDeclaration directly

    this.consume(TokenKind.Variable, "Expected property variable");
    const varExpr = this.parseVariable();
    // Extract property name from VariableExpression
    if (varExpr.type !== 'VariableExpression' || typeof varExpr.name !== 'string') {
      throw this.error(this.peek(), 'Property name must be a simple variable');
    }

    const name: AST.Identifier = {
      type: 'Identifier',
      name: varExpr.name,
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
   * Parses a list of function/method parameters.
   * 
   * @protected
   * @returns Array of parsed parameters
   */
  protected parseParameterList(): AST.Parameter[] {
    const parameters: AST.Parameter[] = [];

    if (!this.check(TokenKind.RightParen)) {
      do {
        parameters.push(this.parseParameter());
      } while (this.match(TokenKind.Comma));
    }

    return parameters;
  }




}