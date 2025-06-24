/**
 * PHP Parser Constants
 * 
 * Central location for all magic numbers and hardcoded values
 * used throughout the PHP parser implementation.
 */

// PHP Tag Constants
export const PHP_TAGS = {
  OPEN_TAG: '<?php',
  OPEN_TAG_ECHO: '<?=',
  OPEN_TAG_SHORT: '<?',
  CLOSE_TAG: '?>',
} as const;

export const PHP_TAG_LENGTHS = {
  OPEN_TAG: 5,        // length of '<?php'
  OPEN_TAG_ECHO: 3,   // length of '<?='
  OPEN_TAG_SHORT: 2,  // length of '<?'
  CLOSE_TAG: 2,       // length of '?>'
} as const;

// Comment Markers
export const COMMENT_MARKERS = {
  LINE_COMMENT: '//',
  BLOCK_COMMENT_START: '/*',
  BLOCK_COMMENT_END: '*/',
  DOC_COMMENT_START: '/**',
  HEREDOC: '<<<',
} as const;

export const COMMENT_LENGTHS = {
  LINE_COMMENT: 2,         // length of '//'
  BLOCK_COMMENT_START: 2,  // length of '/*'
  BLOCK_COMMENT_END: 2,    // length of '*/'
  HEREDOC: 3,              // length of '<<<'
} as const;

// Number Literal Prefixes
export const NUMBER_PREFIXES = {
  HEX: ['x', 'X'],
  BINARY: ['b', 'B'],
  OCTAL: ['o', 'O'],
} as const;

// Cast Types
export const CAST_TYPES = [
  'int', 'integer', 'float', 'double',
  'string', 'bool', 'boolean', 'array', 'object'
] as const;

// Default Values
export const DEFAULTS = {
  LINE_NUMBER: 1,
  COLUMN_NUMBER: 1,
  ARRAY_INDEX: 0,
  CONTEXT_LENGTH: 20,
  PHP_VERSION: '8.0',
} as const;

// File Patterns
export const FILE_PATTERNS = {
  EXCLUDE: ['**/vendor/**', '**/node_modules/**'],
  PHP_EXTENSION: '.php',
} as const;

// Special Characters
export const SPECIAL_CHARS = {
  DOLLAR_SIGN: '$',
  SINGLE_QUOTE: "'",
  DOUBLE_QUOTE: '"',
  BACKTICK: '`',
} as const;

// Array Index Offsets (for accessing previous tokens)
export const TOKEN_OFFSETS = {
  PREVIOUS: 1,
  TWO_BACK: 2,
  THREE_BACK: 3,
} as const;

// Unknown/Default Names
export const DEFAULT_NAMES = {
  UNKNOWN: 'unknown',
  ANONYMOUS: 'anonymous',
} as const;