---
name: quiet-shell
description: >
  Allows you to execute shell commands in a quiet mode, suppressing irrelevant output, while still exposing essential information. Use it also when commiting to suppress pre-commit-clutter.
license: MIT
metadata:
  version: "${VERSION}"
  repository: https://github.com/mrsimpson/quiet-shell-mcp
  author: mrsimpson
requires-mcp-servers:
  - name: quiet-shell
    package: "@codemcp/quiet-shell"
    description: "Wraps the shell command and applies patterns to reduce clutter"
    command: npx
    args: ["-y", "@codemcp/quiet-shell"]
---
