# Requirements Document: quiet-shell MCP Server

## Overview

The quiet-shell MCP server addresses the problem of verbose shell command output polluting AI agent context windows. When coding assistants (like Claude, GPT, etc.) execute shell commands—especially tests and builds—they receive thousands of lines of output that consume tokens and make it difficult to focus on meaningful information like errors and summaries.

## Problem Statement

**Current Pain Points:**

- AI agents issuing shell commands receive excessive verbose output
- Commands with many successful operations generate massive logs that fill context windows
- Meaningful information (errors, failures, summaries) gets buried in noise
- Token consumption is unnecessarily high due to verbose output

**Target Scenarios:**

- Test frameworks with verbose output
- Compilers and build tools with detailed logs
- Any command where successful operations generate noise but errors need visibility

## User Personas

### Primary User: AI Coding Assistants

- **Who**: Claude, GPT, and other AI agents assisting with software development
- **Needs**: Execute shell commands and receive only actionable output
- **Goals**:
  - See command exit codes (success/failure)
  - See errors and failures with sufficient context
  - See summary information
  - Avoid consuming tokens on passing test output

### Secondary User: Developers

- **Who**: Developers configuring the quiet-shell server for their projects
- **Needs**: Define custom filtering patterns for their specific tools and workflows
- **Goals**:
  - Configure patterns once per repository
  - Share patterns with team via version control
  - Extend built-in patterns for custom tools

## Functional Requirements

### FR-1: Command Execution

**Priority:** HIGH  
**Description:** The server MUST execute arbitrary shell commands and return exit codes.

**Acceptance Criteria:**

- Execute any shell command provided by the caller
- Return the command's exit code (0 for success, non-zero for failure)
- Support standard shell syntax and features

### FR-2: Output Filtering

**Priority:** HIGH  
**Description:** The server MUST filter command output based on configurable patterns.

**Acceptance Criteria:**

- Apply filtering patterns to command stdout/stderr
- Return filtered output that includes meaningful information
- Preserve the complete output structure (errors with context)

### FR-3: Template Selection

**Priority:** HIGH  
**Description:** Callers MUST be able to explicitly select which filtering template to apply.

**Terminology:**

- **Template**: A reusable filtering configuration consisting of regex pattern + tail_paragraphs settings

**Acceptance Criteria:**

- Expose available templates as MCP tool parameter metadata
- Allow callers to specify template name when invoking command execution
- Support "no filtering" option (raw output)
- Default to raw output if no template specified

### FR-4: Preconfigured Templates

**Priority:** HIGH  
**Description:** The server MUST ship with preconfigured filtering templates for common tools.

**Preconfigured Templates:**

- **tsc**: TypeScript compiler output filtering
- **vitest**: Vitest test framework output filtering
- **maven-build**: Maven build output filtering
- **maven-test**: Maven test execution output filtering

**Template Capabilities:**

- Include lines matching specific regex patterns (e.g., lines containing "failed" or "error")
- Return last N paragraphs (default: 1 paragraph = lines grouped by blank lines)
- Configurable per template

### FR-5: Template Configuration Format

**Priority:** HIGH  
**Description:** Each template MUST define:

**Template Structure:**

```yaml
template_name:
  description: "Human-readable description"
  include_regex: "regex pattern for lines to include"
  tail_paragraphs: N # Number of paragraphs to include from end (default: 1)
```

**Example Template:**

```yaml
test-framework:
  description: "Generic test framework output - shows errors and summary"
  include_regex: "(FAIL|ERROR|✖|failed)"
  tail_paragraphs: 2 # Last 2 paragraphs usually contain summary
```

**Example - Vitest Pattern:**

```yaml
vitest:
  description: "Vitest test output - shows errors and summary"
  include_regex: "(FAIL|ERROR|✖|failed)"
  tail_paragraphs: 2 # Last 2 paragraphs usually contain summary
```

### FR-6: Custom Template Configuration

**Priority:** MEDIUM  
**Description:** Projects MUST be able to define custom templates in repository configuration.

**Acceptance Criteria:**

- Support repository-level configuration file (location: `.quiet-shell/config.yaml`)
- Custom templates extend (not replace) preconfigured templates
- Custom templates can override preconfigured templates by using same name
- Configuration checked into version control and shared across team

**Configuration Format:**

```yaml
templates:
  my-custom-tool:
    description: "Custom tool output filtering"
    include_regex: "(ERROR|WARN)"
    tail_paragraphs: 1
```

### FR-7: Template Discovery

**Priority:** HIGH  
**Description:** The MCP server MUST expose available templates to callers.

**Acceptance Criteria:**

- List all available templates (preconfigured + custom) in tool schema
- Include template names and descriptions in MCP tool metadata
- Allow callers to discover templates before execution

### FR-8: Configuration Discovery

**Priority:** MEDIUM  
**Description:** The server MUST discover configuration files in the project tree.

**Acceptance Criteria:**

