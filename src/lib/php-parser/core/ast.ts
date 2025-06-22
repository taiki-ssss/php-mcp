/**
 * モダンな PHP AST 定義
 * Discriminated Union を使用した型安全な設計
 */

import { SourceLocation } from './location.js';

// Re-export for convenience
export { SourceLocation };

/**
 * AST ノードの基底型
 * 全てのノードは type プロパティで識別される
 */
export interface BaseNode {
  readonly type: string;
  readonly location?: SourceLocation;
}

// ==================== プログラム ====================

export interface Program extends BaseNode {
  readonly type: 'Program';
  readonly statements: Statement[];
}

// ==================== 文 (Statement) ====================

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
  | GotoStatement;

export interface ExpressionStatement extends BaseNode {
  readonly type: 'ExpressionStatement';
  readonly expression: Expression;
}

export interface BlockStatement extends BaseNode {
  readonly type: 'BlockStatement';
  readonly statements: Statement[];
}

export interface IfStatement extends BaseNode {
  readonly type: 'IfStatement';
  readonly condition: Expression;
  readonly then: Statement;
  readonly elseIfs?: ElseIfClause[];
  readonly else?: Statement;
}

export interface ElseIfClause extends BaseNode {
  readonly type: 'ElseIfClause';
  readonly condition: Expression;
  readonly then: Statement;
}

export interface WhileStatement extends BaseNode {
  readonly type: 'WhileStatement';
  readonly condition: Expression;
  readonly body: Statement;
}

export interface ForStatement extends BaseNode {
  readonly type: 'ForStatement';
  readonly init?: Expression[];
  readonly condition?: Expression;
  readonly update?: Expression[];
  readonly body: Statement;
}

export interface ForeachStatement extends BaseNode {
  readonly type: 'ForeachStatement';
  readonly iterable: Expression;
  readonly key?: VariableExpression | ListExpression;
  readonly value: VariableExpression | ListExpression | ReferenceExpression;
  readonly body: Statement;
}

export interface DoWhileStatement extends BaseNode {
  readonly type: 'DoWhileStatement';
  readonly body: Statement;
  readonly condition: Expression;
}

export interface SwitchStatement extends BaseNode {
  readonly type: 'SwitchStatement';
  readonly discriminant: Expression;
  readonly cases: SwitchCase[];
}

export interface SwitchCase extends BaseNode {
  readonly type: 'SwitchCase';
  readonly test?: Expression; // undefined for default case
  readonly consequent: Statement[];
}

export interface BreakStatement extends BaseNode {
  readonly type: 'BreakStatement';
  readonly level?: number;
}

export interface ContinueStatement extends BaseNode {
  readonly type: 'ContinueStatement';
  readonly level?: number;
}

export interface ReturnStatement extends BaseNode {
  readonly type: 'ReturnStatement';
  readonly argument?: Expression;
}

export interface ThrowStatement extends BaseNode {
  readonly type: 'ThrowStatement';
  readonly argument: Expression;
}

export interface TryStatement extends BaseNode {
  readonly type: 'TryStatement';
  readonly block: BlockStatement;
  readonly handlers: CatchClause[];
  readonly finalizer?: BlockStatement;
}

export interface CatchClause extends BaseNode {
  readonly type: 'CatchClause';
  readonly types: NameExpression[];
  readonly variable?: VariableExpression;
  readonly body: BlockStatement;
}

export interface EchoStatement extends BaseNode {
  readonly type: 'EchoStatement';
  readonly expressions: Expression[];
}

export interface GlobalStatement extends BaseNode {
  readonly type: 'GlobalStatement';
  readonly variables: VariableExpression[];
}

export interface StaticStatement extends BaseNode {
  readonly type: 'StaticStatement';
  readonly declarations: StaticVariableDeclaration[];
}

export interface StaticVariableDeclaration extends BaseNode {
  readonly type: 'StaticVariableDeclaration';
  readonly variable: VariableExpression;
  readonly initializer?: Expression;
}

