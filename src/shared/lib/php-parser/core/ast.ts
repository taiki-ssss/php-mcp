/**
 * Modern PHP AST Type Definitions
 * 
 * Type-safe AST definitions using discriminated unions.
 * Each node type has a unique 'type' property for easy pattern matching.
 * 
 * @module ast
 */

import { SourceLocation } from './location.js';

// Re-export for convenience
export { SourceLocation };

/**
 * Base interface for all AST nodes.
 * 
 * Every AST node has:
 * - A discriminating 'type' property for type narrowing
 * - An optional location for source mapping
 */
export interface BaseNode {
  /** Discriminator property for type narrowing */
  readonly type: string;
  /** Source location information */
  readonly location?: SourceLocation;
}

// ==================== Program ====================

/**
 * Generic program node (used for compatibility).
 */
export interface Program extends BaseNode {
  readonly type: 'Program';
  readonly statements: Statement[];
}

/**
 * Root node of a PHP program.
 * Contains all top-level statements in the file.
 */
export interface PhpProgram extends BaseNode {
  readonly type: 'PhpProgram';
  readonly statements: Statement[];
}

// ==================== Statements ====================

/**
 * Union type of all possible statement nodes.
 * Statements are executable units in PHP.
 */
export type Statement =
  | ExpressionStatement
  | BlockStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | ForeachStatement
  | DoWhileStatement
  | SwitchStatement
  | BreakStatement
  | ContinueStatement
  | ReturnStatement
  | ThrowStatement
  | TryStatement
  | FunctionDeclaration
  | ClassDeclaration
  | InterfaceDeclaration
  | TraitDeclaration
  | EnumDeclaration
  | NamespaceDeclaration
  | UseStatement
  | EchoStatement
  | GlobalStatement
  | StaticStatement
  | ConstStatement
  | UnsetStatement
  | GotoStatement
  | DeclareStatement
  | LabeledStatement
  | InlineHTMLStatement;

/**
 * Statement containing a single expression.
 */
export interface ExpressionStatement extends BaseNode {
  readonly type: 'ExpressionStatement';
  readonly expression: Expression;
}

/**
 * Block statement containing multiple statements.
 * Represents code within braces {}.
 */
export interface BlockStatement extends BaseNode {
  readonly type: 'BlockStatement';
  readonly statements: Statement[];
}

/**
 * If statement with optional elseif and else clauses.
 */
export interface IfStatement extends BaseNode {
  readonly type: 'IfStatement';
  /** Condition to test */
  readonly test: Expression;
  /** Statement to execute if test is truthy */
  readonly consequent: Statement;
  /** Array of elseif clauses */
  readonly elseifs: ElseIfClause[];
  /** Optional else clause */
  readonly alternate: Statement | null;
}

/**
 * Elseif clause within an if statement.
 */
export interface ElseIfClause extends BaseNode {
  readonly type: 'ElseIfClause';
  readonly test: Expression;
  readonly consequent: Statement;
}

/**
 * While loop statement.
 */
export interface WhileStatement extends BaseNode {
  readonly type: 'WhileStatement';
  readonly test: Expression;
  readonly body: Statement;
}

/**
 * For loop statement.
 */
export interface ForStatement extends BaseNode {
  readonly type: 'ForStatement';
  /** Initialization expression(s) */
  readonly init: Expression | null;
  /** Loop condition */
  readonly test: Expression | null;
  /** Update expression(s) */
  readonly update: Expression | null;
  /** Loop body */
  readonly body: Statement;
}

/**
 * Foreach loop statement.
 */
export interface ForeachStatement extends BaseNode {
  readonly type: 'ForeachStatement';
  /** Array or iterable to iterate over */
  readonly expression: Expression;
  /** Optional key variable */
  readonly key: Variable | null;
  /** Value variable */
  readonly value: Variable;
  /** Whether value is passed by reference */
  readonly byRef: boolean;
  /** Loop body */
  readonly body: Statement;
}

/**
 * Do-while loop statement.
 * Body executes at least once.
 */
export interface DoWhileStatement extends BaseNode {
  readonly type: 'DoWhileStatement';
  readonly body: Statement;
  readonly test: Expression;
}

/**
 * Switch statement.
 */
export interface SwitchStatement extends BaseNode {
  readonly type: 'SwitchStatement';
  /** Expression to switch on */
  readonly discriminant: Expression;
  /** Array of case clauses */
  readonly cases: SwitchCase[];
}

/**
 * Case clause within a switch statement.
 */
export interface SwitchCase extends BaseNode {
  readonly type: 'SwitchCase';
  /** Test expression (null for default case) */
  readonly test: Expression | null;
  /** Statements to execute for this case */
  readonly consequent: Statement[];
}

/**
 * Break statement to exit loops or switch.
 */
