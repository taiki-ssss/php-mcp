# PHP MCP サーバー ディレクトリ構造

## 設計思想

### シンプルさを最優先
- **YAGNI原則**: You Aren't Gonna Need It - 必要になるまで作らない
- **KISS原則**: Keep It Simple, Stupid - シンプルに保つ
- **FSD準拠**: Feature-Sliced Designのレイヤー構造は維持

## ディレクトリ構造

```
php-mcp/
├── src/
│   ├── app/                        # アプリケーション層
│   │   ├── server.ts              # MCPサーバーのメインエントリ
│   │   └── index.ts               # エクスポート用
│   │
│   ├── features/                   # フィーチャー層（各MCPツール）
│   │   ├── rename-symbol/         # シンボルリネーム機能
│   │   │   ├── index.ts          # エクスポート
│   │   │   ├── types.ts          # 型定義
│   │   │   ├── rename-symbol.ts  # ビジネスロジック
│   │   │   └── tool.ts           # MCPツール定義
│   │   │
│   │   ├── find-references/       # 参照検索機能
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── find-references.ts
│   │   │   └── tool.ts
│   │   │
│   │   ├── get-symbols/           # シンボル一覧取得機能
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── get-symbols.ts
│   │   │   └── tool.ts
│   │   │
│   │   └── move-file/             # ファイル移動機能
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── move-file.ts
│   │       └── tool.ts
│   │
│   ├── entities/                   # エンティティ層（ビジネスモデル）
│   │   ├── symbol/                # シンボル関連
│   │   │   ├── index.ts
│   │   │   └── types.ts          # PhpSymbol型定義
│   │   │
│   │   └── project/               # プロジェクト関連
│   │       ├── index.ts
│   │       └── types.ts          # PhpProject型定義
│   │
│   ├── shared/                     # 共有層
│   │   ├── api/                   # 外部API
│   │   │   └── mcp/              # MCPプロトコル関連
│   │   │       ├── index.ts
│   │   │       ├── base-server.ts # BaseMcpServerクラス
│   │   │       ├── types.ts      # ToolDef等の共通型
│   │   │       └── utils.ts      # debug関数等のユーティリティ
│   │   │
│   │   └── lib/                   # 共有ライブラリ
│   │       └── php-analyzer/     # PHP解析エンジン
│   │           ├── index.ts
│   │           ├── symbol-table.ts
│   │           ├── scope-analyzer.ts
│   │           └── project-scanner.ts
│   │
│   └── lib/                        # 外部ライブラリ
│       └── php-parser/            # 既存のPHPパーサー
│
├── tests/                          # テスト
│   ├── fixtures/                  # テスト用PHPファイル
│   ├── features/                  # 各featureのテスト
│   └── integration/               # 統合テスト
│
├── docs/                          # ドキュメント
├── dist/                          # ビルド出力
└── scripts/                       # ビルドスクリプト等
```

## 各層の責務

### app層
- MCPサーバーの起動と初期化
- ツールの登録
- グローバルな設定管理

### features層
- 各MCPツールの実装
- ツール固有のビジネスロジック
- MCPプロトコルへの適合
- **重要**: 各featureの`types.ts`はその機能専用のI/O型定義

### entities層
- PHPコードの概念モデル（Symbol、Project等）
- ビジネスルールの定義
- アプリ全体で共有される型定義
- **重要**: featuresの型は含まない（共通概念のみ）

### shared層
- 横断的関心事の実装
- 外部ライブラリのラッパー
- 共通ユーティリティ

## entities vs features/types の違い（重要）

### entities/symbol/types.ts - 共通のビジネスモデル
```typescript
// アプリ全体で使われるPHPの概念
export interface PhpSymbol {
  name: string;
  kind: 'class' | 'function' | 'variable' | 'constant' | 'method' | 'property';
  location: SourceLocation;
  namespace?: string;
  visibility?: 'public' | 'private' | 'protected';
}
```

### features/rename-symbol/types.ts - 機能固有のI/O
```typescript
// この機能だけで使うリクエスト/レスポンス型
export interface RenameSymbolRequest {
  filePath: string;
  line: number | string;
  oldName: string;
  newName: string;
}

export interface RenameSymbolResult {
  message: string;
  changedFiles: ChangedFile[];
}
```

