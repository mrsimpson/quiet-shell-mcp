# Architecture Document: quiet-shell MCP Server

## System Overview

**Purpose**: MCP server that executes shell commands and filters verbose output using configurable templates.

**Core Value**: Reduce AI agent token consumption by filtering command output to show only meaningful information (errors, summaries).

## Technology Stack

### Runtime & Language

- **Node.js >= 18**: Runtime environment
- **TypeScript 5.x**: Type-safe development with strict checking
- **ESM modules**: Modern module system

### Core Dependencies

- **@modelcontextprotocol/sdk**: MCP protocol implementation (stdio transport)
- **js-yaml**: YAML configuration parsing
- **child_process**: Command execution (Node.js built-in)

### Development Tools

- **pnpm**: Package manager with workspace support
- **turbo**: Monorepo build orchestration
- **vitest**: Testing framework
- **eslint + prettier**: Code quality
- **TypeScript compiler**: Type checking and builds

**Rationale**: Matches existing monorepo setup, minimal external dependencies, standard MCP stack.

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent (Claude, GPT)               │
└────────────────┬────────────────────────────────────────┘
                 │ MCP Protocol (stdio)
                 │
┌────────────────▼────────────────────────────────────────┐
│              MCP Server Package                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MCP Tool: execute_command                       │   │
│  │  - Input: command, template (optional)           │   │
│  │  - Output: exit_code, filtered_output            │   │
│  └────┬─────────────────────────────────────────────┘   │
│       │                                                 │
│       │ Uses                                            │
│       ▼                                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Core Package                           │   │
│  │  ┌───────────────┐  ┌─────────────────────────┐  │   │
│  │  │ Template      │  │  Command Executor       │  │   │
│  │  │ Manager       │  │  - Execute shell        │  │   │
│  │  │ - Load config │  │  - Capture output       │  │   │
│  │  │ - Merge       │  │  - Return exit code     │  │   │
│  │  │ - Cache       │  └─────────────────────────┘  │   │
│  │  └───────────────┘                               │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐    │   │
│  │  │       Output Filter                      │    │   │
│  │  │  - Parse paragraphs                      │    │   │
│  │  │  - Apply regex                           │    │   │
│  │  │  - Extract tail                          │    │   │
│  │  └──────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                 │
                 │ Reads config from
                 ▼
    .quiet-shell/config.yaml (repository-level)
```

### Component Responsibilities

#### MCP Server Package

- Implements MCP protocol using stdio transport
- Exposes `execute_command` tool
- Lists available templates in tool schema
- Handles errors and returns structured responses
- Orchestrates Core Package components

#### Core Package

**Template Manager**:

- **Discovery**: Search for configuration file from current directory upward
- **Loading**: Parse YAML, validate schema
- **Merging**: Preconfigured templates + custom templates (custom overrides)
- **Caching**: In-memory cache with TTL to reduce file I/O

**Command Executor**:

- Execute shell commands using Node.js child_process
- Capture stdout and stderr streams
- Return exit code and combined output
- No timeout, no interaction, no streaming (v1 scope)

**Output Filter**:

- **Parse**: Split output into paragraphs (groups of non-empty lines)
- **Filter**: Apply regex to keep matching lines
- **Tail**: Extract last N paragraphs from output
- **Combine**: Merge filtered lines + tail paragraphs, deduplicate

## Monorepo Structure

```
packages/
  core/                          # @codemcp/quiet-shell-core
    - Shared business logic
    - Template management
    - Command execution
    - Output filtering
    - No MCP dependencies

  mcp-server/                    # @codemcp/quiet-shell-mcp
    - MCP protocol implementation
    - Depends on core package
    - Server entry point

  cli/                           # @codemcp/quiet-shell-cli (future)
    - Template management CLI
    - Out of scope for v1
```

**Rationale**:

- **Separation**: Core logic independent of MCP protocol
- **Reusability**: Core package can be used standalone
- **Testing**: Components can be tested independently
- **Extensibility**: Future CLI can reuse core package

## Data Models

### Template Interface

```typescript
interface Template {
  description: string; // Human-readable purpose
  include_regex: string; // Regex pattern for line matching
  tail_paragraphs: number; // Number of ending paragraphs to include
}