export interface BreakStatement extends BaseNode {
  readonly type: 'BreakStatement';
  /** Optional numeric label for nested breaks */
  readonly label: Expression | null;
}

/**
 * Continue statement to skip to next iteration.
 */
export interface ContinueStatement extends BaseNode {
  readonly type: 'ContinueStatement';
  /** Optional numeric label for nested continues */
  readonly label: Expression | null;
}

/**
 * Return statement.
 */
export interface ReturnStatement extends BaseNode {
  readonly type: 'ReturnStatement';
  /** Optional return value */
  readonly value: Expression | null;
}

/**
 * Throw statement for exceptions.
 */
export interface ThrowStatement extends BaseNode {
  readonly type: 'ThrowStatement';
  /** Exception to throw */
  readonly expression: Expression;
}

/**
 * Try-catch-finally statement.
 */
export interface TryStatement extends BaseNode {
  readonly type: 'TryStatement';
  /** Try block */
  readonly block: BlockStatement;
  /** Array of catch clauses */
  readonly handlers: CatchClause[];
  /** Optional finally block */
  readonly finalizer?: BlockStatement;
}

/**
 * Catch clause within a try statement.
 */
export interface CatchClause extends BaseNode {
  readonly type: 'CatchClause';
  /** Exception types to catch (can be union with |) */
  readonly types: NameExpression[];
  /** Variable to bind caught exception (optional in PHP 8+) */
  readonly param: VariableExpression | null;
  /** Catch block body */
  readonly body: BlockStatement;
}

/**
 * Echo statement for output.
 */
export interface EchoStatement extends BaseNode {
  readonly type: 'EchoStatement';
  /** Expressions to output */
  readonly expressions: Expression[];
}

/**
 * Global statement to import global variables.
 */
export interface GlobalStatement extends BaseNode {
  readonly type: 'GlobalStatement';
  /** Variables to make global */
  readonly variables: VariableExpression[];
}

/**
 * Static variable declaration statement.
 */
export interface StaticStatement extends BaseNode {
  readonly type: 'StaticStatement';
  /** Static variable declarations */
  readonly declarations: StaticVariableDeclaration[];
}

/**
 * Single static variable declaration.
 */
export interface StaticVariableDeclaration extends BaseNode {
  readonly type: 'StaticVariableDeclaration';
  /** Variable identifier */
  readonly id: VariableExpression;
  /** Optional initial value */
  readonly init: Expression | null;
}

/**
 * Variable declaration (used in various contexts).
 */
export interface VariableDeclaration extends BaseNode {
  readonly type: 'VariableDeclaration';
  readonly variable: VariableExpression;
  readonly initializer?: Expression;
}

/**
 * Const statement for declaring constants.
 */
export interface ConstStatement extends BaseNode {
  readonly type: 'ConstStatement';
  /** Constant declarations */
  readonly declarations: ConstDeclaration[];
}

/**
 * Single constant declaration.
 */
export interface ConstDeclaration extends BaseNode {
  readonly type: 'ConstDeclaration';
  /** Constant name */
  readonly name: Identifier;
  /** Constant value (must be compile-time constant) */
  readonly value: Expression;
}

/**
 * Unset statement to destroy variables.
 */
export interface UnsetStatement extends BaseNode {
  readonly type: 'UnsetStatement';
  /** Variables to unset */
  readonly variables: Expression[];
}

/**
 * Goto statement for jumping to labels.
 */
export interface GotoStatement extends BaseNode {
  readonly type: 'GotoStatement';
  /** Label name to jump to */
  readonly label: string;
}

/**
 * Declare statement for execution directives.
 */
export interface DeclareStatement extends BaseNode {
  readonly type: 'DeclareStatement';
  /** Directives (e.g., strict_types=1) */
  readonly directives: DeclareDirective[];
  /** Optional body (block or null) */
  readonly body: Statement | null;
}

/**
 * Single declare directive.
 */
export interface DeclareDirective extends BaseNode {
  readonly type: 'DeclareDirective';
  /** Directive name (e.g., 'strict_types') */
  readonly name: string;
  /** Directive value */
  readonly value: Expression;
}

/**
 * Label statement for goto targets.
 */
export interface LabeledStatement extends BaseNode {
  readonly type: 'LabeledStatement';
  /** Label name */
  readonly label: string;
}

/**
 * Inline HTML outside PHP tags.
 */
export interface InlineHTMLStatement extends BaseNode {
  readonly type: 'InlineHTMLStatement';
  /** HTML content */
  readonly value: string;
}

// ==================== Attributes ====================

/**
 * PHP 8+ attribute (annotation).
 */
export interface Attribute extends BaseNode {
  readonly type: 'Attribute';
  /** Attribute name */
  readonly name: NameExpression;
  /** Attribute arguments */
  readonly arguments: Argument[];
}

