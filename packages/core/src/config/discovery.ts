/**
 * Configuration file discovery
 * Search for .quiet-shell/config.yaml from current directory upward
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Logger } from '../types.js';

export const CONFIG_FILE_NAME = '.quiet-shell/config.yaml';

/**
 * Find configuration file by searching upward from current directory
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @param logger - Logger instance for debugging
 * @returns Path to config file or null if not found
 */
export function findConfigPath(startDir?: string, logger?: Logger): string | null {
  const start = startDir ?? process.cwd();
  let currentDir = resolve(start);
  const root = resolve('/');

  logger?.debug('Starting config search from:', currentDir);

  while (true) {
    const configPath = resolve(currentDir, CONFIG_FILE_NAME);
    
    if (existsSync(configPath)) {
      logger?.info('Found config file:', configPath);
      return configPath;
    }

    // Reached root without finding config
    if (currentDir === root) {
      logger?.debug('No config file found, searched up to root');
      return null;
    }

    // Move up one directory
    currentDir = dirname(currentDir);
  }
}
