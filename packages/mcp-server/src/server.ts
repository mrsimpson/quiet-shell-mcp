/**
 * MCP Server implementation for quiet-shell
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import {
  createLogger,
  TemplateManager,
  executeCommand,
  filterOutput
} from "@codemcp/quiet-shell-core";
import { stat, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Generate filesystem-safe timestamped filename
 */
function generateTimestampedFilename(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
  return `command-output-${timestamp}.txt`;
}

/**
 * Resolve output file path - handle directory vs file path
 */
async function resolveOutputPath(outputPath: string): Promise<string> {
  try {
    const stats = await stat(outputPath);
    if (stats.isDirectory()) {
      return join(outputPath, generateTimestampedFilename());
    }
    // It's a file, use as-is
    return outputPath;
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "ENOENT") {
      // Path doesn't exist - treat as directory, create it
      await mkdir(outputPath, { recursive: true });
      return join(outputPath, generateTimestampedFilename());
    }
    throw err;
  }
}

/**
 * Create quiet-shell MCP server
 */
export function createQuietShellServer(): Server {
  const logger = createLogger("quiet-shell-mcp");
  const templateManager = new TemplateManager(logger);

  const server = new Server(
    {
      name: "quiet-shell",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const templates = templateManager.getAvailableTemplates();
    const templateNames = Object.keys(templates);

    const tools: Tool[] = [
      {
        name: "execute_command",
        description:
          "Execute shell command with optional intelligent output filtering to reduce context consumption. Returns result status (success/failure), exit code, and filtered output. Filtering removes verbose successful operations while preserving errors, failures, and summaries.",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description:
                "Shell command to execute (e.g., 'npm test', 'tsc --noEmit', 'mvn clean install')"
            },
            template: {
              type: "string",
              enum: templateNames,
              description:
                "Optional: Filter template to apply. Each template uses regex patterns to keep only relevant output (errors, failures) and summary paragraphs. Use list_templates tool to see detailed descriptions of available templates. Omit this parameter to receive raw unfiltered output."
            },
            suppress_output_on_success: {
              type: "boolean",
              description:
                "Optional: Suppress output when command succeeds (exit code 0). Set to false to always show output even on success.",
              default: true
            },
            output_file: {
              type: "string",
              description: `Optional: Path to save the complete unfiltered command output. Can be a directory path (e.g., '/tmp' or 'C:\\TEMP') where a timestamped file will be created, or a specific file path. Parent directories will be created if needed. Useful for reviewing full output later when debugging failures.`
            }
          },
          required: ["command"]
        }
      },
      {
        name: "list_templates",
        description:
          "List all available output filtering templates with detailed descriptions. Templates define how command output is filtered to show only relevant information.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ];

    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "execute_command": {
          const { command, template, suppress_output_on_success, output_file } =
            args as {
              command: string;
              template?: string;
              suppress_output_on_success?: boolean;
              output_file?: string;
            };

          if (!command || typeof command !== "string") {
            throw new Error(
              "command parameter is required and must be a string"
            );
          }

          // Default suppress_output_on_success to true
          const suppressOutputOnSuccess =
            suppress_output_on_success !== undefined
              ? suppress_output_on_success
              : true;

          logger.info("Executing command:", command);
          if (template) {
            logger.info("Using template:", template);
          }
          logger.debug("suppress_output_on_success:", suppressOutputOnSuccess);

          // Execute command
          const result = await executeCommand(command, logger);

          // Determine output to return
          let filteredOutput = result.output;
          let templateUsed: string | null = null;

          // Determine if suppression should apply
          let shouldSuppress = suppressOutputOnSuccess && result.exitCode === 0;

          if (template && typeof template === "string") {
            // Apply template filtering
            const templateObj = templateManager.getTemplate(template);

            if (!templateObj) {
              const availableTemplates = Object.keys(
                templateManager.getAvailableTemplates()
              ).join(", ");
              throw new Error(
                `Template "${template}" not found. Use list_templates tool to see available templates. Available: ${availableTemplates}`
              );
            }

            filteredOutput = filterOutput(result.output, templateObj);
            templateUsed = template;
            logger.info(
              `Filtered output: ${result.output.length} → ${filteredOutput.length} characters`
            );

            // Check if template overrides suppression behavior
            if (templateObj.suppress_output_on_success !== undefined) {
              shouldSuppress =
                templateObj.suppress_output_on_success && result.exitCode === 0;
              logger.debug(
                `Template overrides suppress_output_on_success: ${templateObj.suppress_output_on_success}`
              );
            }
          }

          // Apply suppression if enabled and command succeeded
          if (shouldSuppress) {
            filteredOutput =
              "Command completed successfully (output suppressed - exit code 0)";
            logger.info(
              `Output suppressed for successful command: ${result.output.length} characters`
            );
          }

          // Handle output file writing
          let savedOutputFile: string | null = null;
          let outputFileError: string | null = null;

          if (output_file) {
            try {
              const resolvedPath = await resolveOutputPath(output_file);
              await writeFile(resolvedPath, result.output, "utf-8");
              savedOutputFile = resolvedPath;
              logger.info(`Output written to file: ${resolvedPath}`);
            } catch (err: unknown) {
              const error = err as Error;
              outputFileError = error.message;
              logger.warn(`Failed to write output file: ${error.message}`);
            }
          }

          // Return structured response
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    result: result.exitCode === 0 ? "success" : "failure",
                    exit_code: result.exitCode,
                    output: filteredOutput,
                    template_used: templateUsed,
                    output_file: savedOutputFile,
                    output_file_error: outputFileError
                  },
                  null,
                  2
                )
              }
            ]
          };
        }

        case "list_templates": {
          const templates = templateManager.getAvailableTemplates();
          const templateList = Object.entries(templates).map(
            ([name, template]) => ({
              name,
              description: template.description,
              include_regex: template.include_regex,
              tail_paragraphs: template.tail_paragraphs,
              suppress_output_on_success: template.suppress_output_on_success
            })
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    templates: templateList,
                    count: templateList.length
                  },
                  null,
                  2
                )
              }
            ]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Tool execution error:", message);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: message
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  const server = createQuietShellServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log startup to stderr (not stdout - would break MCP protocol)
  process.stderr.write("[quiet-shell] MCP Server started\n");
}
