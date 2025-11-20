# Design Document: quiet-shell MCP Server

<!-- 🚀 ESSENTIAL - Focused on design decisions and patterns only -->

## 1. Naming Conventions

### Classes and Types

- **PascalCase** for classes and interfaces: `TemplateManager`, `OutputFilter`, `CommandExecutor`
- **No `I` prefix** for interfaces (TypeScript convention)
- **Descriptive type suffixes**: `Template`, `Config`, `Result`

### Methods and Functions

- **camelCase** for all functions: `loadConfig`, `executeCommand`, `filterOutput`
- **Verb-first naming**: `get`, `load`, `parse`, `filter`, `execute`
- **Boolean methods**: Prefix with `is`, `has`, `should`

### Variables and Constants

- **camelCase** for variables: `configPath`, `exitCode`, `filteredOutput`
- **UPPER_SNAKE_CASE** for constants: `DEFAULT_TAIL_PARAGRAPHS`, `CONFIG_CACHE_TTL`, `CONFIG_FILE_NAME`
- **Descriptive names**: Avoid abbreviations except common ones (`config`, `regex`)

### Packages and Modules

- **kebab-case** for package names: `@codemcp/quiet-shell-core`
- **kebab-case** for file names: `template-manager.ts`, `output-filter.ts`
- **Barrel exports**: Use `index.ts` for clean public APIs

## 2. Design Principles

### Separation of Concerns

- **Core package**: Independent of MCP protocol, reusable logic
- **MCP server package**: Only protocol handling, delegates to core
- **No circular dependencies**: Core never imports from mcp-server

### Single Responsibility

- **TemplateManager**: Only config management (load, merge, cache)
- **CommandExecutor**: Only command execution
- **OutputFilter**: Only filtering logic
- **MCP Server**: Only protocol handling

### Fail-Fast Validation

- Validate configuration at load time, not at runtime
- Throw descriptive errors for invalid configs
- Use TypeScript strict types for compile-time safety

### Minimal Dependencies

- Keep core package dependency-free (except js-yaml)
- Only MCP SDK in mcp-server package
- No unnecessary abstractions

## 3. Component Design Details

### Template Manager Design

**Caching Strategy**:

- In-memory cache with 60-second TTL
- Balance between freshness and performance
- Cache invalidation on TTL expiry only (no watch)

**Merging Logic**:

- Load built-in templates first
- Overlay custom templates from config
- Custom templates override built-ins by name
- No deep merging (full template replacement)

**Error Handling**:

- Config file not found: Use built-ins only (not an error)
- Invalid YAML: Log to stderr, fall back to built-ins
- Invalid template: Skip and log warning
- Invalid regex: Reject template at load time

### Output Filter Design

**Paragraph Parsing**:

- Split on blank lines (one or more consecutive `\n`)
- Preserve line order within paragraphs
- Empty lines are separators, not content

**Filtering Algorithm**:

```
1. Parse output → array of paragraphs (each = array of lines)
2. Extract matching lines: filter all lines by include_regex
3. Extract tail paragraphs: last N paragraphs → flatten to lines
4. Combine: matching lines + tail lines
5. Deduplicate: Use Set to remove duplicates, preserve original order
6. Join: Combine back into string with newlines
```

**Deduplication Strategy**:

- Use Set to track seen lines
- Iterate in original order (matched lines first, then tail lines)
- Preserve first occurrence of each line
- Maintain relative ordering

### Command Executor Design

**Process Spawning**:

- Use `child_process.spawn` (not `exec` - safer, streaming)
- No shell interpretation by default (security)
- Combine stdout and stderr into single output stream
- Capture all output before returning

**Exit Code Handling**:

- Always return actual exit code from process
- 0 = success, non-zero = failure
- Special codes: 127 (command not found), 130 (terminated by Ctrl+C)
- No custom exit code mapping

### MCP Server Design

**Tool Schema**:

- Single tool: `execute_command`
- `command` parameter: required, string
- `template` parameter: optional, enum with dynamic values
- Enum populated from TemplateManager at server startup

**Response Format**:

```typescript
{
  content: [
    {
      type: "text",
      text: `Exit code: ${exitCode}\n\n${filteredOutput}`
    }
  ];
}
```

**Template Not Found**:

- If specified template doesn't exist: return raw output (no error)
- Warn in response: "Template 'xyz' not found, returning raw output"
- Still return exit code

## 4. Error Handling Patterns

### Configuration Errors

- **Invalid YAML syntax**: Log error, use built-ins only
- **Missing required fields**: Skip invalid template
- **Invalid regex**: Test at load time, reject template if invalid
- **Never crash**: Always fall back to built-in templates

### Execution Errors

- **Spawn error**: Return as error response to MCP client
- **Command not found**: Return exit code 127 + error message
- **Command timeout**: Out of scope for v1
- **Permission denied**: Return actual exit code + error output

### Filtering Errors

- **Template not found**: Treat as no filtering (raw output)
- **Empty output**: Return empty string (valid)
- **Regex match error**: Should never happen (validated at load)
- **No matches**: Return tail paragraphs only

### MCP Protocol Errors

- **Missing required params**: Return MCP error response
- **Invalid JSON**: Let MCP SDK handle
- **Protocol version mismatch**: Let MCP SDK handle

## 5. Testing Approach

### Unit Test Focus

- **Template Manager**: Mock filesystem for config discovery
- **Output Filter**: Test with crafted strings (known inputs/outputs)
- **Command Executor**: Mock `child_process.spawn`
- **Each test**: Single responsibility, clear assertion

### Test Data Strategy

- **Fixtures**: Sample command outputs in test/fixtures/
- **Builders**: Test helper functions to create templates, configs
- **Mocks**: Minimal mocking, prefer real implementations where possible

### Integration Test Focus

- **MCP Protocol**: Full request/response cycle
- **Real commands**: Use simple commands like `echo`, `ls`
- **Config loading**: Test with actual YAML files in temp directories
- **End-to-end**: Full flow from MCP request to filtered output

## 6. Quality Patterns

### Type Safety

- Enable TypeScript strict mode
- No `any` types except for external library types
- Explicit return types on public APIs
- Use union types for known states (not enums)

### Code Organization

- One class/function per file (small modules)
- Group related files in directories (`config/`, `filter/`, `executor/`)
- Public API via `index.ts` barrel exports
- Private implementation files prefixed with `_` (optional)

### Documentation

- JSDoc on all exported functions/classes
- Include `@param`, `@returns`, `@throws` where relevant
- Examples in JSDoc for complex functions
- README with usage examples

### Logging Strategy

- **CRITICAL**: Never use `console.log()` or `console.error()` - breaks MCP protocol
- **MCP Protocol**: Uses stdout for communication, any console output corrupts the protocol
- **Solution**: Inject custom logger into all components
- **Logger Interface**:
  ```typescript
  interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
  }
  ```
- **Implementation**: Logger writes to stderr using `process.stderr.write()`
- **Dependency Injection**: Pass logger to all components that need logging
- **No Global Logger**: Avoid global state, inject explicitly

### Error Messages

- Include context: what failed, why, how to fix
- Use template literals for readable messages
- Log via injected logger (writes to stderr)
- No stack traces in production (unless debug mode)
