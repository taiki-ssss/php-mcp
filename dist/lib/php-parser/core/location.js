"use strict";
/**
 * ソースコード位置情報の定義
 * エラーレポートやソースマップに使用
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPosition = createPosition;
exports.createLocation = createLocation;
exports.mergeLocations = mergeLocations;
exports.formatLocation = formatLocation;
/**
 * 位置情報を作成するヘルパー関数
 */
function createPosition(line, column, offset) {
    return { line, column, offset };
}
/**
 * 範囲情報を作成するヘルパー関数
 */
function createLocation(start, end, source) {
    return { start, end, source };
}
/**
 * 2つの位置を結合して範囲を作成
 */
function mergeLocations(first, second) {
    return {
        start: first.start,
        end: second.end,
        source: first.source || second.source
    };
}
/**
 * 位置情報を人間が読める形式に変換
 */
function formatLocation(location) {
    const { start, source } = location;
    const prefix = source ? `${source}:` : '';
    return `${prefix}${start.line}:${start.column}`;
}
