/**
 * PHP Code Generator
 * 
 * Generates PHP code from AST nodes.
 * 
 * @module generator
 */

import * as AST from '../core/ast.js';

/**
 * Generate PHP code from an AST
 */
export function generatePhpCode(ast: AST.PhpProgram | AST.Program): string {
  const code = generateStatements(ast.statements);
  return `<?php\n\n${code}`;
}

/**
 * Generate code for multiple statements
 */
function generateStatements(statements: AST.Statement[]): string {
  return statements.map(generateStatement).join('\n');
}

/**
 * Generate code for a single statement
 */
function generateStatement(stmt: AST.Statement): string {
  switch (stmt.type) {
    case 'NamespaceDeclaration':
      return generateNamespace(stmt);
    case 'UseStatement':
      return generateUseStatement(stmt);
    case 'ClassDeclaration':
      return generateClass(stmt);
    case 'FunctionDeclaration':
      return generateFunction(stmt);
    case 'ExpressionStatement':
      return generateExpression(stmt.expression) + ';';
    case 'ReturnStatement':
      return stmt.value ? `return ${generateExpression(stmt.value)};` : 'return;';
    case 'IfStatement':
      return generateIfStatement(stmt);
    case 'BlockStatement':
      return `{\n${indent(generateStatements(stmt.statements))}\n}`;
    case 'EchoStatement':
      return `echo ${stmt.expressions.map(generateExpression).join(', ')};`;
    case 'WhileStatement':
      return `while (${generateExpression(stmt.test)}) ${generateStatement(stmt.body)}`;
    case 'ForStatement':
      return generateForStatement(stmt);
    case 'ForeachStatement':
      return generateForeachStatement(stmt);
    case 'DoWhileStatement':
      return `do ${generateStatement(stmt.body)} while (${generateExpression(stmt.test)});`;
    case 'SwitchStatement':
      return generateSwitchStatement(stmt);
    case 'BreakStatement':
      return stmt.label ? `break ${generateExpression(stmt.label)};` : 'break;';
    case 'ContinueStatement':
      return stmt.label ? `continue ${generateExpression(stmt.label)};` : 'continue;';
    case 'ThrowStatement':
      return `throw ${generateExpression(stmt.expression)};`;
    case 'TryStatement':
      return generateTryStatement(stmt);
    case 'InterfaceDeclaration':
      return generateInterface(stmt);
    case 'TraitDeclaration':
      return generateTrait(stmt);
    case 'EnumDeclaration':
      return generateEnum(stmt);
    case 'GlobalStatement':
      return `global ${stmt.variables.map(v => generateExpression(v)).join(', ')};`;
    case 'StaticStatement':
      return `static ${stmt.declarations.map(v => generateStaticVariable(v)).join(', ')};`;
    case 'ConstStatement':
      return `const ${stmt.declarations.map(d => generateConstDeclaration(d)).join(', ')};`;
    case 'UnsetStatement':
      return `unset(${stmt.variables.map(v => generateExpression(v)).join(', ')});`;
    case 'GotoStatement':
      return `goto ${stmt.label};`;
    case 'DeclareStatement':
      return generateDeclareStatement(stmt);
    case 'LabeledStatement':
      return `${stmt.label}:`;
    case 'InlineHTMLStatement':
      return `?>${stmt.value}<?php`;
    default:
      const _exhaustive: never = stmt;
      return `/* Unknown statement type: ${(stmt as any).type} */`;
  }
}

/**
 * Generate namespace declaration
 */
function generateNamespace(ns: AST.NamespaceDeclaration): string {
  const name = ns.name ? ns.name.parts.join('\\') : '';
  const statements = generateStatements(ns.statements);
  return name 
    ? `namespace ${name};\n\n${statements}`
    : `namespace {\n${indent(statements)}\n}`;
}

/**
 * Generate use statement
 */
function generateUseStatement(use: AST.UseStatement): string {
  const kind = use.kind === 'function' ? 'function ' : use.kind === 'const' ? 'const ' : '';
  const items = use.items.map(item => {
    const name = item.name.parts.join('\\');
    return item.alias ? `${name} as ${item.alias.name}` : name;
  }).join(', ');
  return `use ${kind}${items};`;
}

/**
 * Generate class declaration
 */
