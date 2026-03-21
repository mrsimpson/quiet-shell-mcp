# Development Plan: quiet-shell (fix-binary-entrypoint branch)

_Generated on 2026-03-21 by Vibe Feature MCP_
_Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)_

## Goal

Fix `npx @codemcp/quiet-shell` failing because `dist/index.js` does not exist and no binary entrypoint is properly configured. The `bin` field in `package.json` should point to the MCP server entrypoint.

## Reproduce

<!-- beads-phase-id: mcp-server-1.1 -->

### Tasks

- [ ] Inspect current `package.json` `main`, `bin`, and `scripts` fields
- [ ] Check what files exist in `dist/` (or if it exists at all)
- [ ] Confirm the actual MCP server entrypoint file

### Phase Entrance Criteria:

- Bug is reported and understood at a high level

## Analyze

<!-- beads-phase-id: mcp-server-1.2 -->

### Tasks

- [ ] Understand why `dist/index.js` is missing or wrong
- [ ] Identify correct entrypoint for the MCP server
- [ ] Understand name collision issue (both package and server share same name)

### Phase Entrance Criteria:

- [ ] Bug has been reproduced or confirmed by inspecting `package.json` and `dist/`
- [ ] The missing/incorrect binary entrypoint is confirmed

## Fix

<!-- beads-phase-id: mcp-server-1.3 -->

### Tasks

- [ ] Update `package.json` `bin` field to point to correct MCP server entrypoint
- [ ] Ensure `main` field is correct (or removed if unnecessary)
- [ ] Verify build output matches what `bin` expects

### Phase Entrance Criteria:

- [ ] Root cause of missing binary is identified
- [ ] Correct entrypoint path is known

## Verify

<!-- beads-phase-id: mcp-server-1.4 -->

### Tasks

- [ ] Build the project and confirm entrypoint file exists at expected path
- [ ] Confirm `npx @codemcp/quiet-shell` would resolve correctly

### Phase Entrance Criteria:

- [ ] Fix has been applied to `package.json` and/or source files
- [ ] Build configuration is updated if needed

## Finalize

<!-- beads-phase-id: mcp-server-1.5 -->

### Tasks

- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>. Then, Create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies

### Phase Entrance Criteria:

- [ ] Fix is verified to work (binary resolves correctly after build)
- [ ] No regressions introduced
- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>. Then, Create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies

_Tasks managed via `bd` CLI_

## Key Decisions

- **Root `package.json` made private**: The workspace root had the same name (`@codemcp/quiet-shell`) as the publishable `packages/mcp-server` package. Since the root is only a monorepo orchestrator, it was renamed to `quiet-shell-workspace` and marked `"private": true` to prevent accidental publishing.
- **Removed `main`/`types`/`version`/`keywords`/`publishConfig` from root**: The root `package.json` had fields that only make sense for published packages, pointing to a non-existent `dist/` — these were cleaned up.
- **Added `files` to mcp-server**: Added `"files": ["dist"]` to `packages/mcp-server/package.json` to ensure only the compiled output is included when published to npm.
- **Binary was already correct**: `packages/mcp-server` already had the correct `bin` pointing to `dist/bin.js` with a proper `#!/usr/bin/env node` shebang and executable permissions.

## Notes

- The root package being named `@codemcp/quiet-shell` without `"private": true` is what caused `npx @codemcp/quiet-shell` to resolve to the wrong (root) package, which had no binary and no `dist/`.
- The actual publishable package lives in `packages/mcp-server/` and was already fully correct.
- Build verified: `pnpm build` succeeds and produces `dist/bin.js`, `dist/index.js`, `dist/chunk-ATLCNEH5.js`.

---

_This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management._
