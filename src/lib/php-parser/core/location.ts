/**
 * ソースコード位置情報の定義
 * エラーレポートやソースマップに使用
 */

/**
 * ソースコード内の位置
 */
export interface SourcePosition {
  /** 行番号（1始まり） */
  readonly line: number;
  /** 列番号（1始まり） */
  readonly column: number;
  /** ファイル先頭からのオフセット（0始まり） */
  readonly offset: number;
}

/**
 * ソースコード内の範囲
 */
export interface SourceLocation {
  /** 開始位置 */
  readonly start: SourcePosition;
  /** 終了位置 */
  readonly end: SourcePosition;
  /** ソースファイル名（オプション） */
  readonly source?: string;
}

/**
 * 位置情報を作成するヘルパー関数
 */
export function createPosition(
  line: number,
  column: number,
  offset: number
): SourcePosition {
  return { line, column, offset };
}

/**
 * 範囲情報を作成するヘルパー関数
 */
export function createLocation(
  start: SourcePosition,
  end: SourcePosition,
  source?: string
): SourceLocation {
  return { start, end, source };
}

/**
 * 2つの位置を結合して範囲を作成
 */
export function mergeLocations(
  first: SourceLocation,
  second: SourceLocation
): SourceLocation {
  return {
    start: first.start,
    end: second.end,
    source: first.source || second.source
  };
}

/**
 * 位置情報を人間が読める形式に変換
 */
export function formatLocation(location: SourceLocation): string {
  const { start, source } = location;
  const prefix = source ? `${source}:` : '';
  return `${prefix}${start.line}:${start.column}`;
}