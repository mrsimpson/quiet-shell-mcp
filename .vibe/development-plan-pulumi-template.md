# Development Plan: quiet-shell (pulumi-template branch)

_Generated on 2026-03-21 by Vibe Feature MCP_
_Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)_

## Goal

Add a built-in `pulumi-up` filter template to quiet-shell that suppresses the extremely verbose progress/status lines from `pulumi up` output and only surfaces meaningful information: errors, warnings, resource changes, and the final summary.

## Explore

<!-- beads-phase-id: mcp-server-2.1 -->

### Tasks

- [x] Understand the existing template/filter system (`builtin-templates.ts`, `types.ts`)
- [x] Understand how templates are registered and exposed via the MCP server
- [x] Identify what typical `pulumi up` output looks like and what to keep vs. suppress

### Findings

- Templates are defined in `packages/core/src/config/builtin-templates.ts` as a `Record<string, Template>`
- Each template has: `description`, `include_regex`, `tail_paragraphs`, optional `suppress_output_on_success`
- The MCP server dynamically builds the enum of template names from the registered templates
- A new template only requires adding an entry to `BUILTIN_TEMPLATES` in `builtin-templates.ts`

## Plan

<!-- beads-phase-id: mcp-server-2.2 -->

### Phase Entrance Criteria:

- [x] Exploration is complete and the codebase structure is understood
- [x] The typical `pulumi up` output patterns are identified
- [x] It is clear which file(s) need to change

### Tasks

_Tasks managed via `bd` CLI_

## Code

<!-- beads-phase-id: mcp-server-2.3 -->

### Phase Entrance Criteria:

- [ ] A plan with the regex pattern and template fields has been agreed upon
- [ ] The target file (`builtin-templates.ts`) is identified

### Tasks

_Tasks managed via `bd` CLI_

## Commit

<!-- beads-phase-id: mcp-server-2.4 -->

### Phase Entrance Criteria:

- [ ] The new `pulumi-up` template is implemented in `builtin-templates.ts`
- [ ] Existing tests pass, and a new test covers the pulumi-up template
- [ ] The template is verified to work end-to-end (template appears in `list_templates`)

### Tasks

- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies.

_Tasks managed via `bd` CLI_

## Key Decisions

- **Only failures and warnings are kept** — successful resource creates/updates/deletes are suppressed
- **Outputs section is suppressed** — user does not need it in filtered view
- **Final summary line is always shown** — via `tail_paragraphs: 1` to capture `X resources changed, Duration: Xs`
- **Regex targets**: `error:`, `warning:`, `failed`, `panic:`, `diagnostics:`
- **`suppress_output_on_success` not set** — defer to the caller's preference (default behavior)

## Notes

- Pulumi lines to suppress: progress lines (`+`, `~`, `-`), stack header (`Updating (...)`), resource type/name table, `Outputs:` section
- Pulumi signal lines to keep: anything containing `error`, `warning`, `failed`, `panic`, `diagnostics`
- The final paragraph (summary) is captured via `tail_paragraphs: 1`

---

_This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management._