// ==================== Declarations ====================

/**
 * Function declaration.
 */
export interface FunctionDeclaration extends BaseNode {
  readonly type: 'FunctionDeclaration';
  /** Function name */
  readonly name: Identifier;
  /** Function parameters */
  readonly parameters: Parameter[];
  /** Optional return type */
  readonly returnType?: TypeNode;
  /** Function body */
  readonly body: BlockStatement;
  /** Whether function is async (not in standard PHP) */
  readonly isAsync?: boolean;
  /** Whether function returns by reference */
  readonly byReference?: boolean;
  /** PHP 8+ attributes */
  readonly attributes?: Attribute[];
}

/**
 * Class declaration.
 */
export interface ClassDeclaration extends BaseNode {
  readonly type: 'ClassDeclaration';
  /** Class name */
  readonly name: Identifier;
  /** Parent class to extend */
  readonly superClass?: NameExpression;
  /** Interfaces to implement */
  readonly interfaces?: NameExpression[];
  /** Class body members */
  readonly body: ClassMember[];
  /** Class modifiers */
  readonly modifiers?: ClassModifier[];
  /** PHP 8+ attributes */
  readonly attributes?: Attribute[];
}

/**
 * Possible class modifiers.
 */
export type ClassModifier = 'abstract' | 'final' | 'readonly';

/**
 * Union type of all possible class members.
 */
export type ClassMember =
  | PropertyDeclaration
  | MethodDeclaration
  | ConstructorDeclaration
  | ConstantDeclaration
  | ClassConstant
  | TraitUseStatement;

/**
 * Class property declaration.
 */
export interface PropertyDeclaration extends BaseNode {
  readonly type: 'PropertyDeclaration';
  /** Property name */
  readonly name: Identifier;
  /** Optional type annotation */
  readonly typeAnnotation?: TypeNode;
  /** Optional initial value */
  readonly initializer?: Expression;
  /** Property modifiers */
  readonly modifiers: PropertyModifier[];
  /** PHP 8.4+ property hooks */
  readonly hooks?: PropertyHook[];
  /** PHP 8+ attributes */
  readonly attributes?: Attribute[];
}

/**
 * Property hook (getter/setter) for PHP 8.4+.
 */
export interface PropertyHook extends BaseNode {
  readonly type: 'PropertyHook';
  /** Hook type */
  readonly kind: 'get' | 'set';
  /** Hook implementation */
  readonly body: BlockStatement | Expression;
}

/**
 * Class method declaration.
 */
export interface MethodDeclaration extends BaseNode {
  readonly type: 'MethodDeclaration';
  /** Method name */
  readonly name: Identifier;
  /** Method parameters */
  readonly parameters: Parameter[];
  /** Optional return type */
  readonly returnType?: TypeNode;
  /** Method body (null for abstract methods) */
  readonly body?: BlockStatement;
  /** Method modifiers */
  readonly modifiers: MethodModifier[];
  /** Whether method returns by reference */
  readonly byReference?: boolean;
  /** PHP 8+ attributes */
  readonly attributes?: Attribute[];
}

/**
 * Possible method modifiers.
 */
export type MethodModifier = 'public' | 'private' | 'protected' | 'static' | 'abstract' | 'final';

/**
 * Possible property modifiers.
 */
export type PropertyModifier = 'public' | 'private' | 'protected' | 'static' | 'readonly';

/**
 * Visibility levels.
 */
export type Visibility = 'public' | 'private' | 'protected';

/**
 * Constructor declaration (legacy format).
 * Note: Modern PHP uses MethodDeclaration with name '__construct'.
 */
export interface ConstructorDeclaration extends BaseNode {
  readonly type: 'ConstructorDeclaration';
  readonly parameters: Parameter[];
  readonly body: BlockStatement;
  readonly modifiers: ('public' | 'private' | 'protected')[];
}

/**
 * Class constant declaration (single constant).
 */
export interface ConstantDeclaration extends BaseNode {
  readonly type: 'ConstantDeclaration';
  /** Constant name */
  readonly name: Identifier;
  /** Constant value */
  readonly value: Expression;
  /** Optional type annotation (PHP 8.3+) */
  readonly typeAnnotation?: TypeNode;
  /** Constant modifiers */
  readonly modifiers: ('public' | 'private' | 'protected' | 'final')[];
  /** PHP 8+ attributes */
  readonly attributes?: Attribute[];
}

/**
 * Class constant declaration (multiple constants).
 * Legacy format for multiple constants in one declaration.
 */
export interface ClassConstant extends BaseNode {
  readonly type: 'ClassConstant';
  /** Array of constant definitions */
  readonly constants: Array<{
    readonly name: Identifier;
    readonly value: Expression;
  }>;
  /** Constant modifiers */
  readonly modifiers: ('public' | 'private' | 'protected' | 'final')[];
}

