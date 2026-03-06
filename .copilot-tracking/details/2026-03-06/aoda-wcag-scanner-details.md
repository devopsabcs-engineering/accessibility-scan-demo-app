<!-- markdownlint-disable-file -->
# Implementation Details: AODA WCAG 2.2 Accessibility Scanner Web App

## Context Reference

Sources:
* [aoda-wcag-accessibility-scanner-research.md](../../research/2026-03-06/aoda-wcag-accessibility-scanner-research.md) — Primary research
* [accessibility-engines-research.md](../../research/subagents/2026-03-06/accessibility-engines-research.md) — Engine research
* [architecture-scoring-report-research.md](../../research/subagents/2026-03-06/architecture-scoring-report-research.md) — Architecture research

## Implementation Phase 1: Project Scaffolding & Configuration

<!-- parallelizable: false -->

### Step 1.1: Initialize Next.js 15 project with TypeScript and App Router

Create the Next.js project in the repo root. Since files already exist (README.md, assets/), initialize within the existing directory.

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

If the CLI refuses due to existing files, manually create:
* `package.json` with Next.js 15, React 19, TypeScript dependencies
* `tsconfig.json` with Next.js TypeScript config
* `next.config.ts` with default config
* `src/app/layout.tsx` — root layout
* `src/app/page.tsx` — placeholder home page

Files:
* `package.json` — Project manifest with scripts (dev, build, start, lint)
* `tsconfig.json` — TypeScript configuration
* `next.config.ts` — Next.js configuration
* `src/app/layout.tsx` — Root layout with HTML lang="en"
* `src/app/page.tsx` — Placeholder page

Success criteria:
* `npm run dev` starts the development server without errors
* `npm run build` compiles successfully

Dependencies:
* Node.js 20+ installed

### Step 1.2: Install core dependencies

Install the scanning engine, headless browser, and PDF generation packages.

```bash
# Scanning engine
npm install @axe-core/playwright playwright

# PDF generation
npm install puppeteer

# UUID generation for scan IDs
npm install uuid
npm install -D @types/uuid
```

Files:
* `package.json` — Updated with new dependencies

Success criteria:
* All packages install without errors
* `package-lock.json` is created/updated

Dependencies:
* Step 1.1 completion

### Step 1.3: Configure Tailwind CSS and global styles

Tailwind CSS v4 is included by `create-next-app`. Verify configuration and add custom theme colors for score grades.

Ensure `src/app/globals.css` includes Tailwind directives and custom CSS variables for score colors:

```css
@import "tailwindcss";

:root {
  --score-excellent: #22c55e;  /* green-500 */
  --score-good: #84cc16;       /* lime-500 */
  --score-needs-work: #eab308; /* yellow-500 */
  --score-poor: #f97316;       /* orange-500 */
  --score-critical: #ef4444;   /* red-500 */
}
```

Files:
* `src/app/globals.css` — Tailwind imports + custom score color variables

Success criteria:
* Tailwind classes render in the browser
* Custom CSS variables are available

Dependencies:
* Step 1.1 completion

### Step 1.4: Install Playwright browsers

Install the Chromium browser binary needed for scanning.

```bash
npx playwright install chromium
```

Files:
* None (installs browser binary to system cache)

Success criteria:
* `npx playwright install chromium` completes without errors

Dependencies:
* Step 1.2 completion

## Implementation Phase 2: Scan Engine (Playwright + axe-core)

<!-- parallelizable: false -->

### Step 2.1: Create TypeScript types for scan results, scores, and reports

Define all shared types used across the scanner, scorer, and report generator.

Files:
* `src/lib/types/scan.ts` — Scan request, scan status, axe result wrapper types
* `src/lib/types/score.ts` — Score result, principle scores, impact breakdown types
* `src/lib/types/report.ts` — Report data, violation detail, report section types

Key types to define:

