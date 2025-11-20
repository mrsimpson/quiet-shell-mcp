/**
 * MCP Server implementation for quiet-shell
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  createLogger,
  TemplateManager,
  executeCommand,
  filterOutput,
} from '@codemcp/quiet-shell-core';

/**
 * Create quiet-shell MCP server
 */
export function createQuietShellServer(): Server {
  const logger = createLogger('quiet-shell-mcp');
  const templateManager = new TemplateManager(logger);

  const server = new Server(
    {
      name: 'quiet-shell',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const templates = templateManager.getAvailableTemplates();
    const templateNames = Object.keys(templates);

    const tools: Tool[] = [
      {
        name: 'execute_command',
        description:
          'Execute shell command with optional intelligent output filtering to reduce context consumption. Returns result status (success/failure), exit code, and filtered output. Filtering removes verbose successful operations while preserving errors, failures, and summaries.',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description:
                "Shell command to execute (e.g., 'npm test', 'tsc --noEmit', 'mvn clean install')",
            },
            template: {
              type: 'string',
              enum: templateNames,
              description:
                'Optional: Filter template to apply. Each template uses regex patterns to keep only relevant output (errors, failures) and summary paragraphs. Use list_templates tool to see detailed descriptions of available templates. Omit this parameter to receive raw unfiltered output.',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'list_templates',
        description:
          'List all available output filtering templates with detailed descriptions. Templates define how command output is filtered to show only relevant information.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];

    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'execute_command': {
          const { command, template } = args as {
            command: string;
            template?: string;
          };

          if (!command || typeof command !== 'string') {
            throw new Error('command parameter is required and must be a string');
          }

          logger.info('Executing command:', command);
          if (template) {
            logger.info('Using template:', template);
          }

          // Execute command
          const result = await executeCommand(command, logger);

          // Apply filtering if template specified
          let filteredOutput = result.output;
          let templateUsed: string | null = null;

          if (template && typeof template === 'string') {
            const templateObj = templateManager.getTemplate(template);

            if (!templateObj) {
              const availableTemplates = Object.keys(
                templateManager.getAvailableTemplates()
              ).join(', ');
              throw new Error(
                `Template "${template}" not found. Use list_templates tool to see available templates. Available: ${availableTemplates}`
              );
            }

            filteredOutput = filterOutput(result.output, templateObj);
            templateUsed = template;
            logger.info(`Filtered output: ${result.output.length} → ${filteredOutput.length} characters`);
          }

          // Return structured response
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    result: result.exitCode === 0 ? 'success' : 'failure',
                    exit_code: result.exitCode,
                    output: filteredOutput,
                    template_used: templateUsed,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'list_templates': {
          const templates = templateManager.getAvailableTemplates();
          const templateList = Object.entries(templates).map(([name, template]) => ({
            name,
            description: template.description,
            include_regex: template.include_regex,
            tail_paragraphs: template.tail_paragraphs,
          }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    templates: templateList,
                    count: templateList.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Tool execution error:', message);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: message,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
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
  process.stderr.write('[quiet-shell] MCP Server started\n');
}