function generateClass(cls: AST.ClassDeclaration): string {
  const modifiers = cls.modifiers?.join(' ') || '';
  const name = cls.name.name;
  const ext = cls.superClass ? ` extends ${cls.superClass.parts.join('\\')}` : '';
  const impl = cls.interfaces?.length 
    ? ` implements ${cls.interfaces.map(i => i.parts.join('\\')).join(', ')}` 
    : '';
  
  const members = cls.body.map(member => {
    switch (member.type) {
      case 'PropertyDeclaration':
        return generateProperty(member);
      case 'MethodDeclaration':
        return generateMethod(member);
      case 'ConstructorDeclaration':
        return generateConstructor(member);
      case 'ConstantDeclaration':
        return generateConstantDeclaration(member);
      case 'ClassConstant':
        return generateClassConstant(member);
      case 'TraitUseStatement':
        return generateTraitUseStatement(member);
      default:
        const _exhaustive: never = member;
        return `/* Unknown member type: ${(member as any).type} */`;
    }
  }).join('\n\n');
  
  return `${modifiers} class ${name}${ext}${impl}\n{\n${indent(members)}\n}`;
}

/**
 * Generate property declaration
 */
function generateProperty(prop: AST.PropertyDeclaration): string {
  const modifiers = prop.modifiers?.join(' ') || 'public';
  const type = prop.typeAnnotation ? generateType(prop.typeAnnotation) + ' ' : '';
  const name = prop.name.name;
  const value = prop.initializer ? ` = ${generateExpression(prop.initializer)}` : '';
  return `${modifiers} ${type}$${name}${value};`;
}

/**
 * Generate method declaration
 */
function generateMethod(method: AST.MethodDeclaration): string {
  const modifiers = method.modifiers?.join(' ') || 'public';
  const name = method.name.name;
  const params = method.parameters.map(generateParameter).join(', ');
  const returnType = method.returnType ? `: ${generateType(method.returnType)}` : '';
  const body = method.body ? ` ${generateStatement(method.body)}` : ';';
  return `${modifiers} function ${name}(${params})${returnType}${body}`;
}

/**
 * Generate function declaration
 */
function generateFunction(func: AST.FunctionDeclaration): string {
  const name = func.name.name;
  const params = func.parameters.map(generateParameter).join(', ');
  const returnType = func.returnType ? `: ${generateType(func.returnType)}` : '';
  const body = generateStatement(func.body);
  return `function ${name}(${params})${returnType} ${body}`;
}

/**
 * Generate parameter
 */
function generateParameter(param: AST.Parameter): string {
  const type = param.typeAnnotation ? generateType(param.typeAnnotation) + ' ' : '';
  const ref = param.byReference ? '&' : '';
  const spread = param.variadic ? '...' : '';
  const name = typeof param.name.name === 'string' ? param.name.name : 'var';
  const defaultVal = param.defaultValue ? ` = ${generateExpression(param.defaultValue)}` : '';
  return `${type}${ref}${spread}$${name}${defaultVal}`;
}

/**
 * Generate if statement
 */
function generateIfStatement(stmt: AST.IfStatement): string {
  let code = `if (${generateExpression(stmt.test)}) ${generateStatement(stmt.consequent)}`;
  
  if (stmt.elseifs) {
    for (const elseif of stmt.elseifs) {
      code += ` elseif (${generateExpression(elseif.test)}) ${generateStatement(elseif.consequent)}`;
    }
  }
  
  if (stmt.alternate) {
    code += ` else ${generateStatement(stmt.alternate)}`;
  }
  
  return code;
}

/**
 * Generate expression
 */