```typescript
// src/lib/types/scan.ts
export type ScanStatus = 'pending' | 'navigating' | 'scanning' | 'scoring' | 'complete' | 'error';

export interface ScanRequest {
  url: string;
}

export interface ScanRecord {
  id: string;
  url: string;
  status: ScanStatus;
  progress: number;       // 0-100
  message: string;
  startedAt: string;
  completedAt?: string;
  results?: ScanResults;
  error?: string;
}

export interface ScanResults {
  url: string;
  timestamp: string;
  engineVersion: string;
  violations: AxeViolation[];
  passes: AxePass[];
  incomplete: AxeIncomplete[];
  inapplicable: AxeInapplicable[];
  score: ScoreResult;
}

// Wrap axe-core result types for our domain
export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
  principle?: string;  // mapped POUR principle
}

export interface AxeNode {
  html: string;
  target: string[];
  impact: string;
  failureSummary?: string;
}

export interface AxePass {
  id: string;
  tags: string[];
  description: string;
  nodes: { html: string; target: string[] }[];
}

export interface AxeIncomplete {
  id: string;
  impact: string | null;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

export interface AxeInapplicable {
  id: string;
  tags: string[];
  description: string;
}
```

```typescript
// src/lib/types/score.ts
export interface ScoreResult {
  overallScore: number;  // 0-100
  grade: ScoreGrade;
  principleScores: PrincipleScores;
  impactBreakdown: ImpactBreakdown;
  totalViolations: number;
  totalPasses: number;
  totalIncomplete: number;
  aodaCompliant: boolean;
}

export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface PrincipleScores {
  perceivable: PrincipleScore;
  operable: PrincipleScore;
  understandable: PrincipleScore;
  robust: PrincipleScore;
}

export interface PrincipleScore {
  score: number;
  violationCount: number;
  passCount: number;
}

export interface ImpactBreakdown {
  critical: { passed: number; failed: number };
  serious: { passed: number; failed: number };
  moderate: { passed: number; failed: number };
  minor: { passed: number; failed: number };
}
```

```typescript
// src/lib/types/report.ts
export interface ReportData {
  url: string;
  scanDate: string;
  engineVersion: string;
  score: ScoreResult;
  violations: AxeViolation[];
  passes: AxePass[];
  incomplete: AxeIncomplete[];
  aodaNote: string;
  disclaimer: string;
}
```

Success criteria:
* All type files compile without errors
* Types cover axe-core output structure, scoring, and report needs

Context references:
* architecture-scoring-report-research.md (Lines 240-320) — Scoring type definitions
* accessibility-engines-research.md (Lines 80-115) — axe-core output format

Dependencies:
* Phase 1 completion

### Step 2.2: Implement the scan engine (`src/lib/scanner/engine.ts`)

Core scanning logic: launch Playwright Chromium, navigate to URL, run axe-core with WCAG 2.2 AA tags, return structured results.

Files:
* `src/lib/scanner/engine.ts` — Main scan function

Implementation approach:
1. Accept a URL and a progress callback function
2. Launch Playwright Chromium in headless mode
3. Create a new browser context with reasonable viewport (1280×1024)
4. Navigate to the URL with `waitUntil: 'networkidle'` and 30s timeout
5. Run `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()`
6. Close the browser
7. Return the raw axe-core results

Key code pattern:

```typescript
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

export async function scanUrl(
  url: string,
  onProgress?: (status: string, progress: number) => void
) {
  onProgress?.('navigating', 10);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    onProgress?.('scanning', 40);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    onProgress?.('scoring', 80);
    return results;
  } finally {
    await browser.close();
  }
}
```

