import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, validateTemplate } from './loader.js';
import { readFileSync } from 'node:fs';
import { createLogger } from '../logger.js';

vi.mock('node:fs');

describe('validateTemplate', () => {
  it('should validate valid template', () => {
    const template = {
      description: 'Test template',
      include_regex: 'ERROR',
      tail_paragraphs: 1,
    };

    const result = validateTemplate(template);
    expect(result).toEqual(template);
  });

  it('should reject non-object template', () => {
    expect(() => validateTemplate(null)).toThrow('Template must be an object');
    expect(() => validateTemplate('string')).toThrow('Template must be an object');
  });

  it('should reject template without description', () => {
    const template = {
      include_regex: 'ERROR',
      tail_paragraphs: 1,
    };

    expect(() => validateTemplate(template)).toThrow('must have "description"');
  });

  it('should reject template without include_regex', () => {
    const template = {
      description: 'Test',
      tail_paragraphs: 1,
    };

    expect(() => validateTemplate(template)).toThrow('must have "include_regex"');
  });

  it('should reject template without tail_paragraphs', () => {
    const template = {
      description: 'Test',
      include_regex: 'ERROR',
    };

    expect(() => validateTemplate(template)).toThrow('must have "tail_paragraphs"');
  });

  it('should reject template with invalid regex', () => {
    const template = {
      description: 'Test',
      include_regex: '[invalid(regex',
      tail_paragraphs: 1,
    };

    expect(() => validateTemplate(template)).toThrow('Invalid regex pattern');
  });

  it('should reject template with negative tail_paragraphs', () => {
    const template = {
      description: 'Test',
      include_regex: 'ERROR',
      tail_paragraphs: -1,
    };

    expect(() => validateTemplate(template)).toThrow('non-negative number');
  });
});

describe('loadConfig', () => {
  const mockReadFileSync = vi.mocked(readFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load valid config', () => {
    const yaml = `
templates:
  my-tool:
    description: "My tool"
    include_regex: "ERROR"
    tail_paragraphs: 1
`;
    mockReadFileSync.mockReturnValue(yaml);

    const config = loadConfig('/path/to/config.yaml');
    
    expect(config.templates).toHaveProperty('my-tool');
    expect(config.templates['my-tool']).toEqual({
      description: 'My tool',
      include_regex: 'ERROR',
      tail_paragraphs: 1,
    });
  });

  it('should load multiple templates', () => {
    const yaml = `
templates:
  tool-1:
    description: "Tool 1"
    include_regex: "ERROR"
    tail_paragraphs: 1
  tool-2:
    description: "Tool 2"
    include_regex: "WARN"
    tail_paragraphs: 2
`;
    mockReadFileSync.mockReturnValue(yaml);

    const config = loadConfig('/path/to/config.yaml');
    
    expect(Object.keys(config.templates)).toHaveLength(2);
    expect(config.templates).toHaveProperty('tool-1');
    expect(config.templates).toHaveProperty('tool-2');
  });

  it('should skip invalid templates with warning', () => {
    const yaml = `
templates:
  valid:
    description: "Valid"
    include_regex: "ERROR"
    tail_paragraphs: 1
  invalid:
    description: "Invalid"
    include_regex: "[bad(regex"
    tail_paragraphs: 1
`;
    mockReadFileSync.mockReturnValue(yaml);
    const logger = createLogger('test');
    const warnSpy = vi.spyOn(logger, 'warn');

    const config = loadConfig('/path/to/config.yaml', logger);
    
    expect(Object.keys(config.templates)).toHaveLength(1);
    expect(config.templates).toHaveProperty('valid');
    expect(config.templates).not.toHaveProperty('invalid');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping invalid template "invalid"'),
      expect.any(String)
    );
  });

  it('should throw on invalid YAML', () => {
    mockReadFileSync.mockReturnValue('invalid: yaml: content:');

    expect(() => loadConfig('/path/to/config.yaml')).toThrow();
  });

  it('should throw if config is not an object', () => {
    mockReadFileSync.mockReturnValue('just a string');

    expect(() => loadConfig('/path/to/config.yaml')).toThrow('must contain an object');
  });

  it('should throw if config missing templates', () => {
    const yaml = `
other_field: value
`;
    mockReadFileSync.mockReturnValue(yaml);

    expect(() => loadConfig('/path/to/config.yaml')).toThrow('must have "templates"');
  });

  it('should log loading process when logger provided', () => {
    const yaml = `
templates:
  my-tool:
    description: "My tool"
    include_regex: "ERROR"
    tail_paragraphs: 1
`;
    mockReadFileSync.mockReturnValue(yaml);
    const logger = createLogger('test');
    const debugSpy = vi.spyOn(logger, 'debug');
    const infoSpy = vi.spyOn(logger, 'info');

    loadConfig('/path/to/config.yaml', logger);

    expect(debugSpy).toHaveBeenCalledWith('Loading config from:', expect.any(String));
    expect(debugSpy).toHaveBeenCalledWith('Loaded template:', 'my-tool');
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded 1 template'));
  });
});
