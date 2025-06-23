# PHP MCP ディレクトリ構造 ビジュアルガイド

## 🎯 構造の概要

```
📦 php-mcp/
├── 📁 src/
│   ├── 🏠 app/          → アプリのエントリポイント
│   ├── 🔧 features/     → 各MCPツール（メイン実装）
│   ├── 💎 entities/     → ビジネスモデル
│   ├── 🤝 shared/       → 共有コード
│   └── 📚 lib/          → 外部ライブラリ
├── 🧪 tests/
├── 📄 docs/
└── 📦 dist/
```

## 🔧 Feature層の詳細（最重要）

各featureは**必ず4ファイル**構成：

```
📁 rename-symbol/
├── 📄 index.ts          → エクスポート（1-2行）
├── 📄 types.ts          → 型定義
├── 📄 rename-symbol.ts  → メインロジック
└── 📄 tool.ts          → MCP接続部分
```

### 実装の流れ

```
1️⃣ tool.ts
   ↓ (MCPからのリクエスト)
2️⃣ rename-symbol.ts
   ↓ (ビジネスロジック実行)
3️⃣ 結果を返す
```

## 📝 各ファイルの役割と内容

### 1️⃣ index.ts（エクスポート専用）
```typescript
export { renameSymbolTool } from './tool';
export * from './types';
```
**これだけ！** 余計なことは書かない。

### 2️⃣ types.ts（型定義）
```typescript
// Input
export interface RenameSymbolRequest {
  filePath: string;
  line: number | string;
  oldName: string;
  newName: string;
}

// Output
export interface RenameSymbolResult {
  message: string;
  changedFiles: ChangedFile[];
}

// 補助的な型
export interface ChangedFile {
  path: string;
  changes: Change[];
}
```

### 3️⃣ rename-symbol.ts（ビジネスロジック）
```typescript
import { RenameSymbolRequest, RenameSymbolResult } from './types';
import { parsePhp } from '@lib/php-parser';

export async function renameSymbol(
  request: RenameSymbolRequest
): Promise<RenameSymbolResult> {
  // ここに実装
  // - PHPファイルをパース
  // - シンボルを探す
  // - リネーム処理
  // - 結果を返す
}
```

### 4️⃣ tool.ts（MCP接続）
```typescript
import { z } from 'zod';
import { ToolDef } from '@shared/api/mcp/types';
import { renameSymbol } from './rename-symbol';

// Zodスキーマ（バリデーション用）
const schema = z.object({
  filePath: z.string(),
  line: z.union([z.number(), z.string()]),
  oldName: z.string(),
  newName: z.string(),
});

// MCPツール定義
export const renameSymbolTool: ToolDef<typeof schema> = {
  name: 'php_rename_symbol',
  description: 'Rename a PHP symbol across the codebase',
  schema,
  execute: async (args) => {
    const result = await renameSymbol(args);
    return JSON.stringify(result, null, 2);
  }
};
```

## 🏗️ レイヤー間の依存関係

```
app
 ↓ import可能
features
 ↓ import可能
entities
 ↓ import可能
shared
 ↓ import可能
lib

❌ 逆方向のimportは禁止！
```

## 🚀 新機能追加の手順

### 1. ディレクトリとファイルを作成
```bash
# 例: organize-importsツールを追加
mkdir src/features/organize-imports
cd src/features/organize-imports
touch index.ts types.ts organize-imports.ts tool.ts
```

### 2. 各ファイルを実装
- まず`types.ts`で型を定義
- 次に`organize-imports.ts`でロジック実装
- `tool.ts`でMCP接続
- 最後に`index.ts`でエクスポート

### 3. サーバーに登録
```typescript
// app/server.ts
import { organizeImportsTool } from '@features/organize-imports';

const tools = [
  renameSymbolTool,
  findReferencesTool,
  getSymbolsTool,
  moveFileTool,
  organizeImportsTool, // 追加！
];
```

## 🎭 entities vs features/types の使い分け

### entities = 「PHPの世界の住人たち」
```typescript
// entities/symbol/types.ts
export interface PhpSymbol {
  name: string;      // シンボルの名前
  kind: SymbolKind;  // 種類（クラス、関数など）
  location: Location; // どこにいるか
}
// → アプリ全体で「PHPのシンボルとは何か」を定義
```

### features/types = 「各ツールの会話内容」
```typescript
// features/rename-symbol/types.ts
export interface RenameSymbolRequest {
  oldName: string;  // 「これを...」
  newName: string;  // 「これに変えて！」
}
// → このツールだけの入出力仕様
```

### 🔍 見分け方
- **entities**: 「PHPには〇〇という概念がある」
- **features/types**: 「このツールは〇〇を受け取って〇〇を返す」

## 💡 ベストプラクティス

### ✅ DO
- 各featureは独立して動作可能に
- 型定義は適切に分離（entities vs features）
- ビジネスロジックは`feature-name.ts`に
- シンプルに保つ

### ❌ DON'T
- entitiesにツール固有の型を入れる
- featuresから他のfeaturesの型を参照
- 過度な抽象化
- index.tsに実装を書く

## 📊 全体のファイル数目安

```
app/        2ファイル
features/  16ファイル（4機能 × 4ファイル）
entities/   4ファイル（2エンティティ × 2ファイル）
shared/     8ファイル程度
---------------------------------
合計      約30ファイル（とてもシンプル！）
```

## 🎨 Visual Studio Codeの推奨設定

ファイルアイコンでフォルダの役割が分かるように：

```json
"material-icon-theme.folders.associations": {
  "features": "components",
  "entities": "class",
  "shared": "shared",
  "app": "app"
}
```

これで、一目で各ディレクトリの役割が分かります！