- Search for `.quiet-shell/config.yaml` starting from current directory upward
- Load and validate configuration at startup
- Cache configuration with TTL (similar to agentic-knowledge approach)
- Log configuration loading errors to stderr

## Functional Requirements - OUT OF SCOPE (v1)

The following are explicitly OUT of scope for the initial version:

- ❌ Interactive commands (prompts, TTY input)
- ❌ Streaming output (show output as command runs)
- ❌ Timeout handling
- ❌ Working directory specification
- ❌ Environment variable customization
- ❌ Command history/caching
- ❌ Pattern testing/debugging tools
- ❌ CLI tool for pattern management (future consideration)

## Non-Functional Requirements

### NFR-1: Performance

- Command execution overhead MUST be minimal (< 50ms additional latency)
- Pattern matching MUST be efficient for large outputs (up to 100K lines)
- Configuration caching MUST reduce repeated file I/O

### NFR-2: Compatibility

- MUST work with Node.js >= 18.0.0
- MUST follow MCP protocol specification (stdio transport)
- MUST be installable via npm/pnpm

### NFR-3: Maintainability

- Code MUST be TypeScript with strict type checking
- MUST follow monorepo conventions (eslint, prettier, vitest)
- MUST include unit tests for filtering logic
- MUST include integration tests for MCP protocol

### NFR-4: Usability

- Template syntax MUST be intuitive (regex + tail paragraphs)
- Error messages MUST be clear and actionable
- Documentation MUST include template examples

### NFR-5: Reliability

- MUST handle command execution errors gracefully
- MUST validate configuration on load
- MUST not crash on malformed input

## Use Cases

### UC-1: AI Agent Runs Tests

**Actor:** AI Coding Assistant  
**Scenario:** Agent needs to run test suite and see only failures

**Flow:**

1. Agent calls quiet-shell MCP tool with test command and appropriate template
2. Server executes test command
3. Server applies template (include errors, last N paragraphs for summary)
4. Agent receives: exit code + filtered output (errors + summary)
5. Agent sees failure details and summary, not verbose passing test logs

**Success Criteria:**

- Exit code indicates failure
- Filtered output contains error messages with sufficient context
- Filtered output contains summary information
- Token usage < 10% of raw output

### UC-2: Developer Adds Custom Template

**Actor:** Developer  
**Scenario:** Project uses custom tool that generates verbose output

**Flow:**

1. Developer creates `.quiet-shell/config.yaml` in project root
2. Developer defines template with regex and tail_paragraphs
3. Developer commits configuration to git
4. AI agent discovers new template in tool metadata
5. AI agent uses custom template when running the tool

**Success Criteria:**

- Configuration is version controlled
- Team members automatically get new template
- Template appears in MCP tool parameter enum

### UC-3: Compilation Errors

**Actor:** AI Coding Assistant  
**Scenario:** Agent needs to compile code and see only errors

**Flow:**

1. Agent calls quiet-shell with compilation command and compiler template
2. Server executes compilation command (non-zero exit code indicates errors)
3. Server applies template (include error lines + summary)
4. Agent receives: exit code + filtered output showing compilation errors

**Success Criteria:**

- All compilation errors are visible with file locations
- Successful compilation output is minimal
- Summary indicates error count if available

## Business Rules

### BR-1: Template Precedence

When multiple templates have the same name:

1. Custom templates (from `.quiet-shell/config.yaml`) override preconfigured templates
2. Most recently loaded configuration takes precedence

### BR-2: Default Behavior

When no template is specified:

- Return complete raw output (no filtering)
- Always return exit code

### BR-3: Paragraph Definition

A "paragraph" is defined as:

- One or more consecutive non-empty lines
- Separated from other paragraphs by one or more blank lines
- Used for tail_paragraphs counting

## Assumptions and Dependencies

### Assumptions

- AI agents can specify template names when invoking commands
- Most useful output (summaries, errors) appears near the end of command output
- Regex patterns are sufficient for most filtering needs (v1)
- Developers are comfortable editing YAML configuration

### Dependencies

- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **Node.js >= 18**: Runtime environment
- **js-yaml**: YAML configuration parsing
- **Monorepo tooling**: pnpm, turbo, typescript, vitest

### External Integrations

- None - server is self-contained and tool-agnostic

## Success Criteria

Success will be determined by the project owner based on:

- Functional completeness (all FR-1 through FR-8 implemented)
- Template effectiveness (meaningful output preserved, noise filtered)
- Usability for AI agents (clear tool interface, discoverable templates)
- Code quality (TypeScript, tests, documentation)

## Future Considerations

Features to consider for future versions (explicitly out of scope for v1):

- CLI tool for template management (`quiet-shell template add`, `quiet-shell template test`)
- Template testing/validation tools
- More sophisticated filtering (context lines, severity levels)
- Output streaming for long-running commands
- Template marketplace or sharing
- Integration with CI/CD tools
