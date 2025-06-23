# PHP MCP サーバー ツール選定サマリー

## 最終決定: Phase 1で実装する4つの必須ツール

### 1. 🏆 php_rename_symbol（最優先）
**用途**: 変数、関数、クラス名のリネーム
```typescript
// 例: $oldName を $newName に変更
php_rename_symbol({
  filePath: "src/User.php",
  line: 10,
  oldName: "getUserName",
  newName: "getUsername"
})
```

### 2. 🔍 php_find_references
**用途**: シンボルの使用箇所を検索
```typescript
// 例: getUserName メソッドの全使用箇所を検索
php_find_references({
  filePath: "src/User.php",
  line: 10,
  symbolName: "getUserName"
})
```

### 3. 📋 php_get_symbols
**用途**: ファイル内の構造を把握
```typescript
// 例: ファイル内の全シンボルを取得
php_get_symbols({
  filePath: "src/User.php"
})
// 返り値: クラス、メソッド、プロパティの一覧
```

### 4. 📁 php_move_file
**用途**: ファイル移動と名前空間の自動更新
```typescript
// 例: ファイルを移動し、名前空間とuse文を更新
php_move_file({
  currentPath: "src/User.php",
  newPath: "src/Models/User.php"
})
// 自動で App\User → App\Models\User に更新
```

## なぜこの4つか？

1. **実用性**: AIが最も頻繁に使用する操作
2. **安全性**: セマンティックな操作で壊れにくい
3. **PHP特性**: 名前空間とPSR-4に完全対応
4. **段階的実装**: 基盤となる機能から開始

## 実装しないツール

- ❌ php_check_syntax（内部処理で十分）
- ❌ php_get_ast（デバッグ用途）
- ❌ php_get_diagnostics（エラーは操作時に返す）

## これらのツールで可能になること

- ✅ 安全なコードリファクタリング
- ✅ プロジェクト全体での一括変更
- ✅ PSR-4準拠の構造維持
- ✅ 依存関係の自動更新