function generateExpression(expr: AST.Expression): string {
  switch (expr.type) {
    case 'Identifier':
      return expr.name;
    case 'VariableExpression':
      return typeof expr.name === 'string' 
        ? `$${expr.name}` 
        : `$${generateExpression(expr.name)}`;
    case 'NameExpression':
      return expr.parts.join('\\');
    case 'StringLiteral':
      return expr.raw;
    case 'NumberLiteral':
      return expr.value;
    case 'BooleanLiteral':
      return expr.value ? 'true' : 'false';
    case 'NullLiteral':
      return 'null';
    case 'ArrayExpression':
      return generateArray(expr);
    case 'BinaryExpression':
      return `${generateExpression(expr.left)} ${expr.operator} ${generateExpression(expr.right)}`;
    case 'UnaryExpression':
      return `${expr.operator}${generateExpression(expr.argument)}`;
    case 'AssignmentExpression':
      return `${generateExpression(expr.left)} ${expr.operator} ${generateExpression(expr.right)}`;
    case 'CallExpression':
      return `${generateExpression(expr.callee)}(${expr.arguments.map(arg => generateArgument(arg)).join(', ')})`;
    case 'MemberExpression':
      return expr.computed
        ? `${generateExpression(expr.object)}[${generateExpression(expr.property)}]`
        : `${generateExpression(expr.object)}->${generateExpression(expr.property)}`;
    case 'NewExpression':
      return `new ${generateExpression(expr.callee)}(${expr.arguments?.map(arg => generateArgument(arg)).join(', ') || ''})`;
    case 'IncludeExpression':
      return `${expr.kind} ${generateExpression(expr.argument)}`;
    case 'RequireExpression':
      return `${expr.kind} ${generateExpression(expr.argument)}`;
    case 'ConditionalExpression':
      return expr.consequent 
        ? `${generateExpression(expr.test)} ? ${generateExpression(expr.consequent)} : ${generateExpression(expr.alternate)}`
        : `${generateExpression(expr.test)} ?: ${generateExpression(expr.alternate)}`;
    case 'LogicalExpression':
      return `${generateExpression(expr.left)} ${expr.operator} ${generateExpression(expr.right)}`;
    case 'UpdateExpression':
      return expr.prefix 
        ? `${expr.operator}${generateExpression(expr.argument)}`
        : `${generateExpression(expr.argument)}${expr.operator}`;
    case 'SequenceExpression':
      return expr.expressions.map(generateExpression).join(', ');
    case 'ObjectExpression':
      return generateObjectExpression(expr);
    case 'FunctionExpression':
      return generateFunctionExpression(expr);
    case 'ArrowFunctionExpression':
      return generateArrowFunction(expr);
    case 'YieldExpression':
      return generateYieldExpression(expr);
    case 'AwaitExpression':
      return `await ${generateExpression(expr.argument)}`;
    case 'ThrowExpression':
      return `throw ${generateExpression(expr.argument)}`;
    case 'MatchExpression':
      return generateMatchExpression(expr);
    case 'CloneExpression':
      return `clone ${generateExpression(expr.argument)}`;
    case 'ListExpression':
      return `list(${expr.elements.map(e => e ? generateExpression(e) : '').join(', ')})`;
    case 'ArrayPattern':
      return `[${expr.elements.map(e => e ? generateExpression(e) : '').join(', ')}]`;
    case 'ReferenceExpression':
      return `&${generateExpression(expr.expression)}`;
    case 'ErrorControlExpression':
      return `@${generateExpression(expr.expression)}`;
    case 'CastExpression':
      return `(${expr.kind})${generateExpression(expr.argument)}`;
    case 'IssetExpression':
      return `isset(${expr.arguments.map(generateExpression).join(', ')})`;
    case 'EmptyExpression':
      return `empty(${generateExpression(expr.argument)})`;
    case 'EvalExpression':
      return `eval(${generateExpression(expr.argument)})`;
    case 'ExitExpression':
      return expr.argument ? `exit(${generateExpression(expr.argument)})` : 'exit';
    case 'PrintExpression':
      return `print ${generateExpression(expr.argument)}`;
    case 'ShellExecExpression':
      return `\`${expr.command}\``;
    case 'TemplateStringExpression':
      return generateTemplateString(expr);
    case 'SpreadElement':
      return `...${generateExpression(expr.argument)}`;
    case 'ClassExpression':
      return generateClassExpression(expr);
    case 'QualifiedName':
      return expr.parts.join('\\');
    default:
      const _exhaustive: never = expr;
      return `/* Unknown expression type: ${(expr as any).type} */`;
  }
}

/**
 * Generate array expression
 */
function generateArray(arr: AST.ArrayExpression): string {
  const elements = arr.elements.map(elem => {
    const key = elem.key ? `${generateExpression(elem.key)} => ` : '';
    const spread = elem.spread ? '...' : '';
    return `${spread}${key}${generateExpression(elem.value)}`;
  }).join(', ');
  return `[${elements}]`;
}

/**
 * Generate type annotation
 */