export interface VariableDeclaration extends BaseNode {
  readonly type: 'VariableDeclaration';
  readonly variable: VariableExpression;
  readonly initializer?: Expression;
}

export interface ConstStatement extends BaseNode {
  readonly type: 'ConstStatement';
  readonly declarations: ConstDeclaration[];
}

export interface ConstDeclaration extends BaseNode {
  readonly type: 'ConstDeclaration';
  readonly name: Identifier;
  readonly value: Expression;
}

export interface UnsetStatement extends BaseNode {
  readonly type: 'UnsetStatement';
  readonly variables: Expression[];
}

export interface GotoStatement extends BaseNode {
  readonly type: 'GotoStatement';
  readonly label: Identifier;
}

// ==================== 宣言 (Declaration) ====================

export interface FunctionDeclaration extends BaseNode {
  readonly type: 'FunctionDeclaration';
  readonly name: Identifier;
  readonly parameters: Parameter[];
  readonly returnType?: TypeNode;
  readonly body: BlockStatement;
  readonly isAsync?: boolean;
  readonly byReference?: boolean;
}

export interface ClassDeclaration extends BaseNode {
  readonly type: 'ClassDeclaration';
  readonly name: Identifier;
  readonly superClass?: NameExpression;
  readonly interfaces?: NameExpression[];
  readonly body: ClassMember[];
  readonly modifiers?: ClassModifier[];
}

export type ClassModifier = 'abstract' | 'final' | 'readonly';

export type ClassMember =
  | PropertyDeclaration
  | MethodDeclaration
  | ConstructorDeclaration
  | ConstantDeclaration
  | ClassConstant
  | TraitUseStatement;

export interface PropertyDeclaration extends BaseNode {
  readonly type: 'PropertyDeclaration';
  readonly name: Identifier;
  readonly typeAnnotation?: TypeNode;
  readonly initializer?: Expression;
  readonly modifiers: PropertyModifier[];
  readonly hooks?: PropertyHook[];
}

export interface PropertyHook extends BaseNode {
  readonly type: 'PropertyHook';
  readonly kind: 'get' | 'set';
  readonly body: BlockStatement | Expression;
}

export interface MethodDeclaration extends BaseNode {
  readonly type: 'MethodDeclaration';
  readonly name: Identifier;
  readonly parameters: Parameter[];
  readonly returnType?: TypeNode;
  readonly body?: BlockStatement;
  readonly modifiers: MethodModifier[];
  readonly byReference?: boolean;
}

export type MethodModifier = 'public' | 'private' | 'protected' | 'static' | 'abstract' | 'final';
export type PropertyModifier = 'public' | 'private' | 'protected' | 'static' | 'readonly';
export type Visibility = 'public' | 'private' | 'protected';

export interface ConstructorDeclaration extends BaseNode {
  readonly type: 'ConstructorDeclaration';
  readonly parameters: Parameter[];
  readonly body: BlockStatement;
  readonly modifiers: ('public' | 'private' | 'protected')[];
}

export interface ConstantDeclaration extends BaseNode {
  readonly type: 'ConstantDeclaration';
  readonly declarations: ConstDeclaration[];
  readonly modifiers: ('public' | 'private' | 'protected' | 'final')[];
}

export interface ClassConstant extends BaseNode {
  readonly type: 'ClassConstant';
  readonly constants: Array<{
    readonly name: Identifier;
    readonly value: Expression;
  }>;
  readonly modifiers: Visibility[];
}

export interface TraitUseStatement extends BaseNode {
  readonly type: 'TraitUseStatement';
  readonly traits: NameExpression[];
  readonly adaptations?: TraitAdaptation[];
}

// TraitUse is an alias for TraitUseStatement
export type TraitUse = TraitUseStatement;

export type TraitAdaptation = TraitAlias | TraitPrecedence;

export interface TraitAlias extends BaseNode {
  readonly type: 'TraitAlias';
  readonly trait?: NameExpression;
  readonly method: Identifier;
  readonly alias: Identifier;
  readonly visibility?: 'public' | 'private' | 'protected';
}

