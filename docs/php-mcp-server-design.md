# PHP MCP Server 設計ドキュメント

## 概要
PHPパーサーを用いたLSP（Language Server Protocol）対応のMCP（Model Context Protocol）サーバーの設計ドキュメント

## 現在のPHPパーサー機能
- ✅ **AST生成**: 完全な型安全ASTを生成
- ✅ **トークン化**: すべてのPHP構文に対応
- ✅ **位置情報**: LSP対応の詳細な位置情報
- ✅ **エラー処理**: 構造化されたエラー情報とリカバリー
- ✅ **ASTトラバーサル**: Visitorパターンとウォーカー実装

## typescript-mcpから学んだ重要な知見

### AIが実際に使うツールに集中
mizchiさんのtypescript-mcpの分析から、以下の重要な知見を得ました：

1. **構文チェックやAST取得は内部処理** - AIに直接公開する必要はない
2. **セマンティックな操作に特化** - 文字列置換ではなくAST操作
3. **実用的なツールセットに絞る** - AIが実際に使うものだけ提供

### 最終的な必須ツールセット（優先順）
1. **php_rename_symbol** - シンボルのリネーム（最重要）
2. **php_find_references** - 参照検索
3. **php_get_symbols** - ファイル構造の把握
4. **php_move_file** - ファイル移動（名前空間も自動更新）

## LSP機能要件

### Phase 1（基本機能）
1. ~~**構文エラーチェック**~~ → 内部処理として実装
2. ~~**ASTの取得と表示**~~ → デバッグ用途、AIには不要
3. **シンボル一覧の取得** - ファイル内のクラス、関数、変数の一覧

### Phase 2（検索機能）
1. **定義へジャンプ** - シンボルの定義位置へ移動
2. **参照検索** - シンボルの使用箇所を検索
3. **ホバー情報** - カーソル位置の情報表示

### Phase 3（高度な機能）
1. **コード補完** - 文脈に応じた補完候補
2. **リファクタリング** - 変数名変更など
3. **フォーマット** - コード整形

## FSDアーキテクチャ（シンプル版）

```
src/
├── app/                    # アプリケーション層
│   ├── server.ts          # MCPサーバーのメインエントリ
│   └── index.ts           # エクスポート用エントリ
│
├── features/              # 機能層（各MCPツール）
│   ├── rename-symbol/     # シンボルリネーム（最重要）
│   │   ├── index.ts
│   │   ├── types.ts       # 型定義
│   │   ├── rename-symbol.ts # ビジネスロジック
│   │   └── tool.ts        # MCPツール定義
│   │
│   ├── find-references/   # 参照検索
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── find-references.ts
│   │   └── tool.ts
│   │
│   ├── get-symbols/       # シンボル一覧取得
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── get-symbols.ts
│   │   └── tool.ts
│   │
│   └── move-file/         # ファイル移動
│       ├── index.ts
│       ├── types.ts
│       ├── move-file.ts
│       └── tool.ts
│
├── entities/              # エンティティ層
│   ├── symbol/           # シンボル関連
│   │   ├── index.ts
│   │   └── types.ts
│   │
│   └── diagnostic/       # 診断関連
│       ├── index.ts
│       └── types.ts
│
├── shared/               # 共有層
│   ├── api/             # 外部API
│   │   └── mcp/
│   │       ├── index.ts
│   │       └── types.ts
│   │
│   ├── lib/             # ライブラリ
│   │   └── php-analyzer/
│   │       ├── symbol-table.ts    # シンボルテーブル
│   │       └── scope-analyzer.ts  # スコープ解析
│
└── lib/                  # 既存のphp-parser
    └── php-parser/       # （既存のパーサー実装）
```

## typescript-mcpの実装パターン

### ToolDef インターフェース
```typescript
interface ToolDef<S extends ZodType> {
  name: string;              // ツール識別子
  description: string;       // 人間が読める説明
  schema: S;                 // Zodスキーマで入力検証
  execute: (args: z.infer<S>) => Promise<string> | string;
}
```

### 重要な実装原則
1. **デバッグ出力は必ずstderr** - stdoutはMCPプロトコル専用
   ```typescript
   function debug(...args: unknown[]): void {
     console.error(...args);  // console.logではない！
   }
   ```

2. **統一されたエラーハンドリング**
   ```typescript
   return {
     content: [{ type: "text", text: errorMessage }],
     isError: true
   };
   ```

