import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from './logger.js';

describe('createLogger', () => {
  let stderrWriteSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stderrWriteSpy = vi.fn(() => true);
    vi.stubGlobal('process', {
      ...process,
      stderr: {
        ...process.stderr,
        write: stderrWriteSpy,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should write debug messages to stderr', () => {
    const logger = createLogger('test');
    logger.debug('test message');

    expect(stderrWriteSpy).toHaveBeenCalledOnce();
    const call = stderrWriteSpy.mock.calls[0]?.[0] as string;
    expect(call).toContain('[test]');
    expect(call).toContain('[DEBUG]');
    expect(call).toContain('test message');
  });

  it('should write info messages to stderr', () => {
    const logger = createLogger('test');
    logger.info('info message');

    expect(stderrWriteSpy).toHaveBeenCalledOnce();
    const call = stderrWriteSpy.mock.calls[0]?.[0] as string;
    expect(call).toContain('[INFO]');
    expect(call).toContain('info message');
  });

  it('should write warn messages to stderr', () => {
    const logger = createLogger('test');
    logger.warn('warning message');

    expect(stderrWriteSpy).toHaveBeenCalledOnce();
    const call = stderrWriteSpy.mock.calls[0]?.[0] as string;
    expect(call).toContain('[WARN]');
    expect(call).toContain('warning message');
  });

  it('should write error messages to stderr', () => {
    const logger = createLogger('test');
    logger.error('error message');

    expect(stderrWriteSpy).toHaveBeenCalledOnce();
    const call = stderrWriteSpy.mock.calls[0]?.[0] as string;
    expect(call).toContain('[ERROR]');
    expect(call).toContain('error message');
  });

  it('should format additional arguments', () => {
    const logger = createLogger('test');
    logger.info('message with args', 42, { key: 'value' });

    expect(stderrWriteSpy).toHaveBeenCalledOnce();
    const call = stderrWriteSpy.mock.calls[0]?.[0] as string;
    expect(call).toContain('message with args');
    expect(call).toContain('42');
    expect(call).toContain('{"key":"value"}');
  });

  it('should include timestamp in log messages', () => {
    const logger = createLogger('test');
    logger.info('timestamped message');

    expect(stderrWriteSpy).toHaveBeenCalledOnce();
    const call = stderrWriteSpy.mock.calls[0]?.[0] as string;
    // Check for ISO timestamp pattern
    expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
  });

  it('should use custom prefix', () => {
    const logger = createLogger('custom-prefix');
    logger.info('message');

    expect(stderrWriteSpy).toHaveBeenCalledOnce();
    const call = stderrWriteSpy.mock.calls[0]?.[0] as string;
    expect(call).toContain('[custom-prefix]');
  });
});
