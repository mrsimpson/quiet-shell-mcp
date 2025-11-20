# Development Plan: quiet-shell (suppress-output-on-success branch)

_Generated on 2025-11-20 by Vibe Feature MCP_
_Workflow: [minor](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/minor)_

## Goal

Add a minor enhancement with an optional parameter `suppress_output_on_success` (defaults to `true`) that suppresses command output when commands succeed (exit code 0), while still showing output when commands fail. This reduces context window consumption for AI agents when commands complete successfully.

## Explore

### Phase Entrance Criteria:

- [ ] Initial state - no prerequisites

### Tasks

_All exploration tasks completed_

### Completed

- [x] Created development plan file
- [x] Understood current behavior: Without template = raw output, with template = filtered output (both regardless of exit code)
- [x] Analyzed suppression location: Best place is in server.ts execute_command handler
- [x] Designed approach: Always-on suppression for successful commands without template
- [x] Considered impact: No breaking changes - templates work as before, only affects raw output on success

## Implement

### Phase Entrance Criteria:

- [x] Analysis complete: Current behavior and impact fully understood
- [x] Design decided: Clear approach for implementing output suppression
- [x] Scope defined: What changes are needed and where

### Tasks

_All implementation tasks completed_

### Completed

- [x] ~~Modified server.ts to suppress output when exitCode === 0 and no template specified~~ (INCORRECT - needs parameter)
- [x] ~~Added test cases for output suppression on success~~ (needs update for parameter)
- [x] Corrected understanding: Need optional parameter with default value
- [x] Updated requirement: Should also work with templates (template can override)
- [x] Added `suppress_output_on_success?: boolean` to Template type
- [x] Updated server.ts to add parameter to input schema
- [x] Updated server.ts logic to check parameter and template override
- [x] Updated list_templates to include new field
- [x] All tests passing (88 tests: 72 core + 16 server)
- [x] Updated README with suppress_output_on_success documentation
- [x] Added template override example to README

## Finalize

### Phase Entrance Criteria:

- [x] Implementation complete: Code changes working as expected
- [x] Tests passing: All existing tests still pass
- [x] Behavior verified: Success cases suppress output, failure cases show output

### Tasks

_All finalization tasks completed_

### Completed

- [x] Checked for debug output - none found (only warning comments)
- [x] Checked for TODO/FIXME comments - none found
- [x] Ran final tests - all 88 tests passing
- [x] Documentation updated and accurate

## Key Decisions

### Suppression Strategy (Explore Phase - CORRECTED v2)

**Decision**: Add an optional parameter `suppress_output_on_success` that:

1. Defaults to `true` (suppression enabled by default)
2. Can be explicitly set to `false` to always show output
3. **Applies to both raw output AND template-filtered output**
4. Templates can override via config: Add `suppress_output_on_success: false` to template config
5. Only suppresses when exit code is 0 (success)

**Rationale**:

- "By default" means the parameter defaults to true
- Suppression should work for templates too (reduce context even with filtering)
- Template override gives granular control per tool (e.g., some tools may need to show success output)
- Errors always visible: Failed commands (exitCode !== 0) always show output
- Flexible: Users can opt-in to seeing successful output either globally or per-template

**Implementation Changes**:

1. Add `suppress_output_on_success?: boolean` to Template type in types.ts
2. Update server.ts logic:
   - Check parameter value (default true)
   - If template used, check template's override value
   - Suppress if: `(paramValue && !templateOverride) && exitCode === 0`
3. Update builtin templates and examples to show override capability

**Success Message**: `"Command completed successfully (output suppressed - exit code 0)"`

## Notes

_Additional context and observations_

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