3. **プロジェクトルートのデフォルト設定**
   ```typescript
   server.setDefaultRoot(projectRoot);
   ```

## MCPツール実装例

### rename-symbol（最重要ツール）
```typescript
// features/rename-symbol/tool.ts
import { z } from 'zod';
import { ToolDef } from '../../shared/api/mcp/types';

const schema = z.object({
  root: z.string().describe("Root directory for resolving relative paths"),
  filePath: z.string().describe("File path containing the symbol"),
  line: z.union([z.number(), z.string()]).describe("Line number or string to match"),
  oldName: z.string().describe("Current name of the symbol"),
  newName: z.string().describe("New name for the symbol"),
});

export const renameSymbolTool: ToolDef<typeof schema> = {
  name: 'php_rename_symbol',
  description: 'Rename a PHP symbol across the codebase',
  schema,
  execute: async (args) => {
    // 1. PHPパーサーでASTを生成
    // 2. シンボルを探して位置を特定
    // 3. 全プロジェクトでの参照を検索
    // 4. 全ての出現箇所を更新
    // 5. 変更結果を返す
    return formatRenameResult(changes);
  }
};
```

### server.ts構成（typescript-mcpパターン）
```typescript
// app/server.ts
import { BaseMcpServer, StdioServerTransport, debug } from '../shared/api/mcp';
import { renameSymbolTool } from '../features/rename-symbol';
import { findReferencesTool } from '../features/find-references';
import { getSymbolsTool } from '../features/get-symbols';
import { moveFileTool } from '../features/move-file';

const tools = [
  renameSymbolTool,
  findReferencesTool,
  getSymbolsTool,
  moveFileTool,
];

export async function startServer() {
  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  
  const server = new BaseMcpServer({
    name: 'php',
    version: '1.0.0',
    description: 'PHP refactoring and analysis tools for MCP',
  });

  // プロジェクトルートの設定
  server.setDefaultRoot(projectRoot);
  
  // ツールの一括登録
  server.registerTools(tools);

  // サーバー起動
  const transport = new StdioServerTransport();
  await server.getServer().connect(transport);
  
  debug('PHP MCP Server running on stdio');
  debug(`Project root: ${projectRoot}`);
}
```

## エンティティ定義

### PhpSymbol
```typescript
export interface PhpSymbol {
  name: string;
  kind: 'class' | 'function' | 'variable' | 'constant' | 'method' | 'property';
  location: {
    file: string;
    line: number;
    column: number;
  };
  namespace?: string;
  visibility?: 'public' | 'private' | 'protected';
}
```

### Diagnostic
```typescript
export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: {
    file: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  code?: string;
}
```

## 次のステップ
1. MCPサーバーの基本構造を実装
2. Phase 1の4ツールを実装：
   - php_rename_symbol（最優先）
   - php_find_references
   - php_get_symbols
   - php_move_file
3. 各ツールのテストケースを作成
4. Phase 2以降のツールを順次実装

## 技術スタック
- TypeScript
- @modelcontextprotocol/sdk
- 既存のphp-parser
- Node.js
- Zod（スキーマ検証）

## PHP版実装の課題と解決策

### 1. ts-morphの代替
TypeScriptにはts-morphという強力なAST操作ライブラリがあるが、PHPには同等のものがない。
- **解決策**: 既存のphp-parserを拡張してシンボルテーブルとスコープ解析を実装

### 2. インポート文の自動更新
- **課題**: use文の解析と更新、名前空間の整合性維持
- **解決策**: 
  - PSR-4/PSR-0の命名規則を理解する処理
  - composer.jsonのautoload設定を解析
  - ファイル移動時の名前空間自動調整

### 3. プロジェクト管理
- **課題**: TypeScriptのようなプロジェクトファイル（tsconfig.json）がない
- **解決策**: 
  - composer.jsonを基準にプロジェクトルートを特定
  - vendorディレクトリを除外した再帰的ファイル探索

### 4. 型情報の推論
- **課題**: PHPの動的型付けとDocBlockからの型情報抽出
- **解決策**: 
  - PHPDocパーサーの実装
  - PHP 7.4+の型宣言のサポート
  - 簡易的な型推論エンジン

## 参考リンク
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [typescript-mcp by mizchi](https://github.com/mizchi/typescript-mcp) - 参考実装
- [TypeScript MCPの紹介記事](https://zenn.dev/mizchi/articles/introduce-typescript-mcp)