import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateManager } from './manager.js';
import { BUILTIN_TEMPLATES } from './builtin-templates.js';
import { findConfigPath } from './discovery.js';
import { loadConfig } from './loader.js';
import { createLogger } from '../logger.js';

vi.mock('./discovery.js');
vi.mock('./loader.js');

describe('TemplateManager', () => {
  const mockFindConfigPath = vi.mocked(findConfigPath);
  const mockLoadConfig = vi.mocked(loadConfig);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return built-in templates when no custom config', () => {
    mockFindConfigPath.mockReturnValue(null);

    const manager = new TemplateManager();
    const templates = manager.getAvailableTemplates();

    expect(templates).toEqual(BUILTIN_TEMPLATES);
    expect(Object.keys(templates)).toHaveLength(4); // tsc, vitest, maven-build, maven-test
  });

  it('should merge custom templates with built-in', () => {
    mockFindConfigPath.mockReturnValue('/path/to/config.yaml');
    mockLoadConfig.mockReturnValue({
      templates: {
        'custom-tool': {
          description: 'Custom tool',
          include_regex: 'CUSTOM',
          tail_paragraphs: 1,
        },
      },
    });

    const manager = new TemplateManager();
    const templates = manager.getAvailableTemplates();

    expect(templates).toHaveProperty('tsc'); // built-in
    expect(templates).toHaveProperty('custom-tool'); // custom
    expect(Object.keys(templates)).toHaveLength(5); // 4 built-in + 1 custom
  });

  it('should allow custom templates to override built-in', () => {
    mockFindConfigPath.mockReturnValue('/path/to/config.yaml');
    mockLoadConfig.mockReturnValue({
      templates: {
        tsc: {
          description: 'Custom TSC override',
          include_regex: 'CUSTOM_ERROR',
          tail_paragraphs: 5,
        },
      },
    });

    const manager = new TemplateManager();
    const templates = manager.getAvailableTemplates();

    expect(templates['tsc']?.description).toBe('Custom TSC override');
    expect(templates['tsc']?.include_regex).toBe('CUSTOM_ERROR');
    expect(templates['tsc']?.tail_paragraphs).toBe(5);
  });

  it('should get specific template by name', () => {
    mockFindConfigPath.mockReturnValue(null);

    const manager = new TemplateManager();
    const template = manager.getTemplate('vitest');

    expect(template).toBeDefined();
    expect(template?.description).toContain('Vitest');
  });

  it('should return undefined for non-existent template', () => {
    mockFindConfigPath.mockReturnValue(null);

    const manager = new TemplateManager();
    const template = manager.getTemplate('non-existent');

    expect(template).toBeUndefined();
  });

  it('should cache templates based on TTL', () => {
    mockFindConfigPath.mockReturnValue(null);

    const manager = new TemplateManager(undefined, 1000); // 1 second TTL
    
    // First call - should load
    manager.getAvailableTemplates();
    expect(mockFindConfigPath).toHaveBeenCalledTimes(1);

    // Second call within TTL - should use cache
    manager.getAvailableTemplates();
    expect(mockFindConfigPath).toHaveBeenCalledTimes(1); // Still 1

    // Third call - should still use cache
    manager.getTemplate('tsc');
    expect(mockFindConfigPath).toHaveBeenCalledTimes(1); // Still 1
  });

  it('should reload templates after TTL expires', async () => {
    mockFindConfigPath.mockReturnValue(null);

    const shortTTL = 50; // 50ms
    const manager = new TemplateManager(undefined, shortTTL);
    
    // First call
    manager.getAvailableTemplates();
    expect(mockFindConfigPath).toHaveBeenCalledTimes(1);

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, shortTTL + 10));

    // Second call after TTL - should reload
    manager.getAvailableTemplates();
    expect(mockFindConfigPath).toHaveBeenCalledTimes(2);
  });

  it('should force reload with reloadConfig()', () => {
    mockFindConfigPath.mockReturnValue(null);

    const manager = new TemplateManager();
    
    // First call
    manager.getAvailableTemplates();
    expect(mockFindConfigPath).toHaveBeenCalledTimes(1);

    // Force reload
    manager.reloadConfig();
    manager.getAvailableTemplates();
    expect(mockFindConfigPath).toHaveBeenCalledTimes(2);
  });

  it('should handle config loading errors gracefully', () => {
    mockFindConfigPath.mockReturnValue('/path/to/config.yaml');
    mockLoadConfig.mockImplementation(() => {
      throw new Error('Failed to load config');
    });

    const manager = new TemplateManager();
    const templates = manager.getAvailableTemplates();

    // Should fall back to built-in templates
    expect(templates).toEqual(BUILTIN_TEMPLATES);
    expect(Object.keys(templates)).toHaveLength(4);
  });

  it('should log template loading process', () => {
    mockFindConfigPath.mockReturnValue('/path/to/config.yaml');
    mockLoadConfig.mockReturnValue({
      templates: {
        'custom-tool': {
          description: 'Custom',
          include_regex: 'ERROR',
          tail_paragraphs: 1,
        },
      },
    });

    const logger = createLogger('test');
    const infoSpy = vi.spyOn(logger, 'info');
    const debugSpy = vi.spyOn(logger, 'debug');

    const manager = new TemplateManager(logger);
    manager.getAvailableTemplates();

    expect(debugSpy).toHaveBeenCalledWith('Loading fresh templates');
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('built-in template'));
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('custom template'));
  });

  it('should log cache usage', () => {
    mockFindConfigPath.mockReturnValue(null);

    const logger = createLogger('test');
    const debugSpy = vi.spyOn(logger, 'debug');

    const manager = new TemplateManager(logger);
    
    // First call - loads fresh
    manager.getAvailableTemplates();
    expect(debugSpy).toHaveBeenCalledWith('Loading fresh templates');

    // Second call - uses cache
    debugSpy.mockClear();
    manager.getAvailableTemplates();
    expect(debugSpy).toHaveBeenCalledWith('Using cached templates');
  });
});
