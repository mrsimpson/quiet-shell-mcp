/**
 * @codemcp/quiet-shell-core
 * Core logic for quiet-shell MCP server
 */

// Types
export type { Logger, Template, TemplateConfig, ExecutionResult } from './types.js';

// Logger
export { createLogger } from './logger.js';

// Filtering
export { parseParagraphs } from './filter/paragraph-parser.js';
export { filterOutput } from './filter/output-filter.js';

// Configuration
export { BUILTIN_TEMPLATES } from './config/builtin-templates.js';
export { CONFIG_FILE_NAME, findConfigPath } from './config/discovery.js';
export { loadConfig, validateTemplate } from './config/loader.js';
export { TemplateManager, CONFIG_CACHE_TTL } from './config/manager.js';

// Command execution
export { executeCommand } from './executor/command-executor.js';