function generateType(type: AST.TypeNode): string {
  switch (type.type) {
    case 'SimpleType':
      return type.name;
    case 'UnionType':
      return type.types.map(generateType).join('|');
    case 'IntersectionType':
      return type.types.map(generateType).join('&');
    case 'NullableType':
      return `?${generateType(type.typeAnnotation)}`;
    case 'ArrayType':
      return 'array';
    case 'CallableType':
      return 'callable';
    default:
      return 'mixed';
  }
}

/**
 * Generate argument
 */
function generateArgument(arg: AST.Argument): string {
  const spread = arg.spread ? '...' : '';
  const name = arg.name ? `${arg.name.name}: ` : '';
  return `${spread}${name}${generateExpression(arg.value)}`;
}

/**
 * Generate for statement
 */
function generateForStatement(stmt: AST.ForStatement): string {
  const init = stmt.init ? generateExpression(stmt.init) : '';
  const test = stmt.test ? generateExpression(stmt.test) : '';
  const update = stmt.update ? generateExpression(stmt.update) : '';
  return `for (${init}; ${test}; ${update}) ${generateStatement(stmt.body)}`;
}

/**
 * Generate foreach statement
 */
function generateForeachStatement(stmt: AST.ForeachStatement): string {
  const expr = generateExpression(stmt.expression);
  const key = stmt.key ? `${generateExpression(stmt.key)} => ` : '';
  const value = generateExpression(stmt.value);
  const byRef = ''; // byReference is on the value expression, not on the statement
  return `foreach (${expr} as ${key}${byRef}${value}) ${generateStatement(stmt.body)}`;
}

/**
 * Generate switch statement
 */
function generateSwitchStatement(stmt: AST.SwitchStatement): string {
  const discriminant = generateExpression(stmt.discriminant);
  const cases = stmt.cases.map(generateSwitchCase).join('\n');
  return `switch (${discriminant}) {\n${indent(cases)}\n}`;
}

/**
 * Generate switch case
 */
function generateSwitchCase(switchCase: AST.SwitchCase): string {
  const test = switchCase.test ? `case ${generateExpression(switchCase.test)}:` : 'default:';
  const consequent = switchCase.consequent.map(generateStatement).join('\n');
  return `${test}\n${indent(consequent)}`;
}

/**
 * Generate try statement
 */
function generateTryStatement(stmt: AST.TryStatement): string {
  let code = `try ${generateStatement(stmt.block)}`;
  
  for (const handler of stmt.handlers) {
    code += ` catch (${handler.types.map(t => t.parts.join('\\')).join('|')}`;
    if (handler.param) {
      code += ` ${generateExpression(handler.param)}`;
    }
    code += `) ${generateStatement(handler.body)}`;
  }
  
  if (stmt.finalizer) {
    code += ` finally ${generateStatement(stmt.finalizer)}`;
  }
  
  return code;
}

/**
 * Generate interface declaration
 */
function generateInterface(iface: AST.InterfaceDeclaration): string {
  const name = iface.name.name;
  const ext = iface.extends?.length 
    ? ` extends ${iface.extends.map(e => e.parts.join('\\')).join(', ')}`
    : '';
  
  const members = iface.body.map(member => {
    switch (member.type) {
      case 'MethodDeclaration':
        return generateInterfaceMethod(member);
      case 'ConstantDeclaration':
        return generateConstantDeclaration(member);
      default:
        return `/* Unknown interface member: ${(member as any).type} */`;
    }
  }).join('\n\n');
  
  return `interface ${name}${ext}\n{\n${indent(members)}\n}`;
}

/**
 * Generate interface method
 */
function generateInterfaceMethod(method: AST.MethodDeclaration): string {
  const modifiers = method.modifiers?.filter(m => m === 'public' || m === 'static').join(' ') || 'public';
  const name = method.name.name;
  const params = method.parameters.map(generateParameter).join(', ');
  const returnType = method.returnType ? `: ${generateType(method.returnType)}` : '';
  return `${modifiers} function ${name}(${params})${returnType};`;
}

/**
 * Generate trait declaration
 */