/**
 * Trait use statement within a class.
 */
/**
 * Trait use statement within a class.
 */
export interface TraitUseStatement extends BaseNode {
  readonly type: 'TraitUseStatement';
  /** Traits to use */
  readonly traits: NameExpression[];
  /** Optional trait adaptations (aliases, precedence) */
  readonly adaptations?: TraitAdaptation[];
}

// TraitUse is an alias for TraitUseStatement
export type TraitUse = TraitUseStatement;

export type TraitAdaptation = TraitAlias | TraitPrecedence;

/**
 * Trait method alias adaptation.
 * Allows renaming trait methods or changing their visibility.
 */
export interface TraitAlias extends BaseNode {
  readonly type: 'TraitAlias';
  /** Optional trait name (for disambiguation) */
  readonly trait?: NameExpression;
  /** Original method name */
  readonly method: Identifier;
  /** New method name */
  readonly alias: Identifier;
  /** Optional new visibility */
  readonly visibility?: 'public' | 'private' | 'protected';
}

/**
 * Trait method precedence adaptation.
 * Resolves conflicts when multiple traits have the same method.
 */
export interface TraitPrecedence extends BaseNode {
  readonly type: 'TraitPrecedence';
  /** Trait to use for the method */
  readonly trait: NameExpression;
  /** Method name */
  readonly method: Identifier;
  /** Traits to exclude for this method */
  readonly insteadOf: NameExpression[];
}

/**
 * Interface declaration.
 * Defines a contract that classes can implement.
 */
export interface InterfaceDeclaration extends BaseNode {
  readonly type: 'InterfaceDeclaration';
  /** Interface name */
  readonly name: Identifier;
  /** Parent interfaces to extend */
  readonly extends?: NameExpression[];
  /** Interface body (methods and constants) */
  readonly body: InterfaceMember[];
}

export type InterfaceMember = MethodDeclaration | ConstantDeclaration;

/**
 * Trait declaration.
 * Provides reusable methods and properties for classes.
 */
export interface TraitDeclaration extends BaseNode {
  readonly type: 'TraitDeclaration';
  /** Trait name */
  readonly name: Identifier;
  /** Trait body members */
  readonly body: TraitMember[];
}

export type TraitMember = PropertyDeclaration | MethodDeclaration | TraitUseStatement;

/**
 * Enum declaration (PHP 8.1+).
 * Defines a fixed set of possible values.
 */
export interface EnumDeclaration extends BaseNode {
  readonly type: 'EnumDeclaration';
  /** Enum name */
  readonly name: Identifier;
  /** Backing type for backed enums */
  readonly scalarType?: 'int' | 'string';
  /** Interfaces to implement */
  readonly interfaces?: NameExpression[];
  /** Enum body (cases, methods, constants) */
  readonly body: EnumMember[];
}

export type EnumMember = EnumCase | MethodDeclaration | ConstantDeclaration | TraitUseStatement;

/**
 * Enum case definition.
 * Represents a single value in an enum.
 */
export interface EnumCase extends BaseNode {
  readonly type: 'EnumCase';
  /** Case name */
  readonly name: Identifier;
  /** Backing value for backed enums */
  readonly value?: Expression;
}

/**
 * Namespace declaration.
 * Organizes code into logical groups.
 */
export interface NamespaceDeclaration extends BaseNode {
  readonly type: 'NamespaceDeclaration';
  /** Namespace name (null for global namespace) */
  readonly name?: NameExpression;
  /** Statements within the namespace */
  readonly statements: Statement[];
}

/**
 * Use statement for importing namespaces.
 * Allows importing classes, functions, or constants.
 */
export interface UseStatement extends BaseNode {
  readonly type: 'UseStatement';
  /** Type of import (class/interface, function, or constant) */
  readonly kind?: 'normal' | 'function' | 'const';
  /** Items to import */
  readonly items: UseItem[];
}

/**
 * Single item in a use statement.
 */
export interface UseItem extends BaseNode {
  readonly type: 'UseItem';
  /** Fully qualified name to import */
  readonly name: NameExpression;
  /** Optional alias */
  readonly alias?: Identifier;
  /** Type override for grouped imports */
  readonly kind?: 'normal' | 'function' | 'const';
}

// Declaration union type
export type Declaration =
  | FunctionDeclaration
  | ClassDeclaration
  | InterfaceDeclaration
  | TraitDeclaration
  | EnumDeclaration
  | NamespaceDeclaration
  | ConstDeclaration
  | StaticVariableDeclaration;

// ==================== Expressions ====================

/**
 * Union type of all possible expression nodes.
 * Expressions are values or computations that produce values.
 */
