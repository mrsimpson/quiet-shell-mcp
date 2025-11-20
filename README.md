# quiet-shell

MCP server that executes shell commands with intelligent output filtering to reduce AI agent context consumption.

## Problem

When AI coding assistants execute shell commands (especially tests and builds), they receive thousands of lines of verbose output that:

- Consume valuable context window tokens
- Bury important information (errors, failures) in noise
- Make it difficult to focus on actionable feedback

**Example**: Running tests with 50 passing and 2 failing tests generates 2000+ lines of output, but agents only need the ~20 lines showing failures and summary.

## Solution

quiet-shell executes commands and intelligently filters output using configurable templates:

- **Regex filtering**: Keep only lines matching error patterns
- **Tail paragraphs**: Always include summary sections
- **Result interpretation**: Quick success/failure status
- **Built-in templates**: Pre-configured for common tools (tsc, vitest, maven)
- **Custom templates**: Define your own filters per repository

## Installation

```bash
npm install -g @codemcp/quiet-shell-mcp
```

Or with pnpm:

```bash
pnpm add -g @codemcp/quiet-shell-mcp
```

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "quiet-shell": {
      "command": "quiet-shell-mcp"
    }
  }
}
```

### Other MCP Clients

Use the command: `quiet-shell-mcp`

The server communicates via stdio following the Model Context Protocol specification.

## Usage

### Tools Available

#### `execute_command`

Execute shell command with optional output filtering.

**Parameters:**

- `command` (required): Shell command to execute
- `template` (optional): Filter template name (use `list_templates` to see available)
- `suppress_output_on_success` (optional, default: `true`): Suppress output when command succeeds (exit code 0). Set to `false` to always show output even on success

**Response:**

```json
{
  "result": "success",
  "exit_code": 0,
  "output": "filtered output here",
  "template_used": "vitest"
}
```

**Examples:**

```typescript
// Run tests with filtering
execute_command("npm test", "vitest");
// Returns: only failed tests + summary (~20 lines instead of 2000+)
// If tests pass: output suppressed (default behavior)

// TypeScript compilation
execute_command("tsc --noEmit", "tsc");
// Returns: only type errors + summary
// If compilation succeeds: output suppressed (default behavior)

// Always show output even on success
execute_command("npm test", null, false); // suppress_output_on_success = false
// Returns: complete output regardless of exit code

// Raw output with default suppression
execute_command("echo hello");
// If successful: "Command completed successfully (output suppressed - exit code 0)"
```

#### `list_templates`

List all available filtering templates with descriptions.

**Response:**

```json
{
  "templates": [
    {
      "name": "vitest",
      "description": "Use when running tests with Vitest - returns failed tests and test summary",
      "include_regex": "(FAIL|ERROR|✖|❯.*failed)",
      "tail_paragraphs": 2
    },
    ...
  ],
  "count": 4
}
```

## Built-in Templates

- **tsc**: TypeScript compiler - returns type errors and summary
- **vitest**: Vitest tests - returns test failures and summary
- **maven-build**: Maven build - returns build errors and summary
- **maven-test**: Maven tests - returns test failures and summary

## Custom Templates

Create `.quiet-shell/config.yaml` in your repository:

```yaml
templates:
  jest:
    description: "Use when running tests with Jest - returns failed tests and test summary"
    include_regex: "(FAIL|●|✕)"
    tail_paragraphs: 2

  eslint:
    description: "Use when running ESLint - returns linting errors and summary"
    include_regex: "(error|warning|✖)"
    tail_paragraphs: 1

  # Template that always shows success output
  build-with-stats:
    description: "Build command that shows statistics even on success"
    include_regex: "(error|warning|built|compiled)"
    tail_paragraphs: 2
    suppress_output_on_success: false # Override default suppression
```

**Features:**

- Custom templates extend built-in templates
- Custom templates can override built-in templates (same name)
- Configuration is version-controlled and shared with team
- Server discovers config by searching upward from current directory

## How It Works

### Template Structure

Each template defines:

- `include_regex`: Pattern to match important lines (errors, failures)
- `tail_paragraphs`: Number of paragraphs to include from end (summaries)
- `description`: When to use this template (for agent discovery)

### Filtering Algorithm

1. **Parse** output into paragraphs (groups of lines separated by blank lines)
2. **Filter** lines matching `include_regex`
3. **Extract** last N paragraphs (summaries)
4. **Combine** and deduplicate (preserve order)
5. **Return** filtered output

### Example

**Input** (2000 lines):

```
✓ test 1 passed
✓ test 2 passed
... (48 more passing tests)
✖ test 51 failed
  Expected: true
  Received: false
✖ test 52 failed
  Error: timeout

Tests: 50 passed, 2 failed, 52 total
Time: 5.2s
```

**Output with `vitest` template** (~10 lines):

```
✖ test 51 failed
  Expected: true
  Received: false
✖ test 52 failed
  Error: timeout
Tests: 50 passed, 2 failed, 52 total
Time: 5.2s
```

## Development

### Monorepo Structure

```
packages/
  core/          # @codemcp/quiet-shell-core
                 # Reusable filtering logic

  mcp-server/    # @codemcp/quiet-shell-mcp
                 # MCP protocol implementation
```

### Build

```bash
pnpm install
pnpm build
```

### Test

```bash
pnpm test
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector quiet-shell-mcp
```

## Architecture

- **Logger**: Dependency-injected logger (stderr only, never stdout)
- **Template Manager**: Config loading with 60s cache TTL
- **Command Executor**: Spawns commands, captures stdout/stderr
- **Output Filter**: Paragraph-based regex filtering
- **MCP Server**: stdio transport, structured JSON responses

## Requirements

- Node.js >= 18
- pnpm >= 9 (for development)

## License

MIT

## Contributing

Contributions welcome! This project uses:

- TypeScript with strict mode
- Vitest for testing
- ESLint + Prettier for code quality
- Turbo for monorepo builds

## Credits

Built with the [Model Context Protocol](https://modelcontextprotocol.io/) SDK.