export interface TraitPrecedence extends BaseNode {
  readonly type: 'TraitPrecedence';
  readonly trait: NameExpression;
  readonly method: Identifier;
  readonly insteadOf: NameExpression[];
}

export interface InterfaceDeclaration extends BaseNode {
  readonly type: 'InterfaceDeclaration';
  readonly name: Identifier;
  readonly extends?: NameExpression[];
  readonly body: InterfaceMember[];
}

export type InterfaceMember = MethodDeclaration | ConstantDeclaration;

export interface TraitDeclaration extends BaseNode {
  readonly type: 'TraitDeclaration';
  readonly name: Identifier;
  readonly body: TraitMember[];
}

export type TraitMember = PropertyDeclaration | MethodDeclaration | TraitUseStatement;

export interface EnumDeclaration extends BaseNode {
  readonly type: 'EnumDeclaration';
  readonly name: Identifier;
  readonly scalarType?: 'int' | 'string';
  readonly implements?: NameExpression[];
  readonly body: EnumMember[];
}

export type EnumMember = EnumCase | MethodDeclaration | ConstantDeclaration | TraitUseStatement;

export interface EnumCase extends BaseNode {
  readonly type: 'EnumCase';
  readonly name: Identifier;
  readonly value?: Expression;
}

export interface NamespaceDeclaration extends BaseNode {
  readonly type: 'NamespaceDeclaration';
  readonly name?: NameExpression;
  readonly statements: Statement[];
}

export interface UseStatement extends BaseNode {
  readonly type: 'UseStatement';
  readonly kind?: 'normal' | 'function' | 'const';
  readonly items: UseItem[];
}