export type Expression =
  // リテラル
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | ArrayExpression
  | ObjectExpression
  // 識別子・名前
  | Identifier
  | VariableExpression
  | NameExpression
  | QualifiedName
  // 演算子
  | BinaryExpression
  | UnaryExpression
  | UpdateExpression
  | AssignmentExpression
  | LogicalExpression
  | ConditionalExpression
  | SequenceExpression
  // メンバーアクセス
  | MemberExpression
  | CallExpression
  | NewExpression
  // 特殊
  | FunctionExpression
  | ArrowFunctionExpression
  | ClassExpression
  | YieldExpression
  | AwaitExpression
  | ThrowExpression
  | MatchExpression
  | CloneExpression
  | IncludeExpression
  | RequireExpression
  | ListExpression
  | ArrayPattern
  | ReferenceExpression
  | ErrorControlExpression
  | CastExpression
  | IssetExpression
  | EmptyExpression
  | EvalExpression
  | ExitExpression
  | PrintExpression
  | ShellExecExpression
  | TemplateStringExpression
  | SpreadElement;

// Literals

/**
 * Numeric literal expression.
 * Stores the value as string to preserve precision.
 */
export interface NumberLiteral extends BaseNode {
  readonly type: 'NumberLiteral';
  /** Numeric value as string (preserves precision) */
  readonly value: string;
  /** Raw source text */
  readonly raw: string;
}

/**
 * String literal expression.
 */
export interface StringLiteral extends BaseNode {
  readonly type: 'StringLiteral';
  /** Interpreted string value */
  readonly value: string;
  /** Raw source text including quotes */
  readonly raw: string;
}

/**
 * Template string expression (double-quoted with interpolation).
 */
export interface TemplateStringExpression extends BaseNode {
  readonly type: 'TemplateStringExpression';
  /** String parts and interpolated expressions */
  readonly parts: (string | Expression)[];
}

/**
 * Boolean literal expression (true/false).
 */
export interface BooleanLiteral extends BaseNode {
  readonly type: 'BooleanLiteral';
  /** Boolean value */
  readonly value: boolean;
}

/**
 * Null literal expression.
 */
export interface NullLiteral extends BaseNode {
  readonly type: 'NullLiteral';
}

/**
 * Array literal expression.
 * Can be old-style array() or short syntax [].
 */
export interface ArrayExpression extends BaseNode {
  readonly type: 'ArrayExpression';
  /** Array elements */
  readonly elements: ArrayElement[];
}

/**
 * Single element in an array expression.
 */
export interface ArrayElement extends BaseNode {
  readonly type: 'ArrayElement';
  /** Optional key for associative arrays */
  readonly key?: Expression;
  /** Element value */
  readonly value: Expression;
  /** Whether this is a spread element (...$arr) */
  readonly spread?: boolean;
}

/**
 * Object literal expression.
 * Used for stdClass object creation.
 */
export interface ObjectExpression extends BaseNode {
  readonly type: 'ObjectExpression';
  /** Object properties */
  readonly properties: ObjectProperty[];
}

/**
 * Property in an object expression.
 */
export interface ObjectProperty extends BaseNode {
  readonly type: 'ObjectProperty';
  /** Property key */
  readonly key: Expression;
  /** Property value */
  readonly value: Expression;
}

// Identifiers

/**
 * Simple identifier (name without $ prefix).
 * Used for class names, function names, constants, etc.
 */
export interface Identifier extends BaseNode {
  readonly type: 'Identifier';
  /** Identifier name */
  readonly name: string;
}

/**
 * Variable expression ($variable).
 * Name can be dynamic ($$var or ${expr}).
 */
export interface VariableExpression extends BaseNode {
  readonly type: 'VariableExpression';
  /** Variable name (string for simple, Expression for dynamic) */
  readonly name: string | Expression;
}

/**
 * Namespace name expression.
 * Represents qualified, fully qualified, or unqualified names.
 */
export interface NameExpression extends BaseNode {
  readonly type: 'NameExpression';
  /** Name parts (e.g., ['Foo', 'Bar'] for Foo\Bar) */
  readonly parts: string[];
  /** Qualification type */
  readonly qualified?: 'unqualified' | 'qualified' | 'fully';
  /** Full name string (for compatibility) */
  readonly name?: string;
}

/**
 * Qualified name (legacy format).
 * @deprecated Use NameExpression instead
 */
export interface QualifiedName extends BaseNode {
  readonly type: 'QualifiedName';
  /** Name parts */
  readonly parts: string[];
}

// Operators

/**
 * Binary operator expression.
 * Handles arithmetic, comparison, and bitwise operations.
 */
export interface BinaryExpression extends BaseNode {
  readonly type: 'BinaryExpression';
  /** Binary operator */
  readonly operator: BinaryOperator;
  /** Left operand */
  readonly left: Expression;
  /** Right operand */
  readonly right: Expression;
}

