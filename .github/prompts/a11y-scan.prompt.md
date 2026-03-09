---
description: 'Run an AODA WCAG 2.2 accessibility scan on the current project'
agent: A11y Detector
argument-hint: '[url=http://localhost:3000] [scope=page|site]'
---

# Accessibility Scan

## Inputs

* ${input:url:http://localhost:3000}: (Optional, defaults to http://localhost:3000) Target URL to scan.
* ${input:scope:page}: (Optional, defaults to page) Scan scope: `page` for single page or `site` for full crawl.

## Requirements

1. Determine scan scope from user input (single page vs site crawl).
2. If URL provided, run runtime scan via CLI.
3. If no URL, perform static code analysis of the workspace.
4. Report findings in structured format.