export interface UseItem extends BaseNode {
  readonly type: 'UseItem';
  readonly name: NameExpression;
  readonly alias?: Identifier;
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

// ==================== 式 (Expression) ====================

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
  // 演算子
  | BinaryExpression
  | UnaryExpression
  | UpdateExpression
  | AssignmentExpression
  | LogicalExpression
  | ConditionalExpression
  | CoalesceExpression
  | SpaceshipExpression
  // メンバーアクセス
  | MemberExpression
  | CallExpression
  | NewExpression
  // 特殊
  | FunctionExpression
  | ArrowFunctionExpression
  | YieldExpression
  | AwaitExpression
  | ThrowExpression
  | MatchExpression
  | CloneExpression
  | IncludeExpression
  | RequireExpression
  | ListExpression
  | ReferenceExpression
  | ErrorControlExpression
  | CastExpression
  | IssetExpression
  | EmptyExpression
  | EvalExpression
  | ExitExpression
  | PrintExpression
  | ShellExecExpression
  | TemplateStringExpression;

// リテラル
export interface NumberLiteral extends BaseNode {
  readonly type: 'NumberLiteral';
  readonly value: number;
  readonly raw: string;
}

export interface StringLiteral extends BaseNode {
  readonly type: 'StringLiteral';
  readonly value: string;
  readonly raw: string;
}

export interface TemplateStringExpression extends BaseNode {
  readonly type: 'TemplateStringExpression';
  readonly parts: (string | Expression)[];
}

export interface BooleanLiteral extends BaseNode {
  readonly type: 'BooleanLiteral';
  readonly value: boolean;
}

export interface NullLiteral extends BaseNode {
  readonly type: 'NullLiteral';
}

export interface ArrayExpression extends BaseNode {
  readonly type: 'ArrayExpression';
  readonly elements: ArrayElement[];
}

export interface ArrayElement extends BaseNode {
  readonly type: 'ArrayElement';
  readonly key?: Expression;
  readonly value: Expression;
  readonly spread?: boolean;
}

export interface ObjectExpression extends BaseNode {
  readonly type: 'ObjectExpression';
  readonly properties: ObjectProperty[];
}

export interface ObjectProperty extends BaseNode {
  readonly type: 'ObjectProperty';
  readonly key: Expression;
  readonly value: Expression;
}

// 識別子
export interface Identifier extends BaseNode {
  readonly type: 'Identifier';
  readonly name: string;
}

export interface VariableExpression extends BaseNode {
  readonly type: 'VariableExpression';
  readonly name: string | Expression;
}

export interface NameExpression extends BaseNode {
  readonly type: 'NameExpression';
  readonly parts: string[];
  readonly qualified?: 'unqualified' | 'qualified' | 'fully';
}

// 演算子
export interface BinaryExpression extends BaseNode {
  readonly type: 'BinaryExpression';
  readonly operator: BinaryOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%' | '**'
  | '.' | '<<' | '>>' | '&' | '|' | '^'
  | '==' | '!=' | '===' | '!==' | '<' | '>' | '<=' | '>='
  | 'instanceof';

export interface UnaryExpression extends BaseNode {
  readonly type: 'UnaryExpression';
  readonly operator: UnaryOperator;
  readonly argument: Expression;
  readonly prefix: boolean;
}

export type UnaryOperator = '+' | '-' | '!' | '~' | '++' | '--';

export interface UpdateExpression extends BaseNode {
  readonly type: 'UpdateExpression';
  readonly operator: '++' | '--';
  readonly argument: Expression;
  readonly prefix: boolean;
}

export interface AssignmentExpression extends BaseNode {
  readonly type: 'AssignmentExpression';
  readonly operator: AssignmentOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export type AssignmentOperator =
  | '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '**='
  | '.=' | '<<=' | '>>=' | '&=' | '|=' | '^=' | '??=';

export interface LogicalExpression extends BaseNode {
  readonly type: 'LogicalExpression';
  readonly operator: '&&' | '||' | 'and' | 'or' | 'xor';
  readonly left: Expression;
  readonly right: Expression;
}

export interface ConditionalExpression extends BaseNode {
  readonly type: 'ConditionalExpression';
  readonly test: Expression;
  readonly consequent?: Expression;
  readonly alternate: Expression;
}

export interface CoalesceExpression extends BaseNode {
  readonly type: 'CoalesceExpression';
  readonly left: Expression;
  readonly right: Expression;
}

export interface SpaceshipExpression extends BaseNode {
  readonly type: 'SpaceshipExpression';
  readonly left: Expression;
  readonly right: Expression;
}

// メンバーアクセス
export interface MemberExpression extends BaseNode {
  readonly type: 'MemberExpression';
  readonly object: Expression;
  readonly property: Expression | Identifier;
  readonly computed: boolean;
  readonly nullsafe?: boolean;
}

export interface CallExpression extends BaseNode {
  readonly type: 'CallExpression';
  readonly callee: Expression;
  readonly arguments: Argument[];
  readonly nullsafe?: boolean;
}

export interface Argument extends BaseNode {
  readonly type: 'Argument';
  readonly name?: Identifier;
  readonly value: Expression;
  readonly spread?: boolean;
}

export interface NewExpression extends BaseNode {
  readonly type: 'NewExpression';
  readonly callee: Expression;
  readonly arguments?: Argument[];
}

// 関数
export interface FunctionExpression extends BaseNode {
  readonly type: 'FunctionExpression';
  readonly parameters: Parameter[];
  readonly returnType?: TypeNode;
  readonly body: BlockStatement;
  readonly byReference?: boolean;
  readonly isAsync?: boolean;
  readonly uses?: ClosureUse[];
}

export interface ArrowFunctionExpression extends BaseNode {
  readonly type: 'ArrowFunctionExpression';
  readonly parameters: Parameter[];
  readonly returnType?: TypeNode;
  readonly body: Expression | BlockStatement;
  readonly byReference?: boolean;
  readonly isAsync?: boolean;
}

export interface Parameter extends BaseNode {
  readonly type: 'Parameter';
  readonly name: VariableExpression;
  readonly typeAnnotation?: TypeNode;
  readonly defaultValue?: Expression;
  readonly byReference?: boolean;
  readonly variadic?: boolean;
  readonly promoted?: PropertyModifier[];
}

export interface ClosureUse extends BaseNode {
  readonly type: 'ClosureUse';
  readonly variable: VariableExpression;
  readonly byReference?: boolean;
}

// その他の式
export interface YieldExpression extends BaseNode {
  readonly type: 'YieldExpression';
  readonly key?: Expression;
  readonly value?: Expression;
}

export interface AwaitExpression extends BaseNode {
  readonly type: 'AwaitExpression';
  readonly argument: Expression;
}

export interface ThrowExpression extends BaseNode {
  readonly type: 'ThrowExpression';
  readonly argument: Expression;
}

export interface MatchExpression extends BaseNode {
  readonly type: 'MatchExpression';
  readonly discriminant: Expression;
  readonly arms: MatchArm[];
}

export interface MatchArm extends BaseNode {
  readonly type: 'MatchArm';
  readonly conditions: Expression[] | null; // null for default
  readonly body: Expression;
}

export interface CloneExpression extends BaseNode {
  readonly type: 'CloneExpression';
  readonly argument: Expression;
}

export interface IncludeExpression extends BaseNode {
  readonly type: 'IncludeExpression';
  readonly kind: 'include' | 'include_once';
  readonly argument: Expression;
}

export interface RequireExpression extends BaseNode {
  readonly type: 'RequireExpression';
  readonly kind: 'require' | 'require_once';
  readonly argument: Expression;
}

export interface ListExpression extends BaseNode {
  readonly type: 'ListExpression';
  readonly elements: (VariableExpression | ListExpression | null)[];
}

export interface ReferenceExpression extends BaseNode {
  readonly type: 'ReferenceExpression';
  readonly expression: Expression;
}

export interface ErrorControlExpression extends BaseNode {
  readonly type: 'ErrorControlExpression';
  readonly expression: Expression;
}

export interface CastExpression extends BaseNode {
  readonly type: 'CastExpression';
  readonly kind: CastKind;
  readonly argument: Expression;
}

export type CastKind = 'int' | 'float' | 'string' | 'array' | 'object' | 'bool' | 'unset';

export interface IssetExpression extends BaseNode {
  readonly type: 'IssetExpression';
  readonly arguments: Expression[];
}

export interface EmptyExpression extends BaseNode {
  readonly type: 'EmptyExpression';
  readonly argument: Expression;
}

export interface EvalExpression extends BaseNode {
  readonly type: 'EvalExpression';
  readonly argument: Expression;
}

export interface ExitExpression extends BaseNode {
  readonly type: 'ExitExpression';
  readonly argument?: Expression;
}

export interface PrintExpression extends BaseNode {
  readonly type: 'PrintExpression';
  readonly argument: Expression;
}

export interface ShellExecExpression extends BaseNode {
  readonly type: 'ShellExecExpression';
  readonly command: string;
}

// ==================== 型 (Type) ====================

export type TypeNode =
  | SimpleType
  | UnionType
  | IntersectionType
  | NullableType
  | ArrayType
  | CallableType;

export interface SimpleType extends BaseNode {
  readonly type: 'SimpleType';
  readonly name: string;
}

export interface UnionType extends BaseNode {
  readonly type: 'UnionType';
  readonly types: TypeNode[];
}

export interface IntersectionType extends BaseNode {
  readonly type: 'IntersectionType';
  readonly types: TypeNode[];
}

export interface NullableType extends BaseNode {
  readonly type: 'NullableType';
  readonly typeAnnotation: TypeNode;
}

export interface ArrayType extends BaseNode {
  readonly type: 'ArrayType';
  readonly elementType: TypeNode;
}

export interface CallableType extends BaseNode {
  readonly type: 'CallableType';
  readonly parameters?: TypeNode[];
  readonly returnType?: TypeNode;
}

// Union type for all nodes
export type Node =
  | Program
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
  | TraitPrecedence;