export type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%' | '**'
  | '.' | '<<' | '>>' | '&' | '|' | '^'
  | '==' | '!=' | '===' | '!==' | '<' | '>' | '<=' | '>='
  | 'instanceof' | '??';

/**
 * Unary operator expression.
 * Handles negation, bitwise NOT, etc.
 */
export interface UnaryExpression extends BaseNode {
  readonly type: 'UnaryExpression';
  /** Unary operator */
  readonly operator: UnaryOperator;
  /** Operand */
  readonly argument: Expression;
  /** Whether operator is prefix (always true in PHP) */
  readonly prefix: boolean;
}

export type UnaryOperator = '+' | '-' | '!' | '~' | '++' | '--';

/**
 * Increment/decrement expression.
 * Can be prefix (++$x) or postfix ($x++).
 */
export interface UpdateExpression extends BaseNode {
  readonly type: 'UpdateExpression';
  /** Increment or decrement operator */
  readonly operator: '++' | '--';
  /** Variable to update */
  readonly argument: Expression;
  /** Whether operator is prefix */
  readonly prefix: boolean;
}

/**
 * Assignment expression.
 * Handles simple and compound assignments.
 */
export interface AssignmentExpression extends BaseNode {
  readonly type: 'AssignmentExpression';
  /** Assignment operator */
  readonly operator: AssignmentOperator;
  /** Left-hand side (assignee) */
  readonly left: Expression;
  /** Right-hand side (value) */
  readonly right: Expression;
}

export type AssignmentOperator =
  | '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '**='
  | '.=' | '<<=' | '>>=' | '&=' | '|=' | '^=' | '??=';

/**
 * Logical operator expression.
 * Includes both symbolic (&&, ||) and word (and, or, xor) operators.
 */
export interface LogicalExpression extends BaseNode {
  readonly type: 'LogicalExpression';
  /** Logical operator */
  readonly operator: '&&' | '||' | 'and' | 'or' | 'xor';
  /** Left operand */
  readonly left: Expression;
  /** Right operand */
  readonly right: Expression;
}

/**
 * Ternary conditional expression (? :).
 * Supports both full (a ? b : c) and short (a ?: c) forms.
 */
export interface ConditionalExpression extends BaseNode {
  readonly type: 'ConditionalExpression';
  /** Condition to test */
  readonly test: Expression;
  /** Value if true (optional for ?: operator) */
  readonly consequent?: Expression;
  /** Value if false */
  readonly alternate: Expression;
}

/**
 * Sequence expression (comma operator).
 * Evaluates expressions left to right, returns last value.
 */
export interface SequenceExpression extends BaseNode {
  readonly type: 'SequenceExpression';
  /** Expressions to evaluate in sequence */
  readonly expressions: Expression[];
}

// Member Access

/**
 * Member access expression.
 * Handles property access ($obj->prop) and array access ($arr['key']).
 */
export interface MemberExpression extends BaseNode {
  readonly type: 'MemberExpression';
  /** Object or array being accessed */
  readonly object: Expression;
  /** Property name or array key */
  readonly property: Expression | Identifier;
  /** Whether using bracket notation */
  readonly computed: boolean;
  /** Whether using nullsafe operator (?->) */
  readonly nullsafe?: boolean;
}

/**
 * Function or method call expression.
 */
export interface CallExpression extends BaseNode {
  readonly type: 'CallExpression';
  /** Function or method being called */
  readonly callee: Expression;
  /** Call arguments */
  readonly arguments: Argument[];
  /** Whether using nullsafe operator (?->) */
  readonly nullsafe?: boolean;
}

/**
 * Function call argument.
 * Supports named arguments (PHP 8+) and spread operator.
 */
export interface Argument extends BaseNode {
  readonly type: 'Argument';
  /** Argument name for named arguments */
  readonly name?: Identifier;
  /** Argument value */
  readonly value: Expression;
  /** Whether using spread operator (...) */
  readonly spread?: boolean;
}

/**
 * Object instantiation expression (new Class()).
 */
export interface NewExpression extends BaseNode {
  readonly type: 'NewExpression';
  /** Class to instantiate */
  readonly callee: Expression;
  /** Constructor arguments */
  readonly arguments?: Argument[];
}

// Functions

/**
 * Anonymous function expression (closure).
 */
export interface FunctionExpression extends BaseNode {
  readonly type: 'FunctionExpression';
  /** Function parameters */
  readonly parameters: Parameter[];
  /** Optional return type */
  readonly returnType?: TypeNode;
  /** Function body */
  readonly body: BlockStatement;
  /** Whether function returns by reference */
  readonly byReference?: boolean;
  /** Whether function is async (not standard PHP) */
  readonly isAsync?: boolean;
  /** Variables imported from parent scope */
  readonly uses?: ClosureUse[];
}