function generateTrait(trait: AST.TraitDeclaration): string {
  const name = trait.name.name;
  
  const members = trait.body.map(member => {
    switch (member.type) {
      case 'PropertyDeclaration':
        return generateProperty(member);
      case 'MethodDeclaration':
        return generateMethod(member);
      case 'TraitUseStatement':
        return generateTraitUseStatement(member);
      default:
        return `/* Unknown trait member: ${(member as any).type} */`;
    }
  }).join('\n\n');
  
  return `trait ${name}\n{\n${indent(members)}\n}`;
}

/**
 * Generate enum declaration
 */
function generateEnum(enumDecl: AST.EnumDeclaration): string {
  const name = enumDecl.name.name;
  const scalarType = enumDecl.scalarType ? `: ${enumDecl.scalarType}` : '';
  const impl = enumDecl.interfaces?.length
    ? ` implements ${enumDecl.interfaces.map(i => i.parts.join('\\')).join(', ')}`
    : '';
  
  const members = enumDecl.body.map(member => {
    switch (member.type) {
      case 'EnumCase':
        return generateEnumCase(member);
      case 'MethodDeclaration':
        return generateMethod(member);
      case 'ConstantDeclaration':
        return generateConstantDeclaration(member);
      case 'TraitUseStatement':
        return generateTraitUseStatement(member);
      default:
        return `/* Unknown enum member: ${(member as any).type} */`;
    }
  }).join('\n\n');
  
  return `enum ${name}${scalarType}${impl}\n{\n${indent(members)}\n}`;
}

/**
 * Generate enum case
 */
function generateEnumCase(enumCase: AST.EnumCase): string {
  const name = enumCase.name.name;
  const value = enumCase.value ? ` = ${generateExpression(enumCase.value)}` : '';
  return `case ${name}${value};`;
}

/**
 * Generate static variable declaration
 */
function generateStaticVariable(decl: AST.StaticVariableDeclaration): string {
  const variable = generateExpression(decl.id);
  const value = decl.init ? ` = ${generateExpression(decl.init)}` : '';
  return `${variable}${value}`;
}

/**
 * Generate const declaration
 */
function generateConstDeclaration(decl: AST.ConstDeclaration): string {
  const name = decl.name.name;
  const value = generateExpression(decl.value);
  return `${name} = ${value}`;
}

/**
 * Generate declare statement
 */
function generateDeclareStatement(stmt: AST.DeclareStatement): string {
  const directives = stmt.directives.map(d => `${d.name}=${generateExpression(d.value)}`).join(', ');
  const body = stmt.body ? ` ${generateStatement(stmt.body)}` : ';';
  return `declare(${directives})${body}`;
}

/**
 * Generate constructor declaration
 */
function generateConstructor(ctor: AST.ConstructorDeclaration): string {
  const modifiers = ctor.modifiers?.join(' ') || 'public';
  const params = ctor.parameters.map(generateParameter).join(', ');
  const body = ctor.body ? ` ${generateStatement(ctor.body)}` : ';';
  return `${modifiers} function __construct(${params})${body}`;
}

/**
 * Generate constant declaration
 */
function generateConstantDeclaration(constant: AST.ConstantDeclaration): string {
  const modifiers = constant.modifiers?.join(' ') || 'public';
  const name = constant.name.name;
  const value = generateExpression(constant.value);
  return `${modifiers} const ${name} = ${value};`;
}

/**
 * Generate class constant (old style)
 */
function generateClassConstant(constant: AST.ClassConstant): string {
  const declarations = constant.constants.map(c => `${c.name.name} = ${generateExpression(c.value)}`).join(', ');
  return `const ${declarations};`;
}

/**
 * Generate trait use statement
 */
function generateTraitUseStatement(stmt: AST.TraitUseStatement): string {
  const traits = stmt.traits.map(t => t.parts.join('\\')).join(', ');
  if (stmt.adaptations && stmt.adaptations.length > 0) {
    const adaptations = stmt.adaptations.map(generateTraitAdaptation).join('\n');
    return `use ${traits} {\n${indent(adaptations)}\n}`;
  }
  return `use ${traits};`;
}

/**
 * Generate trait adaptation
 */
