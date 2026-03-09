---
description: 'Fix accessibility violations in the current file or project'
agent: A11y Resolver
argument-hint: '[file=current] [violations=...]'
---

# Accessibility Fix

## Inputs

* ${input:file:current}: (Optional, defaults to current) Target file or "project" for full project scan.
* ${input:violations}: (Optional) Specific violation IDs or descriptions to fix.

## Requirements

1. Determine fix scope from user input (specific file, specific violations, or full project).
2. If violations provided, apply targeted fixes.
3. If no violations specified, scan current file for issues and fix them.
4. Verify fixes with tests.