/**
 * Arrow function expression (PHP 7.4+).
 * Short closure syntax: fn() => expr
 */
export interface ArrowFunctionExpression extends BaseNode {
  readonly type: 'ArrowFunctionExpression';
  /** Function parameters */
  readonly parameters: Parameter[];
  /** Optional return type */
  readonly returnType?: TypeNode;
  /** Function body (expression or block) */
  readonly body: Expression | BlockStatement;
  /** Whether function returns by reference */
  readonly byReference?: boolean;
  /** Whether function is async (not standard PHP) */
  readonly isAsync?: boolean;
}

/**
 * Anonymous class expression (PHP 7+).
 */
export interface ClassExpression extends BaseNode {
  readonly type: 'ClassExpression';
  /** Parent class to extend */
  readonly superClass?: NameExpression;
  /** Interfaces to implement */
  readonly interfaces?: NameExpression[];
  /** Class body members */
  readonly body: ClassMember[];
}

/**
 * Function parameter declaration.
 */
export interface Parameter extends BaseNode {
  readonly type: 'Parameter';
  /** Parameter variable */
  readonly name: VariableExpression;
  /** Optional type hint */
  readonly typeAnnotation?: TypeNode;
  /** Optional default value */
  readonly defaultValue?: Expression;
  /** Whether parameter is passed by reference */
  readonly byReference?: boolean;
  /** Whether parameter is variadic (...$args) */
  readonly variadic?: boolean;
  /** Constructor property promotion modifiers (PHP 8+) */
  readonly promoted?: PropertyModifier[];
  /** PHP 8+ attributes */
  readonly attributes?: Attribute[];
}

/**
 * Closure use variable.
 * Variables imported from parent scope.
 */
export interface ClosureUse extends BaseNode {
  readonly type: 'ClosureUse';
  /** Variable to import */
  readonly variable: VariableExpression;
  /** Whether to import by reference */
  readonly byReference?: boolean;
}

// Other Expressions

/**
 * Yield expression for generators.
 */
export interface YieldExpression extends BaseNode {
  readonly type: 'YieldExpression';
  /** Optional yield key (for key => value) */
  readonly key?: Expression;
  /** Optional yield value */
  readonly value?: Expression;
}

/**
 * Await expression (not in standard PHP).
 * For async/await support in non-standard implementations.
 */
export interface AwaitExpression extends BaseNode {
  readonly type: 'AwaitExpression';
  /** Expression to await */
  readonly argument: Expression;
}

/**
 * Throw expression (PHP 8+).
 * Allows throw in expression context.
 */
export interface ThrowExpression extends BaseNode {
  readonly type: 'ThrowExpression';
  /** Exception to throw */
  readonly argument: Expression;
}

/**
 * Match expression (PHP 8+).
 * Stricter alternative to switch.
 */
export interface MatchExpression extends BaseNode {
  readonly type: 'MatchExpression';
  /** Expression to match against */
  readonly discriminant: Expression;
  /** Match arms */
  readonly arms: MatchArm[];
}

/**
 * Single arm in a match expression.
 */
export interface MatchArm extends BaseNode {
  readonly type: 'MatchArm';
  /** Conditions to match (null for default) */
  readonly conditions: Expression[] | null;
  /** Result expression */
  readonly body: Expression;
}

/**
 * Clone expression.
 * Creates a copy of an object.
 */
export interface CloneExpression extends BaseNode {
  readonly type: 'CloneExpression';
  /** Object to clone */
  readonly argument: Expression;
}

/**
 * Include expression.
 * Includes and evaluates a file.
 */
export interface IncludeExpression extends BaseNode {
  readonly type: 'IncludeExpression';
  /** Include variant */
  readonly kind: 'include' | 'include_once';
  /** File path expression */
  readonly argument: Expression;
}

/**
 * Require expression.
 * Like include but fatal if file not found.
 */
export interface RequireExpression extends BaseNode {
  readonly type: 'RequireExpression';
  /** Require variant */
  readonly kind: 'require' | 'require_once';
  /** File path expression */
  readonly argument: Expression;
}

/**
 * List expression for destructuring.
 * Legacy syntax: list($a, $b) = array(1, 2)
 */
export interface ListExpression extends BaseNode {
  readonly type: 'ListExpression';
  /** Variables to assign to (null for skipped elements) */
  readonly elements: (VariableExpression | ListExpression | null)[];
}

/**
 * Array destructuring pattern.
 * Modern syntax: [$a, $b] = [1, 2]
 */
export interface ArrayPattern extends BaseNode {
  readonly type: 'ArrayPattern';
  /** Variables to assign to (null for skipped elements) */
  readonly elements: (VariableExpression | ArrayPattern | null)[];
}

/**
 * Reference expression (&$var).
 * Creates a reference to a variable.
 */