function generateTraitAdaptation(adaptation: AST.TraitAlias | AST.TraitPrecedence): string {
  if (adaptation.type === 'TraitAlias') {
    const trait = adaptation.trait ? `${adaptation.trait.parts.join('\\')}::` : '';
    const method = adaptation.method.name;
    const visibility = adaptation.visibility ? `${adaptation.visibility} ` : '';
    const alias = adaptation.alias ? adaptation.alias.name : method;
    return `${trait}${method} as ${visibility}${alias};`;
  } else {
    const trait = adaptation.trait.parts.join('\\');
    const method = adaptation.method.name;
    const insteadOf = adaptation.insteadOf.map(t => t.parts.join('\\')).join(', ');
    return `${trait}::${method} insteadof ${insteadOf};`;
  }
}

/**
 * Generate object expression
 */
function generateObjectExpression(obj: AST.ObjectExpression): string {
  const properties = obj.properties.map(prop => {
    const key = generateExpression(prop.key);
    const value = generateExpression(prop.value);
    return `${key} => ${value}`;
  }).join(', ');
  return `(object)[${properties}]`;
}

/**
 * Generate function expression
 */
function generateFunctionExpression(func: AST.FunctionExpression): string {
  const params = func.parameters.map(generateParameter).join(', ');
  const use = func.uses?.length ? ` use (${func.uses.map(generateClosureUse).join(', ')})` : '';
  const returnType = func.returnType ? `: ${generateType(func.returnType)}` : '';
  const body = generateStatement(func.body);
  return `function (${params})${use}${returnType} ${body}`;
}

/**
 * Generate arrow function
 */
function generateArrowFunction(func: AST.ArrowFunctionExpression): string {
  const ref = func.byReference ? '&' : '';
  const params = func.parameters.map(generateParameter).join(', ');
  const returnType = func.returnType ? `: ${generateType(func.returnType)}` : '';
  const body = func.body.type === 'BlockStatement' 
    ? generateStatement(func.body)
    : generateExpression(func.body);
  return `${ref}fn(${params})${returnType} => ${body}`;
}

/**
 * Generate closure use
 */
function generateClosureUse(use: AST.ClosureUse): string {
  const ref = use.byReference ? '&' : '';
  return `${ref}${generateExpression(use.variable)}`;
}

/**
 * Generate yield expression
 */
function generateYieldExpression(expr: AST.YieldExpression): string {
  if (expr.key) {
    return `yield ${generateExpression(expr.key)} => ${expr.value ? generateExpression(expr.value) : ''}`;
  }
  return expr.value ? `yield ${generateExpression(expr.value)}` : 'yield';
}

/**
 * Generate match expression
 */
function generateMatchExpression(match: AST.MatchExpression): string {
  const discriminant = generateExpression(match.discriminant);
  const arms = match.arms.map(arm => {
    const conditions = arm.conditions 
      ? arm.conditions.map(c => generateExpression(c)).join(', ')
      : 'default';
    const body = generateExpression(arm.body);
    return `${conditions} => ${body}`;
  }).join(',\n');
  return `match (${discriminant}) {\n${indent(arms)}\n}`;
}

/**
 * Generate template string
 */
function generateTemplateString(expr: AST.TemplateStringExpression): string {
  let result = '"';
  for (const part of expr.parts) {
    if (typeof part === 'string') {
      result += part.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    } else {
      result += `{${generateExpression(part)}}`;
    }
  }
  result += '"';
  return result;
}

/**
 * Generate class expression
 */
function generateClassExpression(cls: AST.ClassExpression): string {
  const ext = cls.superClass ? ` extends ${cls.superClass.parts.join('\\')}` : '';
  const impl = cls.interfaces?.length
    ? ` implements ${cls.interfaces.map(i => i.parts.join('\\')).join(', ')}`
    : '';
  
  const members = cls.body.map(member => {
    switch (member.type) {
      case 'PropertyDeclaration':
        return generateProperty(member);
      case 'MethodDeclaration':
        return generateMethod(member);
      case 'ConstructorDeclaration':
        return generateConstructor(member);
      case 'ConstantDeclaration':
        return generateConstantDeclaration(member);
      case 'ClassConstant':
        return generateClassConstant(member);
      case 'TraitUseStatement':
        return generateTraitUseStatement(member);
      default:
        return `/* Unknown member type: ${(member as any).type} */`;
    }
  }).join('\n\n');
  
  return `new class${ext}${impl} {\n${indent(members)}\n}`;
}

/**
 * Indent text
 */
function indent(text: string, spaces: number = 4): string {
  const indentation = ' '.repeat(spaces);
  return text.split('\n').map(line => line ? indentation + line : line).join('\n');
}