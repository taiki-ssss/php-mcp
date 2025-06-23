/**
 * Source code location definitions
 * Used for error reporting and source maps
 */

/**
 * Position within source code
 */
export interface SourcePosition {
  /** Line number (1-based) */
  readonly line: number;
  /** Column number (1-based) */
  readonly column: number;
  /** Offset from file start (0-based) */
  readonly offset: number;
}

/**
 * Range within source code
 */
export interface SourceLocation {
  /** Start position */
  readonly start: SourcePosition;
  /** End position */
  readonly end: SourcePosition;
  /** Source file name (optional) */
  readonly source?: string;
}

/**
 * Helper function to create position information
 */
export function createPosition(
  line: number,
  column: number,
  offset: number
): SourcePosition {
  return { line, column, offset };
}

/**
 * Helper function to create location range
 */
export function createLocation(
  start: SourcePosition,
  end: SourcePosition,
  source?: string
): SourceLocation {
  return { start, end, source };
}

/**
 * Merge two locations to create a range
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
 * Format location information in human-readable form
 */
export function formatLocation(location: SourceLocation): string {
  const { start, source } = location;
  const prefix = source ? `${source}:` : '';
  return `${prefix}${start.line}:${start.column}`;
}