export interface ReferenceExpression extends BaseNode {
  readonly type: 'ReferenceExpression';
  /** Expression to reference */
  readonly expression: Expression;
}

/**
 * Error control expression (@expression).
 * Suppresses error messages.
 */
export interface ErrorControlExpression extends BaseNode {
  readonly type: 'ErrorControlExpression';
  /** Expression to suppress errors for */
  readonly expression: Expression;
}

/**
 * Type cast expression.
 * Converts value to specified type.
 */
export interface CastExpression extends BaseNode {
  readonly type: 'CastExpression';
  /** Target type */
  readonly kind: CastKind;
  /** Expression to cast */
  readonly argument: Expression;
}

export type CastKind = 'int' | 'float' | 'string' | 'array' | 'object' | 'bool' | 'unset';

/**
 * Isset expression.
 * Tests if variables are set and not null.
 */
export interface IssetExpression extends BaseNode {
  readonly type: 'IssetExpression';
  /** Variables to test */
  readonly arguments: Expression[];
}

/**
 * Empty expression.
 * Tests if a variable is empty.
 */
export interface EmptyExpression extends BaseNode {
  readonly type: 'EmptyExpression';
  /** Expression to test */
  readonly argument: Expression;
}

/**
 * Eval expression.
 * Evaluates PHP code string (dangerous!).
 */
export interface EvalExpression extends BaseNode {
  readonly type: 'EvalExpression';
  /** Code string to evaluate */
  readonly argument: Expression;
}

/**
 * Exit/die expression.
 * Terminates script execution.
 */
export interface ExitExpression extends BaseNode {
  readonly type: 'ExitExpression';
  /** Optional exit code or message */
  readonly argument?: Expression;
}

/**
 * Print expression.
 * Outputs a string and returns 1.
 */
export interface PrintExpression extends BaseNode {
  readonly type: 'PrintExpression';
  /** Expression to print */
  readonly argument: Expression;
}

/**
 * Shell execution expression (`command`).
 * Executes shell command and returns output.
 */
export interface ShellExecExpression extends BaseNode {
  readonly type: 'ShellExecExpression';
  /** Shell command to execute */
  readonly command: string;
}

/**
 * Spread element (...$array).
 * Unpacks array in array literals or function calls.
 */
export interface SpreadElement extends BaseNode {
  readonly type: 'SpreadElement';
  /** Array to spread */
  readonly argument: Expression;
}

// ==================== Types ====================

/**
 * Union type of all possible type nodes.
 * Used for type hints and return types.
 */
export type TypeNode =
  | SimpleType
  | UnionType
  | IntersectionType
  | NullableType
  | ArrayType
  | CallableType;

/**
 * Simple type (int, string, bool, etc.).
 */
export interface SimpleType extends BaseNode {
  readonly type: 'SimpleType';
  /** Type name */
  readonly name: string;
}

/**
 * Union type (PHP 8+).
 * Multiple possible types joined with |.
 */
export interface UnionType extends BaseNode {
  readonly type: 'UnionType';
  /** Constituent types */
  readonly types: TypeNode[];
}

/**
 * Intersection type (PHP 8.1+).
 * Multiple required types joined with &.
 */
export interface IntersectionType extends BaseNode {
  readonly type: 'IntersectionType';
  /** Required types */
  readonly types: TypeNode[];
}

/**
 * Nullable type (?Type).
 * Allows null in addition to the base type.
 */
export interface NullableType extends BaseNode {
  readonly type: 'NullableType';
  /** Base type that can be null */
  readonly typeAnnotation: TypeNode;
}

/**
 * Array type.
 * Generic array type with element type.
 */
export interface ArrayType extends BaseNode {
  readonly type: 'ArrayType';
  /** Type of array elements */
  readonly elementType: TypeNode;
}

/**
 * Callable type.
 * Function or method type signature.
 */
export interface CallableType extends BaseNode {
  readonly type: 'CallableType';
  /** Parameter types */
  readonly parameters?: TypeNode[];
  /** Return type */
  readonly returnType?: TypeNode;
}

/**
 * Union type of all AST nodes.
 * This is the most general node type.
 */
export type Node =
  | Program
  | PhpProgram
  | Statement
  | Expression
  | Declaration
  | TypeNode
  | SwitchCase
  | CatchClause
  | ElseIfClause
  | ClassMember
  | TraitMember
  | EnumMember
  | Parameter
  | Argument
  | ArrayElement
  | UseItem
  | TraitAlias
  | TraitPrecedence
  | Attribute;

/**
 * Alias for backward compatibility.
 * @deprecated Use Node instead
 */
export type AstNode = Node;

/**
 * Variable type alias for backward compatibility.
 * @deprecated Use VariableExpression instead
 */
export type Variable = VariableExpression;