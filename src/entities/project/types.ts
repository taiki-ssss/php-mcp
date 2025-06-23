/**
 * PHP Project related types
 */

/**
 * Composer.json autoload configuration
 */
export interface ComposerAutoload {
  'psr-4'?: Record<string, string | string[]>;
  'psr-0'?: Record<string, string | string[]>;
  'classmap'?: string[];
  'files'?: string[];
}

/**
 * Composer.json structure (simplified)
 */
export interface ComposerConfig {
  name?: string;
  type?: string;
  description?: string;
  autoload?: ComposerAutoload;
  'autoload-dev'?: ComposerAutoload;
  require?: Record<string, string>;
  'require-dev'?: Record<string, string>;
}

/**
 * PHP Project information
 */
export interface PhpProject {
  rootPath: string;
  composerJson?: ComposerConfig;
  files: string[];
  excludePaths?: string[];
}