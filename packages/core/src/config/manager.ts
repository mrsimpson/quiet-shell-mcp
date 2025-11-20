/**
 * Template Manager with configuration loading and caching
 */

import type { Logger, Template } from "../types.js";
import { BUILTIN_TEMPLATES } from "./builtin-templates.js";
import { findConfigPath } from "./discovery.js";
import { loadConfig } from "./loader.js";

export const CONFIG_CACHE_TTL = 60000; // 60 seconds

/**
 * Template Manager handles template discovery, loading, merging, and caching
 */
export class TemplateManager {
  private cache: Record<string, Template> | null = null;
  private cacheTime = 0;
  private readonly logger: Logger | undefined;
  private readonly cacheTTL: number;

  constructor(logger?: Logger, cacheTTL = CONFIG_CACHE_TTL) {
    this.logger = logger;
    this.cacheTTL = cacheTTL;
  }

  /**
   * Get all available templates (built-in + custom)
   * @returns Record of all templates
   */
  getAvailableTemplates(): Record<string, Template> {
    return this.loadTemplatesWithCache();
  }

  /**
   * Get a specific template by name
   * @param name - Template name
   * @returns Template or undefined if not found
   */
  getTemplate(name: string): Template | undefined {
    const templates = this.loadTemplatesWithCache();
    return templates[name];
  }

  /**
   * Force reload configuration (bypass cache)
   */
  reloadConfig(): void {
    this.cache = null;
    this.cacheTime = 0;
    this.logger?.info("Config cache cleared");
  }

  /**
   * Load templates with caching
   */
  private loadTemplatesWithCache(): Record<string, Template> {
    const now = Date.now();

    // Return cached if still valid
    if (this.cache && now - this.cacheTime < this.cacheTTL) {
      this.logger?.debug("Using cached templates");
      return this.cache;
    }

    // Load fresh templates
    this.logger?.debug("Loading fresh templates");
    const templates = this.loadTemplates();

    // Update cache
    this.cache = templates;
    this.cacheTime = now;

    return templates;
  }

  /**
   * Load and merge templates from all sources
   */
  private loadTemplates(): Record<string, Template> {
    // Start with built-in templates
    const templates: Record<string, Template> = { ...BUILTIN_TEMPLATES };
    this.logger?.info(
      `Loaded ${Object.keys(BUILTIN_TEMPLATES).length} built-in template(s)`
    );

    // Try to load custom templates
    try {
      const configPath = findConfigPath(undefined, this.logger);

      if (configPath) {
        const customConfig = loadConfig(configPath, this.logger);

        // Merge custom templates (override built-ins)
        let overrideCount = 0;
        for (const [name, template] of Object.entries(customConfig.templates)) {
          if (templates[name]) {
            this.logger?.info(`Custom template "${name}" overrides built-in`);
            overrideCount++;
          }
          templates[name] = template;
        }

        const customCount = Object.keys(customConfig.templates).length;
        this.logger?.info(
          `Merged ${customCount} custom template(s) (${overrideCount} override(s))`
        );
      } else {
        this.logger?.debug(
          "No custom config found, using built-in templates only"
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.warn(
        "Failed to load custom config, using built-in templates only:",
        message
      );
    }

    return templates;
  }
}
