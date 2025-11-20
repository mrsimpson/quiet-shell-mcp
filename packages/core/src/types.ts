/**
 * Core types for quiet-shell
 */

/**
 * Logger interface for dependency injection
 * CRITICAL: Never use console.log/error - it breaks MCP protocol
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Template configuration for output filtering
 */
export interface Template {
  /** Human-readable description */
  description: string;
  /** Regex pattern for matching lines to include */
  include_regex: string;
  /** Number of paragraphs to include from end of output */
  tail_paragraphs: number;
}

/**
 * Collection of templates
 */
export interface TemplateConfig {
  templates: Record<string, Template>;
}

/**
 * Result from command execution
 */
export interface ExecutionResult {
  /** Command exit code (0 = success) */
  exitCode: number;
  /** Combined stdout and stderr output */
  output: string;
}
