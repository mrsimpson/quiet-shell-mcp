import { describe, it, expect } from 'vitest';
import { filterOutput } from './output-filter.js';
import type { Template } from '../types.js';

describe('filterOutput', () => {
  it('should return empty string for empty input', () => {
    const template: Template = {
      description: 'test',
      include_regex: 'ERROR',
      tail_paragraphs: 1,
    };

    expect(filterOutput('', template)).toBe('');
  });

  it('should return empty string for whitespace-only input', () => {
    const template: Template = {
      description: 'test',
      include_regex: 'ERROR',
      tail_paragraphs: 1,
    };

    expect(filterOutput('   \n  \n  ', template)).toBe('');
  });

  it('should filter lines matching regex', () => {
    const output = 'INFO: Starting\nERROR: Failed\nINFO: Continuing\nERROR: Another failure';
    const template: Template = {
      description: 'test',
      include_regex: 'ERROR',
      tail_paragraphs: 0,
    };

    const result = filterOutput(output, template);
    expect(result).toBe('ERROR: Failed\nERROR: Another failure');
  });

  it('should include last N paragraphs', () => {
    const output = 'paragraph 1\n\nparagraph 2\n\nparagraph 3\n\nparagraph 4';
    const template: Template = {
      description: 'test',
      include_regex: 'NOMATCH',
      tail_paragraphs: 2,
    };

    const result = filterOutput(output, template);
    expect(result).toBe('paragraph 3\nparagraph 4');
  });

  it('should combine regex matches and tail paragraphs', () => {
    const output = 'ERROR: Line 1\nINFO: Line 2\n\nINFO: Line 3\n\nSummary: Done';
    const template: Template = {
      description: 'test',
      include_regex: 'ERROR',
      tail_paragraphs: 1,
    };

    const result = filterOutput(output, template);
    expect(result).toBe('ERROR: Line 1\nSummary: Done');
  });

  it('should deduplicate lines from regex and tail', () => {
    const output = 'ERROR: Failed\nINFO: Continue\n\nERROR: Failed';
    const template: Template = {
      description: 'test',
      include_regex: 'ERROR',
      tail_paragraphs: 1,
    };

    const result = filterOutput(output, template);
    // Should only include "ERROR: Failed" once
    expect(result).toBe('ERROR: Failed');
  });

  it('should handle regex with multiple patterns', () => {
    const output = 'ERROR: e1\nWARN: w1\nINFO: i1\nFAIL: f1';
    const template: Template = {
      description: 'test',
      include_regex: '(ERROR|WARN|FAIL)',
      tail_paragraphs: 0,
    };

    const result = filterOutput(output, template);
    expect(result).toBe('ERROR: e1\nWARN: w1\nFAIL: f1');
  });

  it('should handle invalid regex gracefully', () => {
    const output = 'some output';
    const template: Template = {
      description: 'test',
      include_regex: '[invalid(regex',
      tail_paragraphs: 0,
    };

    // Should return raw output when regex is invalid
    const result = filterOutput(output, template);
    expect(result).toBe('some output');
  });

  it('should handle tail_paragraphs exceeding available paragraphs', () => {
    const output = 'para 1\n\npara 2';
    const template: Template = {
      description: 'test',
      include_regex: 'NOMATCH',
      tail_paragraphs: 10,
    };

    const result = filterOutput(output, template);
    expect(result).toBe('para 1\npara 2');
  });

  it('should handle zero tail_paragraphs', () => {
    const output = 'ERROR: e1\nINFO: i1\n\nSummary';
    const template: Template = {
      description: 'test',
      include_regex: 'ERROR',
      tail_paragraphs: 0,
    };

    const result = filterOutput(output, template);
    expect(result).toBe('ERROR: e1');
  });

  it('should filter realistic test output', () => {
    const output = `Test Suite
Running tests...

PASS test-1.ts
  ✓ test one
  ✓ test two

FAIL test-2.ts
  ✖ test three
    Expected: true
    Received: false

FAIL test-3.ts
  ✖ test four

Tests: 2 passed, 2 failed, 4 total
Time: 1.5s`;

    const template: Template = {
      description: 'Test failures',
      include_regex: '(FAIL|✖)',
      tail_paragraphs: 1,
    };

    const result = filterOutput(output, template);
    
    // Should include all FAIL/✖ lines plus summary paragraph
    expect(result).toContain('FAIL test-2.ts');
    expect(result).toContain('  ✖ test three');
    expect(result).toContain('FAIL test-3.ts');
    expect(result).toContain('  ✖ test four');
    expect(result).toContain('Tests: 2 passed, 2 failed, 4 total');
    expect(result).toContain('Time: 1.5s');
    
    // Should NOT include passing tests
    expect(result).not.toContain('PASS test-1.ts');
    expect(result).not.toContain('✓ test one');
  });

  it('should preserve line order', () => {
    const output = 'ERROR: Third\nINFO: Info\nERROR: First\nERROR: Second';
    const template: Template = {
      description: 'test',
      include_regex: 'ERROR',
      tail_paragraphs: 0,
    };

    const result = filterOutput(output, template);
    const lines = result.split('\n');
    
    expect(lines[0]).toBe('ERROR: Third');
    expect(lines[1]).toBe('ERROR: First');
    expect(lines[2]).toBe('ERROR: Second');
  });
});
