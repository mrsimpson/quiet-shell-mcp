/**
 * Logger implementation that writes to stderr
 * CRITICAL: Never use console.log/error - breaks MCP protocol
 */

import type { Logger } from "./types.js";

/**
 * Create a logger that writes to stderr
 * MCP protocol uses stdout, so we must use stderr for all logging
 */
export function createLogger(prefix = "quiet-shell"): Logger {
  const timestamp = () => new Date().toISOString();

  const write = (level: string, message: string, args: unknown[]) => {
    const formattedArgs =
      args.length > 0
        ? " " +
          args
            .map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            )
            .join(" ")
        : "";

    const logMessage = `[${timestamp()}] [${prefix}] [${level}] ${message}${formattedArgs}\n`;
    process.stderr.write(logMessage);
  };

  return {
    debug: (message: string, ...args: unknown[]) =>
      write("DEBUG", message, args),
    info: (message: string, ...args: unknown[]) => write("INFO", message, args),
    warn: (message: string, ...args: unknown[]) => write("WARN", message, args),
    error: (message: string, ...args: unknown[]) =>
      write("ERROR", message, args)
  };
}