### 使い分けの原則
- **entities**: What（何を扱うか） - PHPコードの普遍的な概念
- **features/types**: How（どう処理するか） - 各ツールのI/O仕様

### 依存関係の例
```typescript
// features/rename-symbol/rename-symbol.ts
import { PhpSymbol } from '@entities/symbol';  // 共通概念を使用
import { RenameSymbolRequest } from './types';  // 自分のI/O型

export async function renameSymbol(request: RenameSymbolRequest) {
  // PhpSymbol型を内部で活用
  const symbol: PhpSymbol = await findSymbol(request);
  // ...
}
```

## ファイル構成パターン

### Feature層の標準構成（4ファイル）

```
feature-name/
├── index.ts          # publicエクスポート
├── types.ts          # この機能専用の型定義
├── feature-name.ts   # ビジネスロジック実装
└── tool.ts          # MCPツール定義
```

#### index.ts
```typescript
export { featureNameTool } from './tool';
export * from './types';
```

#### types.ts
```typescript
// この機能専用の型定義
export interface FeatureNameRequest {
  // リクエストパラメータ
}

export interface FeatureNameResult {
  // レスポンス形式
}
```

#### feature-name.ts
```typescript
// ビジネスロジックの実装
import { FeatureNameRequest, FeatureNameResult } from './types';

export async function featureName(
  request: FeatureNameRequest
): Promise<FeatureNameResult> {
  // 実装
}
```

#### tool.ts
```typescript
// MCPツール定義
import { z } from 'zod';
import { ToolDef } from '@shared/api/mcp/types';
import { featureName } from './feature-name';

const schema = z.object({
  // Zodスキーマ定義
});

export const featureNameTool: ToolDef<typeof schema> = {
  name: 'php_feature_name',
  description: 'Description of the tool',
  schema,
  execute: async (args) => {
    const result = await featureName(args);
    return formatResult(result);
  }
};
```

### Entity層の標準構成（2ファイル）

```
entity-name/
├── index.ts  # エクスポート
└── types.ts  # 型定義
```

## Import規則（FSD原則）

### 正しいimportの方向
```
app → features → entities → shared → lib
```

### 禁止されるimport
- 下位層から上位層へのimport（例: shared → features）
- 同一層の他featureへの直接import（shared経由で共有）

## 命名規則

### ファイル・ディレクトリ名
- **kebab-case**: `rename-symbol.ts`, `find-references/`

### TypeScript
- **インターフェース**: PascalCase（例: `PhpSymbol`）
- **型エイリアス**: PascalCase（例: `SymbolKind`）
- **関数**: camelCase（例: `renameSymbol`）
- **定数**: SCREAMING_SNAKE_CASE（例: `DEFAULT_TIMEOUT`）

## パスエイリアス設定

tsconfig.jsonで以下のエイリアスを設定：

```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["src/app/*"],
      "@features/*": ["src/features/*"],
      "@entities/*": ["src/entities/*"],
      "@shared/*": ["src/shared/*"],
      "@lib/*": ["src/lib/*"]
    }
  }
}
```

## 新機能追加時の手順

1. featureディレクトリを作成
```bash
mkdir -p src/features/new-feature
```

2. 標準4ファイルを作成
```bash
touch src/features/new-feature/{index.ts,types.ts,new-feature.ts,tool.ts}
```

3. 実装を追加

4. app/server.tsでツールを登録

## この構造の利点

1. **即座に理解可能**: 新しい開発者もすぐに全体像を把握
2. **ファイル数最小**: 各featureは4ファイル、各entityは2ファイルのみ
3. **一貫性**: すべてのfeatureが同じ構造
4. **拡張が簡単**: 新機能追加時のパターンが明確
5. **過度な抽象化を回避**: 必要になったら分割する

## まとめ

このディレクトリ構造は、シンプルさと拡張性のバランスを重視しています。FSDの原則に従いながら、PHPMCPサーバーの要件に最適化された最小限の構造を実現しています。