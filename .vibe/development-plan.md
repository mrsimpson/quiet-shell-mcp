# Development Plan: quiet-shell (main branch)

_Generated on 2025-11-20 by Vibe Feature MCP_
_Workflow: [greenfield](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/greenfield)_

## Goal

Build a Model Context Protocol (MCP) server called "quiet-shell" that executes shell commands and intelligently filters verbose output to reduce context pollution when working with software agents. The server should return command exit codes and optionally filtered meaningful output based on configurable patterns.

## Ideation

### Tasks

- [ ] Review and validate requirements with user

### Completed

- [x] Created development plan file
- [x] Defined core functionality and user scenarios
- [x] Identified target scenarios and common verbose output patterns
- [x] Researched existing solutions (MCP protocol, agentic-knowledge architecture)
- [x] Defined scope boundaries (v1 features vs future)
- [x] Validated needs with project owner (AI agents need filtered shell output)
- [x] Documented comprehensive requirements in requirements.md
- [x] Defined template concept (regex + tail_paragraphs)

## Architecture

### Phase Entrance Criteria:

- [x] Requirements have been thoroughly documented and validated
- [x] User scenarios and target command patterns are clearly defined
- [x] Scope is well-defined (in-scope vs out-of-scope features)
- [x] Success metrics are established

### Tasks

- [ ] Review architecture with user

### Completed

- [x] Designed monorepo package structure (core + mcp-server + cli)
- [x] Defined core system components (Template Manager, Command Executor, Output Filter)
- [x] Designed template configuration system (discovery, loading, caching)
- [x] Designed output filtering engine (paragraph parsing, regex, tail extraction)
- [x] Selected technology stack (Node.js, TypeScript, MCP SDK, js-yaml)
- [x] Documented architecture decisions in architecture.md (essential only)

## Plan

### Phase Entrance Criteria:

- [x] Technical architecture is designed and documented
- [x] Technology stack has been selected with justified trade-offs
- [x] System components and their interactions are defined
- [x] Configuration strategy is established
- [x] Non-functional requirements are addressed

### Tasks

- [ ] Review implementation plan with user

### Completed

- [x] Created detailed design document (essential only)
- [x] Defined implementation phases (6 phases)
- [x] Identified dependencies between components
- [x] Planned testing strategy
- [x] Created quality checklist
- [x] Organized coding tasks in Code section below

## Code

### Phase Entrance Criteria:

- [x] Implementation plan with clear milestones exists
- [x] Detailed design document is complete
- [x] Task dependencies are identified
- [x] Development approach is defined
- [x] Testing strategy is documented

### Tasks

**Phase 1: Project Setup**

- [ ] Create packages/core directory with package.json
- [ ] Create packages/mcp-server directory with package.json
- [ ] Configure TypeScript for core package (tsconfig.json, tsconfig.build.json)
- [ ] Configure TypeScript for mcp-server package (tsconfig.json, tsconfig.build.json)
- [ ] Configure vitest for both packages (vitest.config.ts)
- [ ] Update root turbo.json for build orchestration
- [ ] Add core and mcp-server to pnpm workspace

**Phase 2: Core Types & Filtering**

- [ ] Define types.ts (Template, TemplateConfig, ExecutionResult, Logger interfaces)
- [ ] Implement logger.ts (createLogger function that writes to stderr)
- [ ] Write tests for logger (verify stderr output, no stdout)
- [ ] Implement paragraph-parser.ts (split output into paragraphs)
- [ ] Write tests for paragraph-parser.ts
- [ ] Implement output-filter.ts (filterOutput function)
- [ ] Write tests for output-filter.ts with sample outputs
- [ ] Create builtin-templates.ts with 4 preconfigured templates:
  - tsc: include_regex for TypeScript errors, tail_paragraphs: 1
  - vitest: include_regex for test failures, tail_paragraphs: 2
  - maven-build: include_regex for build errors, tail_paragraphs: 1
  - maven-test: include_regex for test failures, tail_paragraphs: 2

**Phase 3: Configuration System**

- [ ] Implement config/discovery.ts (findConfigPath function, inject logger)
- [ ] Write tests for config discovery (mock filesystem)
- [ ] Implement config/loader.ts (loadConfig, parseYaml, validateTemplate, inject logger)
- [ ] Write tests for config loader (valid/invalid YAML)
- [ ] Implement config/manager.ts (TemplateManager class with caching, inject logger)
- [ ] Write tests for TemplateManager (merging, caching, TTL)
- [ ] Create core/index.ts barrel export with public API
- [ ] Build core package and verify no errors

**Phase 4: Command Execution**

- [ ] Implement executor/command-executor.ts (executeCommand function, inject logger)
- [ ] Mock child_process.spawn for tests
- [ ] Test exit code handling (0, non-zero, 127)
- [ ] Test output capture (stdout, stderr, combined)
- [ ] Test with real simple commands (echo, ls) in integration tests

