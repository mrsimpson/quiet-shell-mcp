/**
 * Command execution with output capture
 */

import { spawn } from "node:child_process";
import type { ExecutionResult, Logger } from "../types.js";

/**
 * Execute shell command and capture output
 * @param command - Shell command to execute
 * @param logger - Logger instance
 * @returns Execution result with exit code and combined output
 */
export async function executeCommand(
  command: string,
  logger?: Logger
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    logger?.debug("Executing command:", command);

    const outputChunks: string[] = [];

    // Spawn command using shell
    const child = spawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"] // stdin ignored, stdout/stderr piped
    });

    // Capture stdout
    child.stdout?.on("data", (data: Buffer) => {
      outputChunks.push(data.toString());
    });

    // Capture stderr
    child.stderr?.on("data", (data: Buffer) => {
      outputChunks.push(data.toString());
    });

    // Handle completion
    child.on("close", (code) => {
      const exitCode = code ?? 0;
      const output = outputChunks.join("");

      logger?.info(`Command exited with code ${exitCode}`);
      logger?.debug(`Output length: ${output.length} characters`);

      resolve({
        exitCode,
        output
      });
    });

    // Handle spawn errors
    child.on("error", (error) => {
      logger?.error("Command spawn error:", error.message);

      resolve({
        exitCode: 1,
        output: `Error executing command: ${error.message}`
      });
    });
  });
}
