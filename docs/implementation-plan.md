# PHP MCP Server 実装計画

## 実装の流れ

### 1. 開発環境のセットアップ
```bash
# 必要なパッケージのインストール
npm install @modelcontextprotocol/sdk
npm install -D @types/node tsx typescript
```

### 2. 基本的なMCPサーバー構造の作成

#### Step 1: app/server.tsの作成
- MCPサーバーの初期化
- StdioServerTransportの設定
- 基本的なツールリストの登録

#### Step 2: app/index.tsの作成
- server.tsのエクスポート

#### Step 3: package.jsonのスクリプト追加
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/app/server.ts",
    "start": "node dist/app/server.js",
    "test": "vitest"
  }
}
```

### 3. Phase 1ツールの実装（優先順）

#### 最優先: php_rename_symbol
- features/rename-symbol/tool.ts の作成
- シンボル検索とAST操作の実装
- 全ファイルでの参照更新

#### Step 2: php_find_references
- features/find-references/tool.ts の作成
- プロジェクト全体でのシンボル使用箇所検索
- 結果のフォーマット

#### Step 3: php_get_symbols
- features/get-symbols/tool.ts の作成
- ファイル内のクラス、関数、変数の抽出
- 階層構造の表現

#### Step 4: php_move_file
- features/move-file/tool.ts の作成
- 名前空間の自動更新
- use文の更新処理

### 4. シンボル関連ツールの実装

#### Step 1: エンティティ定義
- entities/symbol/types.ts の作成
- PhpSymbol型の定義

#### Step 2: シンボルテーブルの実装
- shared/lib/php-analyzer/symbol-table.ts
- ASTからシンボルを抽出する機能

#### Step 3: document-symbolsツール
- ファイル内の全シンボルを返す

#### Step 4: find-symbolツール
- 特定のシンボルを検索

### 5. 高度な機能の実装

#### スコープ解析
- shared/lib/php-analyzer/scope-analyzer.ts
- 変数のスコープを追跡

#### 定義へジャンプ
- シンボルの定義位置を特定

#### 参照検索
- シンボルの使用箇所を検索

### 6. テストとドキュメント

#### 統合テスト
- MCPサーバー全体のテスト
- 各ツールの連携テスト

#### ドキュメント
- README.mdの更新
- 各ツールの使用例
- APIドキュメント

## 実装時の注意点

### エラーハンドリング
- Result型を活用した関数型エラーハンドリング
- 適切なエラーメッセージの提供

### パフォーマンス
- 大きなファイルの処理を考慮
- 必要に応じてメモ化を使用
- 増分解析の検討

### 拡張性
- 新しいツールを簡単に追加できる構造
- 既存コードの再利用を意識

### TypeScript設定
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## コマンド例

### 開発サーバーの起動
```bash
npm run dev
```

### MCPクライアントからの接続テスト
```bash
# 別のターミナルで
mcp-client connect stdio -- node dist/app/server.js
```

### ツールの呼び出し例
```json
{
  "tool": "php_syntax_check",
  "arguments": {
    "code": "<?php echo 'Hello World';"
  }
}
```

## トラブルシューティング

### よくある問題
1. **パーサーエラー**: PHPコードのエンコーディングを確認
2. **メモリ不足**: 大きなファイルの場合は分割処理を検討
3. **接続エラー**: StdioTransportの設定を確認

### デバッグ方法
- console.errorでエラーログを出力
- MCPのデバッグモードを有効化
- 各ツールを単体でテスト