**Phase 5: MCP Integration**

- [ ] Create logger instance in mcp-server (writes to stderr)
- [ ] Implement mcp-server/server.ts (MCP protocol handler, inject logger into core components)
- [ ] Create execute_command tool handler
- [ ] Wire up: TemplateManager.getTemplate → CommandExecutor → OutputFilter (with logger)
- [ ] Implement dynamic tool schema (template enum from TemplateManager)
- [ ] Implement error responses for MCP protocol
- [ ] Create mcp-server/bin.ts entry point (#!/usr/bin/env node)
- [ ] Verify: NO console.log/error anywhere in codebase
- [ ] Add integration test for full MCP request/response cycle
- [ ] Manual test with npx @modelcontextprotocol/inspector

**Phase 6: Documentation & Polish**

- [ ] Create root README.md with:
  - Project description
  - Installation instructions
  - Usage examples with MCP clients
  - Configuration guide
- [ ] Create example .quiet-shell/config.yaml in examples/ directory
- [ ] Add JSDoc comments to all exported functions/classes
- [ ] Run all tests: pnpm test
- [ ] Run linting: pnpm lint:all
- [ ] Run formatting: pnpm format:all
- [ ] Verify build: pnpm build
- [ ] Test installation locally: pnpm pack:local

### Completed

- [x] Phase 1: Project Setup - COMPLETE
- [x] Phase 2: Core Types & Filtering - COMPLETE
- [x] Phase 3: Configuration System - COMPLETE
- [x] Phase 4: Command Execution - COMPLETE
- [x] Phase 5: MCP Integration - COMPLETE
  - [x] Created logger instance for MCP server (writes to stderr only)
  - [x] Implemented mcp-server/server.ts with MCP protocol handler
  - [x] Created execute_command tool with structured JSON response (result, exit_code, output, template_used)
  - [x] Added result field: "success" (exit_code=0) or "failure" (exit_code!=0) for easy interpretation
  - [x] Created list_templates tool for template discovery
  - [x] Wired up: TemplateManager → CommandExecutor → OutputFilter with logger injection
  - [x] Implemented dynamic tool schema (template enum from TemplateManager)
  - [x] Implemented error responses with helpful messages
  - [x] Created mcp-server/bin.ts entry point
  - [x] Updated builtin template descriptions to be agent-friendly
  - [x] Verified: NO console.log/error anywhere in codebase ✅
  - [x] Both packages build successfully
- [x] **Core Package: 72/72 tests passing** ✅

- [x] Phase 6: Documentation & Polish - COMPLETE
  - [x] Created comprehensive README.md
  - [x] Created example config.yaml
  - [x] Ran formatting (prettier)
  - [x] Added MCP server integration tests (13 tests) validating:
    - Built-in template enum
    - Agent-friendly descriptions
    - Structured response format (result, exit_code, output, template_used)
    - Error messages with list_templates instruction
    - Parameter validation
  - [x] All tests passing: **85/85 tests** ✅
    - Core: 72 tests
    - MCP Server: 13 tests
  - [x] Both packages build successfully ✅
  - [x] Manual testing completed ✅
  - [x] No console.log/error anywhere ✅

**🎉 PROJECT COMPLETE! 🎉**

## Finalize

### Phase Entrance Criteria:

- [x] Core functionality is implemented and working
- [x] Tests are passing (85/85)
- [x] Build process succeeds
- [x] Basic documentation exists

### Tasks

- [ ] Ask user to review final state

### Completed

- [x] Step 1: Code Cleanup
  - [x] Verified: NO console.log/error/warn/debug statements ✓
  - [x] Verified: NO TODO/FIXME comments ✓
  - [x] Verified: No debugging code blocks ✓
- [x] Step 2: Documentation Review
  - [x] Requirements.md: Accurate, all FR-1 through FR-8 met
  - [x] Architecture.md: Reflects final implementation (core + mcp-server packages)
  - [x] Design.md: Essential patterns and principles documented
  - [x] README.md: Complete with installation, usage, examples
  - [x] Examples: config.yaml with 8+ framework templates
- [x] Step 3: Final Validation
  - [x] All tests passing: 85/85 ✓
  - [x] Build succeeds for both packages ✓
  - [x] Manual testing passed ✓
  - [x] Documentation verified ✓

**🎉 PROJECT READY FOR DELIVERY 🎉**

## Key Decisions

### Template Selection Approach

**Decision:** Templates are explicitly selected by the caller (not auto-detected)
**Rationale:**

- Gives AI agents full control over filtering behavior
- Avoids ambiguity when multiple templates could apply
- Simpler implementation and debugging
- Templates exposed in MCP tool metadata for discoverability

### Template Configuration Format

**Decision:** Use regex for line inclusion + tail paragraphs count
**Rationale:**

- Regex provides flexibility for matching error patterns
- Paragraphs (vs lines) handle variable-length summaries better
- Simple enough for developers to write custom templates
- Extensible for future enhancements
- **Template = regex + tail_paragraphs configuration**

### Configuration Location

**Decision:** `.quiet-shell/config.yaml` in project root
**Rationale:**

- Follows convention from agentic-knowledge (`.knowledge/config.yaml`)
- Easy to locate and version control
- Clear purpose with dedicated directory

### Monorepo Package Structure

**Decision:** Three packages: core, mcp-server, cli (future)
**Rationale:**

- **@codemcp/quiet-shell-core**: Reusable logic (template management, filtering, execution)
- **@codemcp/quiet-shell-mcp**: MCP protocol implementation
- **@codemcp/quiet-shell-cli**: Future CLI tool for template management
- Separation of concerns, independent testing, future extensibility

### Technology Stack

**Decision:** Node.js 18+, TypeScript, MCP SDK, js-yaml
**Rationale:**

- Matches existing monorepo conventions
- Minimal external dependencies (only MCP SDK and js-yaml)
- Standard tools (vitest, eslint, prettier, turbo)
- Leverages Node.js built-in child_process for command execution

### Filtering Algorithm

**Decision:** Paragraph-based parsing + regex inclusion + tail paragraphs
**Rationale:**

- Paragraphs handle variable-length summaries better than fixed line counts
- Regex provides flexible pattern matching for errors/warnings
- Tail paragraphs ensure summaries are always included
- Simple to implement and understand

## Notes

### Terminology

**Template**: A reusable filtering configuration consisting of:

- `include_regex`: Regex pattern for lines to include in output
- `tail_paragraphs`: Number of paragraphs to include from end of output
- `description`: Human-readable description of template purpose

### Critical Design Constraint: Logging

**NEVER use console.log() or console.error()!**

- MCP protocol uses stdout for communication
- Any console output corrupts the MCP protocol stream
- **Solution**: Custom logger injected into all components
- Logger writes to stderr using `process.stderr.write()`
- All components accept logger via dependency injection
- No global logger - explicit injection only

**Logger Interface**:

```typescript
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

### Inspiration from agentic-knowledge

- Configuration discovery pattern (search upward from cwd)
- YAML configuration format
- MCP tool metadata for exposing available options
- Monorepo structure with separate packages
- Caching strategy for configuration

### Preconfigured Templates (Initial Set)

1. **tsc** - TypeScript compiler output filtering
2. **vitest** - Test framework output filtering
3. **maven-build** - Maven build output filtering
4. **maven-test** - Maven test output filtering

### Key Use Case

AI agent runs test suite with many passing tests and few failures:

- **Without quiet-shell**: 2000+ lines of output
- **With quiet-shell**: ~20 lines (errors + summary)

### Implementation Details

**File Structure**:

```
packages/
  core/
    src/
      config/
        discovery.ts          # findConfigPath()
        loader.ts             # loadConfig(), validateTemplate()
        manager.ts            # TemplateManager class
        builtin-templates.ts  # BUILTIN_TEMPLATES constant
      executor/
        command-executor.ts   # executeCommand()
      filter/
        paragraph-parser.ts   # parseParagraphs()
        output-filter.ts      # filterOutput()
      types.ts                # Template, TemplateConfig, ExecutionResult
      index.ts                # Public API exports
    package.json
    tsconfig.json
    tsconfig.build.json
    vitest.config.ts

  mcp-server/
    src/
      server.ts               # MCP protocol implementation
      bin.ts                  # #!/usr/bin/env node entry
      index.ts                # Exports
    package.json
    tsconfig.json
    tsconfig.build.json
    vitest.config.ts
```

**Preconfigured Templates** (in builtin-templates.ts):

```typescript
tsc: {
  description: "TypeScript compiler output",
  include_regex: "(error TS|TS[0-9]+:|Found [0-9]+ error)",
  tail_paragraphs: 1
}

vitest: {
  description: "Vitest test framework output",
  include_regex: "(FAIL|ERROR|✖|❯.*failed)",
  tail_paragraphs: 2
}

maven-build: {
  description: "Maven build output",
  include_regex: "(ERROR|FAILURE|BUILD FAILURE)",
  tail_paragraphs: 1
}

maven-test: {
  description: "Maven test output",
  include_regex: "(FAILURE|ERROR|Tests run:.*Failures:)",
  tail_paragraphs: 2
}
```

**Constants**:

- `CONFIG_FILE_NAME`: ".quiet-shell/config.yaml"
- `CONFIG_CACHE_TTL`: 60000 (60 seconds)
- `DEFAULT_TAIL_PARAGRAPHS`: 1

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
