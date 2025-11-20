import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommand } from './command-executor.js';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createLogger } from '../logger.js';

vi.mock('node:child_process');

describe('executeCommand', () => {
  const mockSpawn = vi.mocked(spawn);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockChildProcess(): EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  } {
    const child = new EventEmitter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mock = child as any;
    mock.stdout = new EventEmitter();
    mock.stderr = new EventEmitter();
    return mock;
  }

  it('should execute command and return exit code', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('echo hello');

    // Simulate command completion
    mockChild.stdout.emit('data', Buffer.from('hello\n'));
    mockChild.emit('close', 0);

    const result = await promise;

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('hello');
  });

  it('should capture stdout output', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('echo test');

    mockChild.stdout.emit('data', Buffer.from('test output\n'));
    mockChild.emit('close', 0);

    const result = await promise;

    expect(result.output).toBe('test output\n');
  });

  it('should capture stderr output', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('command');

    mockChild.stderr.emit('data', Buffer.from('error output\n'));
    mockChild.emit('close', 1);

    const result = await promise;

    expect(result.output).toBe('error output\n');
  });

  it('should combine stdout and stderr', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('command');

    mockChild.stdout.emit('data', Buffer.from('stdout line\n'));
    mockChild.stderr.emit('data', Buffer.from('stderr line\n'));
    mockChild.emit('close', 0);

    const result = await promise;

    expect(result.output).toContain('stdout line');
    expect(result.output).toContain('stderr line');
  });

  it('should return non-zero exit code on failure', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('failing command');

    mockChild.stderr.emit('data', Buffer.from('command failed\n'));
    mockChild.emit('close', 127);

    const result = await promise;

    expect(result.exitCode).toBe(127);
    expect(result.output).toContain('command failed');
  });

  it('should handle null exit code as 0', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('command');

    mockChild.emit('close', null);

    const result = await promise;

    expect(result.exitCode).toBe(0);
  });

  it('should handle spawn errors', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('invalid-command');

    mockChild.emit('error', new Error('spawn ENOENT'));

    const result = await promise;

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Error executing command');
    expect(result.output).toContain('spawn ENOENT');
  });

  it('should handle multiple data chunks', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('command');

    mockChild.stdout.emit('data', Buffer.from('chunk 1\n'));
    mockChild.stdout.emit('data', Buffer.from('chunk 2\n'));
    mockChild.stdout.emit('data', Buffer.from('chunk 3\n'));
    mockChild.emit('close', 0);

    const result = await promise;

    expect(result.output).toBe('chunk 1\nchunk 2\nchunk 3\n');
  });

  it('should spawn with shell', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('echo hello');
    mockChild.emit('close', 0);
    await promise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'echo hello',
      expect.objectContaining({
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    );
  });

  it('should log execution details when logger provided', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);
    
    const logger = createLogger('test');
    const debugSpy = vi.spyOn(logger, 'debug');
    const infoSpy = vi.spyOn(logger, 'info');

    const promise = executeCommand('echo test', logger);

    mockChild.stdout.emit('data', Buffer.from('test\n'));
    mockChild.emit('close', 0);

    await promise;

    expect(debugSpy).toHaveBeenCalledWith('Executing command:', 'echo test');
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('exited with code 0'));
    // Check that debug was called with output length message
    const debugCalls = debugSpy.mock.calls;
    const outputLengthCall = debugCalls.find(call => call[0]?.includes('Output length'));
    expect(outputLengthCall).toBeDefined();
  });

  it('should handle empty output', async () => {
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    const promise = executeCommand('command');
    mockChild.emit('close', 0);

    const result = await promise;

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe('');
  });
});
