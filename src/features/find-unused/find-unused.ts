import { Result, ok, err } from 'neverthrow';
import * as path from 'path';
import * as fs from 'fs/promises';
import { parsePhp, walk, findNodes } from '../../shared/lib/php-parser/index.js';
import { scanProject } from '../../shared/lib/php-analyzer/index.js';
import { 
  FindUnusedRequest, 
  FindUnusedResult, 
  UnusedSymbol, 
  SymbolDefinition, 
  SymbolReference,
  UnusedType 
} from './types.js';
import type { Node } from '../../shared/lib/php-parser/core/ast.js';
import { minimatch } from 'minimatch';

export async function findUnused(request: FindUnusedRequest): Promise<Result<FindUnusedResult, Error>> {
  try {
    const root = request.root ?? process.cwd();
    const defaultTypes: UnusedType[] = ['variables', 'functions', 'classes', 'methods', 'properties', 'constants', 'imports'];
    const types = request.types === 'all' ? defaultTypes : (request.types ?? defaultTypes);
    const includePrivate = request.includePrivate ?? false;
    const includeProtected = request.includeProtected ?? false;
    const excludePatterns = request.excludePatterns ?? ['vendor/**', 'node_modules/**', '.git/**'];
    const entryPoints = request.entryPoints ?? [];

    // スキャンプロジェクト
    const scanResult = await scanProject(root);
    
    const phpFiles = scanResult.files;
    const definitions = new Map<string, SymbolDefinition[]>();
    const references = new Map<string, SymbolReference[]>();

    // 各ファイルを解析
    for (const file of phpFiles) {
      // 除外パターンのチェック
      const relativePath = path.relative(root, file);
      if (excludePatterns.some(pattern => minimatch(relativePath, pattern))) {
        continue;
      }

      // ファイルを読み込む
      const content = await fs.readFile(file, 'utf-8');
      const parseResult = parsePhp(content, { errorRecovery: true });
      if (!parseResult.success) {
        continue; // エラーがあってもスキップして続行
      }

      const ast = parseResult.value;

      // シンボル定義を収集
      await collectDefinitions(ast.statements, file, definitions, types, includePrivate, includeProtected);

      // シンボル参照を収集
      await collectReferences(ast.statements, file, references);
    }

    // 未使用シンボルを検出
    const unusedSymbols = detectUnusedSymbols(definitions, references, entryPoints, root);

    // 結果を集計
    const byType: Record<UnusedType, number> = {
      variables: 0,
      functions: 0,
      classes: 0,
      methods: 0,
      properties: 0,
      constants: 0,
      imports: 0,
    };

    for (const symbol of unusedSymbols) {
      byType[symbol.type]++;
    }

    const result: FindUnusedResult = {
      unusedSymbols,
      totalUnused: unusedSymbols.length,
      scannedFiles: phpFiles.length,
      byType,
    };

    return ok(result);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

async function collectDefinitions(
  ast: Node[],
  filePath: string,
  definitions: Map<string, SymbolDefinition[]>,
  types: UnusedType[],
  includePrivate: boolean,
  includeProtected: boolean
): Promise<void> {
  await walk(ast, async (node: any, parent) => {
    // 変数の定義
    if (types.includes('variables') && (node.type === 'VariableExpression' || node.type === 'AssignmentExpression')) {
      const key = `variable:${node.name}`;
      if (!definitions.has(key)) {
        definitions.set(key, []);
      }
      definitions.get(key)!.push({
        name: node.name,
        type: 'variables',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });
    }

    // 関数の定義
    if (types.includes('functions') && node.type === 'FunctionDeclaration') {
      const key = `function:${node.name}`;
      if (!definitions.has(key)) {
        definitions.set(key, []);
      }
      definitions.get(key)!.push({
        name: node.name,
        type: 'functions',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });
    }

    // クラスの定義
    if (types.includes('classes') && node.type === 'ClassDeclaration') {
      const key = `class:${node.name}`;
      if (!definitions.has(key)) {
        definitions.set(key, []);
      }
      definitions.get(key)!.push({
        name: node.name,
        type: 'classes',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });

      // メソッドとプロパティの定義
      for (const member of node.members || []) {
        if (types.includes('methods') && member.type === 'MethodDeclaration') {
          // 可視性のチェック
          if (member.visibility === 'private' && !includePrivate) continue;
          if (member.visibility === 'protected' && !includeProtected) continue;

          const key = `method:${node.name}::${member.name}`;
          if (!definitions.has(key)) {
            definitions.set(key, []);
          }
          definitions.get(key)!.push({
            name: member.name,
            type: 'methods',
            visibility: member.visibility,
            className: node.name,
            filePath,
            line: member.location?.start.line ?? 0,
            column: member.location?.start.column ?? 0,
          });
        }

        if (types.includes('properties') && member.type === 'PropertyDeclaration') {
          // 可視性のチェック
          if (member.visibility === 'private' && !includePrivate) continue;
          if (member.visibility === 'protected' && !includeProtected) continue;

          const key = `property:${node.name}::${member.name}`;
          if (!definitions.has(key)) {
            definitions.set(key, []);
          }
          definitions.get(key)!.push({
            name: member.name,
            type: 'properties',
            visibility: member.visibility,
            className: node.name,
            filePath,
            line: member.location?.start.line ?? 0,
            column: member.location?.start.column ?? 0,
          });
        }
      }
    }

    // 定数の定義
    if (types.includes('constants') && node.type === 'ConstantDeclaration') {
      const key = `constant:${node.name}`;
      if (!definitions.has(key)) {
        definitions.set(key, []);
      }
      definitions.get(key)!.push({
        name: node.name,
        type: 'constants',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });
    }

    // use文（インポート）の定義
    if (types.includes('imports') && node.type === 'UseStatement') {
      for (const item of node.items || []) {
        const nameParts = item.name?.parts || [];
        const name = item.alias?.name ?? nameParts[nameParts.length - 1] ?? '';
        if (name) {
          const key = `import:${name}`;
          if (!definitions.has(key)) {
            definitions.set(key, []);
          }
          definitions.get(key)!.push({
            name: name,
            type: 'imports',
            filePath,
            line: node.location?.start.line ?? 0,
            column: node.location?.start.column ?? 0,
          });
        }
      }
    }
  });
}

async function collectReferences(
  ast: Node[],
  filePath: string,
  references: Map<string, SymbolReference[]>
): Promise<void> {
  await walk(ast, async (node: any, parent) => {
    // 変数の参照
    if (node.type === 'Identifier' && !isInDefinitionContext(node, parent)) {
      const key = `variable:${node.name}`;
      if (!references.has(key)) {
        references.set(key, []);
      }
      references.get(key)!.push({
        name: node.name,
        type: 'read',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });
    }

    // 関数呼び出し
    if (node.type === 'CallExpression') {
      if (node.callee?.type === 'Identifier') {
        const key = `function:${node.callee.name}`;
        if (!references.has(key)) {
          references.set(key, []);
        }
        references.get(key)!.push({
          name: node.callee.name,
          type: 'call',
          filePath,
          line: node.location?.start.line ?? 0,
          column: node.location?.start.column ?? 0,
        });
      }
    }

    // クラスのインスタンス化
    if (node.type === 'NewExpression') {
      if (node.className?.type === 'Identifier') {
        const key = `class:${node.className.name}`;
        if (!references.has(key)) {
          references.set(key, []);
        }
        references.get(key)!.push({
          name: node.className.name,
          type: 'instantiation',
          filePath,
          line: node.location?.start.line ?? 0,
          column: node.location?.start.column ?? 0,
        });

        // インポート名の参照も記録
        const importKey = `import:${node.className.name}`;
        if (!references.has(importKey)) {
          references.set(importKey, []);
        }
        references.get(importKey)!.push({
          name: node.className.name,
          type: 'instantiation',
          filePath,
          line: node.location?.start.line ?? 0,
          column: node.location?.start.column ?? 0,
        });
      }
    }

    // メソッド呼び出し
    if (node.type === 'MemberAccess' && node.member?.type === 'Identifier') {
      // $obj->method() の形式を検出するには親ノードも確認が必要
      const methodKey = `method:*::${node.member.name}`;
      if (!references.has(methodKey)) {
        references.set(methodKey, []);
      }
      references.get(methodKey)!.push({
        name: node.member.name,
        type: 'call',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });
    }

    // 静的メソッド呼び出し
    if (node.type === 'StaticMethodCall' && node.className?.type === 'Identifier' && node.method?.type === 'Identifier') {
      const key = `method:${node.className.name}::${node.method.name}`;
      if (!references.has(key)) {
        references.set(key, []);
      }
      references.get(key)!.push({
        name: node.method.name,
        type: 'call',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });

      // クラス名の参照も記録
      const classKey = `class:${node.className.name}`;
      if (!references.has(classKey)) {
        references.set(classKey, []);
      }
      references.get(classKey)!.push({
        name: node.className.name,
        type: 'call',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });
    }

    // プロパティアクセス
    if (node.type === 'PropertyAccess' && node.property?.type === 'Identifier') {
      const propKey = `property:*::${node.property.name}`;
      if (!references.has(propKey)) {
        references.set(propKey, []);
      }
      references.get(propKey)!.push({
        name: node.property.name,
        type: 'read',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });
    }

    // 静的プロパティアクセス
    if (node.type === 'StaticPropertyAccess' && node.className?.type === 'Identifier' && node.property?.type === 'Identifier') {
      const key = `property:${node.className.name}::${node.property.name}`;
      if (!references.has(key)) {
        references.set(key, []);
      }
      references.get(key)!.push({
        name: node.property.name,
        type: 'read',
        filePath,
        line: node.location?.start.line ?? 0,
        column: node.location?.start.column ?? 0,
      });
    }
  });
}

function isInDefinitionContext(node: any, parent: any): boolean {
  // 変数定義の左辺にある場合
  if (parent?.type === 'AssignmentExpression' && parent.left === node) {
    return true;
  }
  
  // 関数・クラス・メソッドの名前部分
  if (parent?.type === 'FunctionDeclaration' && parent.name === node.name) {
    return true;
  }
  if (parent?.type === 'ClassDeclaration' && parent.name === node.name) {
    return true;
  }
  if (parent?.type === 'MethodDeclaration' && parent.name === node.name) {
    return true;
  }
  
  return false;
}

function detectUnusedSymbols(
  definitions: Map<string, SymbolDefinition[]>,
  references: Map<string, SymbolReference[]>,
  entryPoints: string[],
  root: string
): UnusedSymbol[] {
  const unusedSymbols: UnusedSymbol[] = [];

  for (const [key, defs] of definitions.entries()) {
    const refs = references.get(key) ?? [];
    
    // ワイルドカードキーの処理（メソッドとプロパティ）
    let hasReference = refs.length > 0;
    
    if (key.includes('::') && !hasReference) {
      const [type, fullName] = key.split(':');
      const [className, memberName] = fullName.split('::');
      
      // ワイルドカードで参照を探す
      const wildcardKey = `${type}:*::${memberName}`;
      const wildcardRefs = references.get(wildcardKey) ?? [];
      hasReference = wildcardRefs.length > 0;
    }

    // 参照がない場合は未使用
    if (!hasReference) {
      for (const def of defs) {
        // エントリーポイントのチェック
        const relativePath = path.relative(root, def.filePath);
        const isEntryPoint = entryPoints.some(ep => minimatch(relativePath, ep));
        
        // 信頼度の計算
        let confidence: 'high' | 'medium' | 'low' = 'high';
        let reason = 'No references found';
        
        if (isEntryPoint) {
          confidence = 'low';
          reason = 'Defined in entry point file';
        } else if (def.type === 'methods' && def.name.startsWith('__')) {
          confidence = 'medium';
          reason = 'Possibly a magic method';
        } else if (def.type === 'variables' && def.name.startsWith('_')) {
          confidence = 'medium';
          reason = 'May be intentionally unused (naming convention)';
        }

        unusedSymbols.push({
          name: def.name,
          type: def.type,
          visibility: def.visibility,
          filePath: def.filePath,
          line: def.line,
          column: def.column,
          confidence,
          reason,
        });
      }
    }
  }

  return unusedSymbols;
}