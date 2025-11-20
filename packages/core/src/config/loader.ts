/**
 * Configuration file loader and validator
 */

import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import type { Logger, Template, TemplateConfig } from "../types.js";

/**
 * Load and parse configuration from YAML file
 * @param configPath - Path to config file
 * @param logger - Logger instance
 * @returns Parsed configuration
 * @throws Error if file cannot be read or parsed
 */
export function loadConfig(
  configPath: string,
  logger?: Logger
): TemplateConfig {
  try {
    logger?.debug("Loading config from:", configPath);

    const content = readFileSync(configPath, "utf-8");
    const parsed = load(content) as unknown;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Config file must contain an object");
    }

    const config = parsed as Record<string, unknown>;

    if (!config["templates"] || typeof config["templates"] !== "object") {
      throw new Error('Config must have "templates" object');
    }

    const templates: Record<string, Template> = {};
    const templatesObj = config["templates"] as Record<string, unknown>;

    for (const [name, template] of Object.entries(templatesObj)) {
      try {
        const validated = validateTemplate(template);
        templates[name] = validated;
        logger?.debug("Loaded template:", name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger?.warn(`Skipping invalid template "${name}":`, message);
      }
    }

    logger?.info(
      `Loaded ${Object.keys(templates).length} template(s) from config`
    );

    return { templates };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.error("Failed to load config:", message);
    throw error;
  }
}

/**
 * Validate template structure
 * @param template - Template object to validate
 * @returns Validated template
 * @throws Error if template is invalid
 */
export function validateTemplate(template: unknown): Template {
  if (!template || typeof template !== "object") {
    throw new Error("Template must be an object");
  }

  const t = template as Record<string, unknown>;

  if (typeof t["description"] !== "string") {
    throw new Error('Template must have "description" string');
  }

  if (typeof t["include_regex"] !== "string") {
    throw new Error('Template must have "include_regex" string');
  }

  // Validate regex is compilable
  try {
    new RegExp(t["include_regex"]);
  } catch {
    throw new Error(`Invalid regex pattern: ${t["include_regex"]}`);
  }

  if (typeof t["tail_paragraphs"] !== "number" || t["tail_paragraphs"] < 0) {
    throw new Error(
      'Template must have "tail_paragraphs" as non-negative number'
    );
  }

  return {
    description: t["description"],
    include_regex: t["include_regex"],
    tail_paragraphs: t["tail_paragraphs"]
  };
}