Security considerations:
* Validate URL before scanning (must be http:// or https://)
* Set navigation timeout to prevent hanging on unresponsive sites
* Handle page load errors (timeout, DNS failure, SSL errors)

Success criteria:
* Function accepts a URL and returns axe-core AxeResults
* Progress callback fires at each stage
* Browser is always closed (even on error) via `finally` block
* Invalid URLs are rejected before launching browser

Context references:
* accessibility-engines-research.md (Lines 55-75) — @axe-core/playwright integration pattern
* architecture-scoring-report-research.md (Lines 100-130) — Playwright integration example

Dependencies:
* Step 2.1 (types)
* Phase 1 (Playwright + axe-core installed)

### Step 2.3: Implement result parser (`src/lib/scanner/result-parser.ts`)

Parse raw axe-core results into our domain types, enriching violations with WCAG principle mappings.

Files:
* `src/lib/scanner/result-parser.ts` — Parse and transform axe results

Implementation approach:
1. Accept raw `AxeResults` from axe-core
2. Map violations to `AxeViolation[]` with WCAG principle attached
3. Map passes, incomplete, and inapplicable arrays
4. Return structured `ScanResults` object

Success criteria:
* All axe-core result arrays are properly mapped to domain types
* Each violation has a `principle` field set via WCAG mapper
* Engine version is extracted from results

Dependencies:
* Step 2.1 (types)
* Step 2.5 (WCAG mapper — can be developed in parallel if interface is agreed)

### Step 2.4: Implement scoring calculator (`src/lib/scoring/calculator.ts`)

Weighted score computation following Lighthouse methodology.

Files:
* `src/lib/scoring/calculator.ts` — Score computation logic

Implementation approach:

```typescript
const IMPACT_WEIGHTS = {
  critical: 10,
  serious: 7,
  moderate: 3,
  minor: 1,
} as const;

function getGrade(score: number): ScoreGrade {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}
```

Score formula: `Score = 100 × Σ(weight_i × passed_i) / Σ(weight_i)` across all applicable rules.

For each rule in violations + passes:
* Determine impact level (use highest impact across nodes for violations)
* Look up weight from IMPACT_WEIGHTS
* Track pass/fail per impact level
* Calculate weighted pass rate

AODA compliance: `aodaCompliant = totalViolations === 0` (when scanning with WCAG 2.2 AA tags, passing all means AODA compliance since WCAG 2.2 AA is a superset of WCAG 2.0 AA).

Success criteria:
* Score returns 100 when no violations exist
* Score returns 0 when all rules fail with critical impact
* Grade maps correctly to score ranges
* Principle scores are computed independently
* AODA compliance flag is set correctly

Context references:
* architecture-scoring-report-research.md (Lines 200-280) — Scoring formula and weights

Dependencies:
* Step 2.1 (types)

### Step 2.5: Implement WCAG principle mapper (`src/lib/scoring/wcag-mapper.ts`)

Map axe-core violation tags to WCAG POUR principles.

Files:
* `src/lib/scoring/wcag-mapper.ts` — Tag-to-principle mapping

Implementation approach:

```typescript
export type WcagPrinciple = 'perceivable' | 'operable' | 'understandable' | 'robust' | 'best-practice';

export function mapTagToPrinciple(tags: string[]): WcagPrinciple {
  // Find the wcag SC tag (e.g., 'wcag111', 'wcag143', 'wcag258')
  const wcagTag = tags.find(t => /^wcag\d{3,}$/.test(t));
  if (!wcagTag) return 'best-practice';

  const firstDigit = wcagTag.charAt(4);
  switch (firstDigit) {
    case '1': return 'perceivable';
    case '2': return 'operable';
    case '3': return 'understandable';
    case '4': return 'robust';
    default: return 'best-practice';
  }
}

export function getPrincipleLabel(principle: WcagPrinciple): string {
  const labels: Record<WcagPrinciple, string> = {
    perceivable: 'Perceivable',
    operable: 'Operable',
    understandable: 'Understandable',
    robust: 'Robust',
    'best-practice': 'Best Practice',
  };
  return labels[principle];
}
```

Success criteria:
* `wcag111` maps to 'perceivable'
* `wcag258` maps to 'operable'
* `wcag311` maps to 'understandable'
* `wcag412` maps to 'robust'
* Tags without wcag SC pattern map to 'best-practice'

Context references:
* architecture-scoring-report-research.md (Lines 330-360) — WCAG tag-to-principle mapping

Dependencies:
* Step 2.1 (types)

### Step 2.6: Implement in-memory scan store (`src/lib/scanner/store.ts`)

Simple in-memory Map to store scan records during the scan lifecycle. Phase 2 can replace with a database.

Files:
* `src/lib/scanner/store.ts` — In-memory scan record storage

Implementation approach:

```typescript
const scans = new Map<string, ScanRecord>();

export function createScan(id: string, url: string): ScanRecord { ... }
export function getScan(id: string): ScanRecord | undefined { ... }
export function updateScan(id: string, updates: Partial<ScanRecord>): void { ... }
```

Success criteria:
* CRUD operations work for ScanRecord objects
* Store is module-scoped (persists across API calls within same process)

Dependencies:
* Step 2.1 (types)

### Step 2.7: Validate phase — unit tests for scoring and WCAG mapper

Write unit tests for the pure logic modules.

Files:
* `src/lib/scoring/__tests__/calculator.test.ts`
* `src/lib/scoring/__tests__/wcag-mapper.test.ts`

Validation commands:
* `npx jest` or `npx vitest` — Run unit tests
* `npm run build` — Verify compilation

## Implementation Phase 3: API Routes

<!-- parallelizable: false -->

### Step 3.1: Implement POST `/api/scan` route

Accept a URL, validate it, create a scan record, start the scan asynchronously, return the scanId.

Files:
* `src/app/api/scan/route.ts` — POST handler

Implementation approach:
1. Parse request body: `{ url: string }`
2. Validate URL: must be `http://` or `https://`, no IP addresses in private ranges (SSRF prevention)
3. Generate UUID for scanId
4. Create scan record in store with status 'pending'
5. Start scan asynchronously (do not await — return immediately)
6. Return `{ scanId }` with 202 Accepted

Security considerations:
* **SSRF prevention**: Validate that the URL host is not a private/internal IP address (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, ::1, fc00::/7)
* **URL validation**: Reject non-HTTP(S) protocols (file://, javascript:, data:, etc.)
* **Input sanitization**: Trim and validate URL length (max 2048 chars)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  // Validate URL
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // SSRF prevention + protocol validation
  if (!isValidScanUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const scanId = uuidv4();
  // Create record, start async scan, return scanId
  return NextResponse.json({ scanId }, { status: 202 });
}
```

Success criteria:
* Returns 202 with scanId for valid URLs
* Returns 400 for empty, invalid, or private URLs
* Scan starts asynchronously — response returns before scan completes

Context references:
* architecture-scoring-report-research.md (Lines 7-30) — Architecture flow

Dependencies:
* Phase 2 completion (engine, store, types)

### Step 3.2: Implement GET `/api/scan/[id]` route

Return the scan results for a completed scan.

Files:
* `src/app/api/scan/[id]/route.ts` — GET handler

Implementation approach:
1. Extract scanId from route params
2. Look up scan record from store
3. If not found, return 404
4. If status is not 'complete', return current status with 200
5. If complete, return full results

Success criteria:
* Returns 404 for unknown scanId
* Returns scan status when scan is in progress
* Returns full results with score when complete

Dependencies:
* Step 3.1 (POST route creates scan records)

### Step 3.3: Implement GET `/api/scan/[id]/status` route (SSE)

Server-Sent Events endpoint for real-time scan progress.

Files:
* `src/app/api/scan/[id]/status/route.ts` — SSE handler

Implementation approach:
1. Set response headers for SSE: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
2. Use `ReadableStream` to push events
3. Poll scan record status at intervals (or use event emitter pattern)
4. Send events: `{ status, progress, message }`
5. Close stream when scan completes or errors

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll for status updates
      const interval = setInterval(() => {
        const scan = getScan(id);
        if (!scan) {
          send({ status: 'error', message: 'Scan not found' });
          clearInterval(interval);
          controller.close();
          return;
        }
        send({ status: scan.status, progress: scan.progress, message: scan.message });
        if (scan.status === 'complete' || scan.status === 'error') {
          clearInterval(interval);
          controller.close();
        }
      }, 500);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

Success criteria:
* SSE stream opens and sends progress events
* Events include status, progress percentage, and message
* Stream closes when scan completes or errors
* Client can reconnect if connection drops

Dependencies:
* Step 3.1 (scan creation)
* Step 2.6 (store for status polling)

## Implementation Phase 4: Frontend Components

<!-- parallelizable: true -->

### Step 4.1: Create root layout (`src/app/layout.tsx`)

Root layout with HTML lang attribute, metadata, and global styles.

Files:
* `src/app/layout.tsx` — Root layout

Implementation approach:
* Set `<html lang="en">` for accessibility
* Add metadata: title "AODA WCAG 2.2 Accessibility Scanner", description
* Import globals.css
* Viewport meta for responsive design
* Skip-to-content link for keyboard navigation

Success criteria:
* Root layout renders with proper HTML lang and meta tags
* Skip-to-content link is present for keyboard users

Dependencies:
* Phase 1 completion (project scaffolded)

### Step 4.2: Create ScanForm component

URL input form with submit button and basic validation.

Files:
* `src/components/ScanForm.tsx` — Client component with form

Implementation approach:
* `'use client'` component
* Controlled input for URL with `type="url"`
* Submit handler calls POST `/api/scan` and redirects to `/scan/[id]`
* Loading state during submission
* Client-side URL validation (HTTP/HTTPS only)
* Accessible: `<label>` for input, `aria-describedby` for help text, focus management

Key features:
* Input placeholder: "Enter a website URL (e.g., https://www.ontario.ca)"
* Submit button: "Scan for Accessibility Issues"
* Error display for invalid URLs or API errors

Success criteria:
* Form submits valid URLs and navigates to scan page
* Invalid URLs show inline validation error
* Loading spinner during submission

Dependencies:
* API routes available (Phase 3) for full functionality, but component can be built independently

### Step 4.3: Create ScanProgress component

Real-time progress display connected to SSE endpoint.

Files:
* `src/components/ScanProgress.tsx` — Client component with SSE

Implementation approach:
* `'use client'` component accepting `scanId` prop
* Connect to `/api/scan/[id]/status` via `EventSource`
* Display progress bar (0-100%) with status message
* Stages: Pending → Navigating → Scanning → Scoring → Complete
* On completion, call `onComplete` callback to trigger results fetch
* Handle errors gracefully (show retry option)

Accessibility:
* `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
* `aria-live="polite"` region for status message updates

Success criteria:
* Progress bar updates in real-time during scan
* Status message changes at each stage
* Handles SSE connection errors with retry

Dependencies:
* SSE endpoint (Step 3.3) for real-time updates

### Step 4.4: Create ScoreDisplay component

Visual score gauge with grade and color coding.

Files:
* `src/components/ScoreDisplay.tsx` — Score circle/gauge component

Implementation approach:
* Accept `ScoreResult` as prop
* Display large score number (0-100) with grade letter (A-F)
* Color code by grade: A=green, B=lime, C=yellow, D=orange, F=red
* Display POUR principle sub-scores as smaller indicators
* Show total violation/pass/incomplete counts
* AODA compliance badge: "AODA Compliant" or "Needs Remediation"

Visual design:
* Circular gauge (SVG circle with stroke-dashoffset for score arc)
* Four horizontal bars for POUR principle scores
* Impact breakdown badges: Critical (X), Serious (X), Moderate (X), Minor (X)

Accessibility:
* Score value in text, not just visual
* Colors supplemented with text labels
* `aria-label` on the gauge SVG

Success criteria:
* Score gauge renders with correct color for the grade
* POUR breakdown shows four principle scores
* AODA badge displays correct compliance status

Dependencies:
* Step 2.1 (ScoreResult type)

### Step 4.5: Create ViolationList component

Expandable list of violations grouped by WCAG principle.

Files:
* `src/components/ViolationList.tsx` — Violation display component

Implementation approach:
* Accept `AxeViolation[]` as prop
* Group violations by WCAG principle (POUR)
* Each principle section is collapsible
* Each violation shows:
  * Rule ID and description
  * Impact badge (color-coded: critical=red, serious=orange, moderate=yellow, minor=blue)
  * WCAG success criterion tag
  * Number of affected elements
  * Expandable: list of affected elements with HTML snippet and CSS selector
  * "Learn more" link to axe-core helpUrl

Accessibility:
* Collapsible sections use `<details>/<summary>` or `aria-expanded`
* HTML snippets in `<code>` blocks
* Impact conveyed via text + color (not color alone)

Success criteria:
* Violations display grouped by POUR principle
* Each violation is expandable to show affected elements
* Impact levels are visually distinct and accessible
* Help links open axe-core documentation

Dependencies:
* Step 2.1 (types)

### Step 4.6: Create ReportView component

Full report layout composing ScoreDisplay, ViolationList, and summary sections.

Files:
* `src/components/ReportView.tsx` — Report composition component

Implementation approach:
* Accept `ScanResults` as prop
* Sections (matching report structure from research):
  1. Header: "WCAG 2.2 Level AA Accessibility Report" + scanned URL + date
  2. Executive Summary: ScoreDisplay component
  3. POUR Breakdown: Four principle cards with scores
  4. Issue Summary Table: Count of violations by impact
  5. Detailed Violations: ViolationList component
  6. Passes Section: Collapsible list of passed rules
  7. Incomplete/Manual Review: Items needing manual review
  8. AODA Compliance Note: Explanation of AODA requirements
  9. Footer: Disclaimer about automated testing limitations

Success criteria:
* All report sections render with correct data
* Report is well-structured and readable
* AODA note is present with correct regulatory context

Dependencies:
* Steps 4.4, 4.5 (ScoreDisplay, ViolationList)

## Implementation Phase 5: Pages & Routing

<!-- parallelizable: false -->

### Step 5.1: Create home page (`src/app/page.tsx`)

Landing page with project branding and scan form.

Files:
* `src/app/page.tsx` — Home page

Implementation approach:
* Hero section: App title, brief description of AODA WCAG 2.2 scanning
* ScanForm component centered on page
* Brief explanation: "Enter a URL to scan for WCAG 2.2 Level AA accessibility compliance"
* How it works section: 3-step process (Enter URL → Scan → Get Report)
* Footer with disclaimer and link references

Success criteria:
* Clean landing page with clear call to action
* ScanForm is accessible and prominent
* Page is itself accessible (proper heading hierarchy, landmarks)

Dependencies:
* Step 4.2 (ScanForm)

### Step 5.2: Create scan results page (`src/app/scan/[id]/page.tsx`)

Dynamic page that shows progress during scan and results after completion.

Files:
* `src/app/scan/[id]/page.tsx` — Scan results page (client component)

Implementation approach:
* `'use client'` component
* State machine: loading → scanning → results → error
* While scanning: render ScanProgress component
* On completion: fetch results from GET `/api/scan/[id]` and render ReportView
* On error: display error message with "Try Again" link
* PDF download button visible when results are ready

State flow:
1. Mount: connect to SSE via ScanProgress
2. SSE complete event: fetch full results
3. Render ReportView with results
4. Show "Download PDF" button and "Scan Another URL" link

Success criteria:
* Page shows progress during scan
* Transitions to results display on completion
* Error states are handled gracefully
* PDF download button is visible and functional

Dependencies:
* Phase 3 (API routes)
* Phase 4 (all frontend components)

## Implementation Phase 6: PDF Report Generation

<!-- parallelizable: true -->

### Step 6.1: Create report HTML template

Standalone HTML template that renders a complete accessibility report for PDF conversion.

Files:
* `src/lib/report/templates/report-template.ts` — HTML string template function

Implementation approach:
* Function that accepts ReportData and returns a complete HTML string
* Self-contained: inline CSS (no external stylesheets for PDF rendering)
* Matches the in-browser report layout but optimized for print/PDF
* Sections: header with logo area, executive summary with score gauge (CSS-rendered), POUR breakdown table, violations table with details, passes section, AODA note, footer with disclaimer

Report styling:
* Print-friendly: no dark mode, clean serif/sans-serif fonts
* Page break hints (`page-break-before`, `page-break-inside: avoid`)
* Score gauge rendered as CSS circle or inline SVG
* Impact badges with background colors
* Code blocks for HTML snippets

Success criteria:
* Template generates valid HTML that renders correctly in Puppeteer
* All report data is reflected in the HTML
* Print-friendly styling with proper page breaks

Context references:
* architecture-scoring-report-research.md (Lines 380-450) — Report content requirements

Dependencies:
* Step 2.1 (types)

### Step 6.2: Implement report data generator

Transform scan results into the ReportData structure expected by the template.

Files:
* `src/lib/report/generator.ts` — Assemble ReportData from ScanResults

Implementation approach:
1. Accept ScanResults
2. Construct ReportData with all required fields
3. Add AODA note text
4. Add disclaimer text
5. Sort violations by impact severity (critical first)

Success criteria:
* ReportData is fully populated from ScanResults
* AODA note includes correct regulatory text
* Disclaimer includes the ~57% automated detection caveat

Dependencies:
* Step 2.1 (types)

### Step 6.3: Implement PDF generator

Convert report HTML to PDF using Puppeteer.

Files:
* `src/lib/report/pdf-generator.ts` — HTML to PDF conversion

Implementation approach:

```typescript
import puppeteer from 'puppeteer';

export async function generatePdf(reportHtml: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(reportHtml, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '1.5cm', right: '1.5cm', bottom: '1.5cm', left: '1.5cm' },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:9px; text-align:center; width:100%; color:#666;">WCAG 2.2 Accessibility Report</div>',
    footerTemplate: '<div style="font-size:9px; text-align:center; width:100%; color:#666;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  });

  await browser.close();
  return Buffer.from(pdf);
}
```

Success criteria:
* Generates a valid PDF buffer from HTML
* PDF includes headers and footers
* Styled correctly with A4 format
* Browser is always closed in finally block

Dependencies:
* Step 6.1 (template generates HTML)

### Step 6.4: Implement GET `/api/scan/[id]/pdf` route

API route that generates and returns a PDF for a completed scan.

Files:
* `src/app/api/scan/[id]/pdf/route.ts` — GET handler returning PDF

Implementation approach:
1. Get scan record from store
2. If not found or not complete, return 404/400
3. Assemble ReportData from scan results
4. Generate HTML from template
5. Convert HTML to PDF
6. Return PDF with `Content-Type: application/pdf` and `Content-Disposition: attachment`

Success criteria:
* Returns PDF file for completed scans
* Returns 404 for not-found scans
* Returns 400 for in-progress scans
* Content-Disposition header triggers download

Dependencies:
* Steps 6.1-6.3 (template, generator, PDF generator)
* Step 2.6 (store)

### Step 6.5: Add PDF download button to ReportView

Add a download button to the ReportView component that calls the PDF endpoint.

Files:
* `src/components/ReportView.tsx` — Add download button (modify existing)

Implementation approach:
* Add "Download PDF Report" button at top of report
* On click: `window.open('/api/scan/[id]/pdf')` or `fetch` + blob download
* Loading state while PDF generates

Success criteria:
* Button triggers PDF download
* Loading indicator during generation
* Downloaded file has descriptive filename

Dependencies:
* Step 6.4 (PDF route)

## Implementation Phase 7: Validation

<!-- parallelizable: false -->

### Step 7.1: Run full project validation

Execute all validation commands for the project:
* `npm run lint` — ESLint + Next.js lint
* `npm run build` — TypeScript compilation + Next.js production build
* `npx playwright install chromium` — Verify browser binary

### Step 7.2: Run end-to-end manual test

Test the complete scan flow:
1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Enter URL: `https://www.ontario.ca/page/government-ontario`
4. Verify progress bar updates (SSE)
5. Verify results page displays with score gauge and POUR breakdown
6. Verify violations are listed with impact levels and remediation links
7. Click "Download PDF" and verify the PDF opens/downloads correctly
8. Test error cases: invalid URL, unreachable URL, empty input

### Step 7.3: Fix minor validation issues

Iterate on lint errors, build warnings, and visual/functional issues found during testing. Apply fixes directly when corrections are straightforward and isolated.

### Step 7.4: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files
* Provide the user with next steps
* Recommend additional research and planning rather than inline fixes
* Avoid large-scale refactoring within this phase

## Dependencies

* Node.js 20+ (LTS)
* npm (bundled with Node.js)
* Next.js 15 (App Router with React 19)
* TypeScript 5+
* @axe-core/playwright + Playwright (Chromium)
* Puppeteer (PDF generation)
* Tailwind CSS v4

## Success Criteria

* All phases complete with build and lint passing
* End-to-end scan flow works for public URLs
* Score calculation matches the weighted formula from research
* POUR principle grouping displays correctly
* PDF report downloads with all sections populated
* AODA compliance note is accurate
* Application is itself accessible (keyboard navigable, proper ARIA, skip links)