interface TemplateConfig {
  templates: Record<string, Template>;
}
```

### Configuration Format (YAML)

```yaml
templates:
  custom-tool:
    description: "Description of what this filters"
    include_regex: "(ERROR|WARN|FAIL)"
    tail_paragraphs: 2
```

### MCP Tool Interface

```typescript
{
  name: "execute_command",
  description: "Execute shell command with optional output filtering",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Shell command to execute"
      },
      template: {
        type: "string",
        enum: ["tsc", "vitest", "maven-build", "maven-test", "..."],
        description: "Optional template name for output filtering"
      }
    },
    required: ["command"]
  }
}
```

## Key Algorithms

### Output Filtering

```
Input: raw_output (string), template (Template)
Output: filtered_output (string)

1. Parse raw_output into paragraphs (split by blank lines)
2. Apply regex filter: collect lines matching template.include_regex
3. Extract tail: last N paragraphs from parsed output
4. Combine and deduplicate: merge filtered + tail, preserve order
5. Return filtered string
```

### Configuration Discovery

```
Input: current_working_directory
Output: config_path | null

1. Start at current_working_directory
2. Check for .quiet-shell/config.yaml
3. If found: return path
4. If not found: move to parent directory
5. Repeat until filesystem root
6. Return null if not found
```

## Configuration Strategy

### Preconfigured Templates

- **Location**: Embedded in Core Package code
- **Purpose**: Support common tools out-of-the-box (tsc, vitest, maven-build, maven-test)
- **No configuration required**: Available immediately after installation

### Custom Templates

- **Location**: `.quiet-shell/config.yaml` in project root
- **Loaded at runtime**: Discovered via upward directory search
- **Merged with preconfigured**: Custom templates override preconfigured by name
- **Version controlled**: Shared across team via git
- **Cached**: 60-second TTL reduces repeated file reads

### Template Precedence

1. Custom templates from `.quiet-shell/config.yaml` (highest priority)
2. Preconfigured templates from code
3. No template specified: Raw output (no filtering)

## Non-Functional Architecture Decisions

### Performance

- **Configuration caching**: 60s TTL reduces file I/O
- **Streaming output capture**: No full buffer requirement
- **Regex compilation**: Compile once per template at load
- **Target overhead**: < 50ms for filtering operation

### Error Handling Philosophy

- **Fail gracefully**: Invalid config → use preconfigured templates only
- **Command failures**: Return exit code + output (filtered or raw)
- **Missing template**: Treat as "no filtering"
- **Log to stderr**: MCP protocol uses stdout, errors to stderr

### Security Considerations

- **No command sandboxing**: Execute with Node.js process privileges (v1)
- **No input sanitization**: Trust caller (AI agent is trusted party)
- **No secrets filtering**: Assume commands don't output secrets (v1)
- **Future consideration**: Sandboxing, privilege reduction

### Extensibility Points

- **New templates**: Add to config file, auto-discovered
- **New filtering strategies**: Extend Template interface (v2)
- **CLI tools**: Future package for template management
- **Additional MCP tools**: Easy to add in mcp-server package

## Deployment Model

### Installation

```bash
# Global installation
npm install -g @codemcp/quiet-shell-mcp

# MCP client configuration (e.g., Claude Desktop)
{
  "mcpServers": {
    "quiet-shell": {
      "command": "quiet-shell-mcp"
    }
  }
}
```

### Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm dev              # Watch mode for development
pnpm test             # Run tests
```

## Architectural Constraints

### In Scope (v1)

- Execute arbitrary shell commands
- Filter output based on templates
- Preconfigured templates for common tools
- Custom templates from repository config
- MCP stdio transport
- Exit code always returned

### Explicitly Out of Scope (v1)

- Interactive commands (prompts, TTY input)
- Output streaming (real-time output)
- Command timeout handling
- Working directory specification
- Environment variable customization
- Command history or caching
- Template testing/validation tools
- CLI for template management (future v2)

## Future Architecture Considerations

### Potential Enhancements (v2+)

- Context lines around matches (like grep -A/-B/-C)
- Severity-based filtering (error, warn, info levels)
- Multiple regex patterns per template
- Output streaming for long-running commands
- Template marketplace or sharing mechanism
- Plugin architecture for custom filters
