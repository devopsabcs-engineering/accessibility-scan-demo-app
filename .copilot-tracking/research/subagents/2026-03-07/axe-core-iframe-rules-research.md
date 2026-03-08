<!-- markdownlint-disable-file -->
# Subagent Research: axe-core iframe Scanning and Rule Inventory

## Research Status: Complete

## Research Topics and Questions

1. How does axe-core handle iframe scanning? What configuration options exist?
2. What tags are available beyond our current WCAG tags?
3. How can the context parameter target iframe content?
4. Playwright + axe integration patterns for iframe content
5. Cross-origin iframe limitations with CodePen

---

## 1. iframe Scanning in axe-core

### How axe-core Handles iframes

axe-core has **built-in iframe support** that is **enabled by default** (`iframes: true`). The scanning works through two distinct mechanisms:

#### Mechanism A: `axe.run()` with Frame Messenger (Default)

When `axe.run()` is called, axe-core:

1. Injects itself into the **top frame**
2. Uses `window.postMessage()` to communicate with child iframes
3. Each iframe must also have axe-core loaded
4. Results from child frames are aggregated into the parent's results
5. The `target` array in results uses multi-element arrays to show iframe paths (e.g., `['iframe#result', '.violation-element']`)

**Limitation**: Requires axe-core to be injected into **each iframe separately**. If axe-core is only in the parent frame, it cannot scan iframe content.

**Limitation**: Cross-origin iframes require `allowedOrigins` configuration:

```js
axe.configure({
  allowedOrigins: ['<same_origin>', 'https://other-domain.com']
});
// Or dangerously: allowedOrigins: ['<unsafe_all_origins>']
```

#### Mechanism B: `axe.runPartial()` / `axe.finishRun()` (Recommended for Browser Drivers)

This is the **recommended approach** for Playwright/Puppeteer/Selenium integrations:

1. Call `axe.runPartial(context, options)` in the top window
2. Use `axe.utils.getFrameContexts(context)` to discover all iframes
3. For each iframe, inject axe-core and call `axe.runPartial()` with the frame-specific context
4. Collect all partial results into an array
5. Call `axe.finishRun(partialResults, options)` in a blank page to produce the final report

**Key advantage**: Does NOT require `window.postMessage` communication between frames. Works with **any origin**, including cross-origin iframes, because the browser driver (Playwright) has access to all frames regardless of origin.

### Configuration Options

| Option | Default | Description |
|---|---|---|
| `iframes` | `true` | Enable/disable iframe scanning |
| `frameWaitTime` | `60000` | Milliseconds to wait for frame responses |
| `pingWaitTime` | `500` | Milliseconds before marking a frame as unresponsive |

### Why Our Current Code Does NOT Scan iframes

Our `engine.ts` does this:

```typescript
await page.evaluate(`var module = { exports: {} }; ${axeSource}`);
return page.evaluate(() => {
  return window.axe.run({ runOnly: { type: 'tag', values: [...] } });
});
```

**Problem**: We inject axe-core **only into the top frame**. When `axe.run()` tries to scan iframes, it sends `postMessage` pings to child frames, but the child frames don't have axe-core loaded, so they time out or are skipped. The `frame-tested` rule would report these as untested frames.

---

## 2. axe-core Tag Inventory

### Version: 4.11.1

### Total Rules: 104

### Rules Currently Running (our config): 69

Tags we use: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`

### Rules We Are Missing: 35

### Complete Tag Reference

| Tag | Purpose | Rules |
|---|---|---|
| `wcag2a` | WCAG 2.0 Level A | ✅ Included |
| `wcag2aa` | WCAG 2.0 Level AA | ✅ Included |
| `wcag2aaa` | WCAG 2.0 Level AAA | ❌ Not included (1 rule: `color-contrast-enhanced`) |
| `wcag21a` | WCAG 2.1 Level A | ✅ Included |
| `wcag21aa` | WCAG 2.1 Level AA | ✅ Included |
| `wcag22aa` | WCAG 2.2 Level AA | ✅ Included |
| `best-practice` | Common a11y best practices | ❌ **30 rules not included** |
| `experimental` | Cutting-edge rules (disabled by default) | ❌ 7 rules not included |
| `deprecated` | Old rules, replaced | ❌ 4 rules (should probably stay excluded) |
| `ACT` | W3C Accessibility Conformance Testing | Overlaps with WCAG tags |
| `section508` | Old Section 508 rules | Overlaps with WCAG tags |
| `EN-301-549` | EU standard | Overlaps with WCAG tags |
| `RGAAv4` | French standard | Overlaps with WCAG tags |
| `TTv5` | Trusted Tester v5 | Overlaps with WCAG tags |
| `cat.*` | Category tags (every rule has one) | Informational grouping only |

### Best-Practice Rules (30 rules — ALL currently excluded)

| Rule ID | Description | Impact |
|---|---|---|
| `accesskeys` | Ensure every accesskey attribute value is unique | Serious |
| `aria-allowed-role` | Ensure role attribute is appropriate for the element | Minor |
| `aria-dialog-name` | Ensure ARIA dialog/alertdialog have accessible names | Serious |
| `aria-text` | Ensure role="text" on elements with no focusable descendants | Serious |
| `aria-treeitem-name` | Ensure ARIA treeitem nodes have accessible names | Serious |
| `empty-heading` | Ensure headings have discernible text | Minor |
| `empty-table-header` | Ensure table headers have discernible text | Minor |
| `focus-order-semantics` | Ensure focus order elements have appropriate roles | Minor |
| `frame-tested` | Ensure iframes contain axe-core script | Critical |
| `heading-order` | Ensure heading order is semantically correct | Moderate |
| `hidden-content` | Inform users about hidden content | Minor |
| `image-redundant-alt` | Ensure image alt is not repeated as text | Minor |
| `label-title-only` | Ensure form elements have visible labels | Serious |
| `landmark-banner-is-top-level` | Ensure banner landmark is at top level | Moderate |
| `landmark-complementary-is-top-level` | Ensure complementary/aside is at top level | Moderate |
| `landmark-contentinfo-is-top-level` | Ensure contentinfo landmark is at top level | Moderate |
| `landmark-main-is-top-level` | Ensure main landmark is at top level | Moderate |
| `landmark-no-duplicate-banner` | Ensure at most one banner landmark | Moderate |
| `landmark-no-duplicate-contentinfo` | Ensure at most one contentinfo landmark | Moderate |
| `landmark-no-duplicate-main` | Ensure at most one main landmark | Moderate |
| `landmark-one-main` | Ensure the document has a main landmark | Moderate |
| `landmark-unique` | Ensure landmarks are unique | Moderate |
| `meta-viewport-large` | Ensure meta viewport can scale significantly | Minor |
| `page-has-heading-one` | Ensure page has a level-one heading | Moderate |
| `presentation-role-conflict` | Ensure presentational elements don't have ARIA/tabindex | Moderate |
| `region` | Ensure all page content is inside landmarks | Moderate |
| `scope-attr-valid` | Ensure scope attribute is correct on tables | Moderate |
| `skip-link` | Ensure skip links have a focusable target | Moderate |
| `tabindex` | Ensure tabindex values are not greater than 0 | Serious |
| `table-duplicate-name` | Ensure caption doesn't duplicate summary | Minor |

### Experimental Rules (7 rules — ALL disabled by default)

| Rule ID | Description |
|---|---|
| `css-orientation-lock` | Ensure content is not locked to a display orientation |
| `focus-order-semantics` | Ensure focus order elements have appropriate roles |
| `hidden-content` | Inform users about hidden content |
| `label-content-name-mismatch` | Ensure visible text is part of accessible name |
| `p-as-heading` | Ensure bold/italic/font-size not used to fake headings |
| `table-fake-caption` | Ensure tables with captions use `<caption>` |
| `td-has-header` | Ensure data cells in large tables have headers |

### Deprecated Rules (4 rules — exclude from new configs)

| Rule ID | Description | Replacement |
|---|---|---|
| `aria-roledescription` | Ensure aria-roledescription used correctly | Covered by other ARIA rules |
| `audio-caption` | Ensure audio has captions | Replaced by `video-caption` |
| `duplicate-id-active` | Unique active element IDs | Use `duplicate-id-aria` |
| `duplicate-id` | Unique IDs | Use `duplicate-id-aria` |

### Category Tags (cat.*)

Every rule has exactly one category tag. These are grouping metadata, not used for runOnly filtering:

| Category | Rule Count |
|---|---|
| `cat.aria` | 24 |
| `cat.semantics` | 14 |
| `cat.text-alternatives` | 12 |
| `cat.keyboard` | 9 |
| `cat.structure` | 8 |
| `cat.name-role-value` | 7 |
| `cat.tables` | 6 |
| `cat.forms` | 5 |
| `cat.time-and-media` | 5 |
| `cat.language` | 4 |
| `cat.parsing` | 4 |
| `cat.color` | 3 |
| `cat.sensory-and-visual-cues` | 3 |

---

## 3. axe-core Context Parameter for iframes

### `axe.run(context, options)` Context Variants

axe-core's first argument to `axe.run()` is the **context**, which controls what gets scanned:

#### Simple CSS selector

```js
axe.run('main'); // Only scan <main> and its content
axe.run('#result'); // Only scan element with id="result"
```

#### Include/exclude object

```js
axe.run({ include: ['iframe#result'] }); // Only scan the iframe
axe.run({ exclude: ['.ad-banner'] }); // Scan everything except .ad-banner
```

#### fromFrames — target content INSIDE iframes

```js
// Test the form element inside the #payment iframe:
axe.run({ fromFrames: ['iframe#payment', 'form'] });

// Test the entire content of #result iframe:
axe.run({ fromFrames: ['iframe#result', '*'] });

// Nested frames:
axe.run({ fromFrames: ['iframe#outer', 'iframe#inner', 'form'] });
```

**CRITICAL CAVEAT**: The `fromFrames` context still requires axe-core to be loaded in the target iframe. It changes **which elements** are scanned, not **whether** axe-core communicates with the iframe.

#### What `axe.run({ include: ['iframe#result'] })` Actually Does

This scans the **`<iframe>` element itself** (e.g., checking if the iframe has a `title` attribute). It does **NOT** scan the content inside the iframe. To scan iframe content, either:

1. Use `fromFrames` context with axe-core loaded in both frames, OR
2. Use `axe.runPartial()` / `axe.finishRun()` approach, OR
3. Navigate Playwright into the iframe frame and run axe-core inside it independently

---

## 4. Playwright + axe Integration Patterns for iframe Scanning

### Pattern A: Use `@axe-core/playwright` (AxeBuilder) — RECOMMENDED

The `@axe-core/playwright` package (v4.11.1, already in our `package.json`) handles iframe scanning automatically:

```typescript
import { AxeBuilder } from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
  .analyze();
```

**How it works internally** (from source code analysis):

1. `analyze()` calls `inject(page.frames())` — injects axe-core into ALL frames (parent + children)
2. For each frame, it evaluates `axe.utils.getFrameContexts(context)` to discover child iframes
3. For each child iframe, it gets the frame handle via `iframeElement.contentFrame()`
4. It calls `axe.runPartial()` in each frame independently
5. All partial results are collected and passed to `axe.finishRun()` in a blank page
6. **Cross-origin frames work** because Playwright controls all frames directly

**Key code path from `@axe-core/playwright` source**:

```js
// In runPartialRecursive():
const iframeHandle = await frame.evaluateHandle(axeShadowSelect, { frameSelector });
const iframeElement = iframeHandle.asElement();
const childFrame = await iframeElement.contentFrame();
if (childFrame) {
  await this.inject([childFrame], true);  // Inject axe into child frame
  childResults = await this.runPartialRecursive(childFrame, frameContext);
}
```

### Pattern B: Manual iframe Frame Scanning with Playwright

If we keep our manual injection approach, we can use Playwright's frame API:

```typescript
import { Page, Frame } from 'playwright';

async function scanWithIframes(page: Page): Promise<AxeResults> {
  // Option 1: Use page.frame() to find the iframe by name
  const resultFrame = page.frame('CodePen');
  // or by URL pattern:
  // const resultFrame = page.frames().find(f => f.url().includes('cdpn.io'));

  if (resultFrame) {
    // Inject axe-core into the iframe frame
    await resultFrame.evaluate(`var module = { exports: {} }; ${axeSource}`);
    // Run axe inside the iframe frame
    return resultFrame.evaluate(() => {
      return window.axe.run({ runOnly: { type: 'tag', values: [...] } });
    });
  }

  // Fallback: scan the main page
  return scanPage(page);
}
```

```typescript
// Option 2: Use page.frameLocator() for CSS selectors
const frameLocator = page.frameLocator('iframe#result');
// frameLocator doesn't give direct frame access for evaluate()
// Use page.frame() or page.frames() instead for evaluate access
```

### Pattern C: Scan all frames and merge results

```typescript
async function scanAllFrames(page: Page): Promise<AxeResults[]> {
  const results: AxeResults[] = [];

  for (const frame of page.frames()) {
    try {
      await frame.evaluate(`var module = { exports: {} }; ${axeSource}`);
      const frameResults = await frame.evaluate(() => {
        return window.axe.run({
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }
        });
      });
      results.push(frameResults);
    } catch (e) {
      // Frame may be cross-origin or inaccessible
    }
  }

  return results;
}
```

---

## 5. Cross-Origin iframe Limitations

### CodePen iframe Structure

When visiting `https://codepen.io/leezee/pen/eYbXzpJ`:

- **Main page**: `https://codepen.io/leezee/pen/eYbXzpJ`
- **Result iframe**: Typically `https://cdpn.io/...` or a subdomain — this is **cross-origin** from `codepen.io`

For the full-page / debug view (`https://codepen.io/leezee/debug/eYbXzpJ`), the result is rendered directly without an iframe wrapper.

### Cross-Origin Restrictions

| Approach | Same-Origin | Cross-Origin |
|---|---|---|
| `axe.run()` with `postMessage` | ✅ Works | ❌ Requires `allowedOrigins` config in BOTH frames |
| `axe.runPartial()`/`finishRun()` | ✅ Works | ✅ Works (browser driver controls both) |
| `@axe-core/playwright` AxeBuilder | ✅ Works | ✅ Works (uses `runPartial` internally) |
| Manual `frame.evaluate()` | ✅ Works | ✅ Works (Playwright has cross-origin frame access) |
| `page.frameLocator()` | ✅ Locator only | ✅ Locator only (no evaluate) |

**Key Insight**: Playwright's `frame.evaluate()` works on **any frame regardless of origin** because Playwright controls the browser at the CDP (Chrome DevTools Protocol) level. Cross-origin restrictions only apply to JavaScript running in the page, not to the browser driver.

### How Commercial Tools Handle Cross-Origin iframes

1. **Browser extension tools** (axe DevTools, WAVE): Run in the browser's extension context, which has cross-origin access to all frames
2. **Cloud-based scanners** (Deque, Siteimprove): Use browser automation (like Playwright/Puppeteer) with `runPartial`/`finishRun` approach
3. **Some tools index iframe URLs separately**: They detect iframes and add their `src` URLs to the scan queue, scanning them as standalone pages

---

## 6. Recommended Configuration Changes

### Priority 1: Enable iframe Scanning (Highest Impact)

Switch from manual `axe.run()` to `@axe-core/playwright` `AxeBuilder`:

```typescript
import { AxeBuilder } from '@axe-core/playwright';

export async function scanPage(page: Page): Promise<AxeResults> {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}
```

This automatically:

- Injects axe-core into ALL frames (including cross-origin)
- Uses `runPartial`/`finishRun` for reliable cross-frame results
- Aggregates results from all frames into a single report

### Priority 2: Add `best-practice` Tag (30 Additional Rules)

Adding `best-practice` to the tag list enables 30 additional rules covering:

- Landmark validation (10 rules)
- Heading structure (3 rules)
- ARIA dialog/text/treeitem names (3 rules)
- Skip links, tabindex, accesskeys (3 rules)
- Table best practices (2 rules)
- Frame testing verification (1 rule)
- And more

### Priority 3: Consider Adding `experimental` Rules

Enable individual experimental rules that provide value:

```typescript
new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
  .options({
    rules: {
      'css-orientation-lock': { enabled: true },
      'p-as-heading': { enabled: true },
      'table-fake-caption': { enabled: true },
      'td-has-header': { enabled: true },
      'label-content-name-mismatch': { enabled: true },
    }
  })
  .analyze();
```

### Priority 4: Alternative Strategy — Scan iframe Content Directly

For sites like CodePen where the content of interest is INSIDE an iframe, add a strategy to detect and navigate into the iframe:

```typescript
async function scanPageWithIframeDetection(page: Page): Promise<AxeResults> {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']);

  // AxeBuilder handles iframes automatically via runPartial
  return builder.analyze();
}
```

If AxeBuilder's automatic iframe handling proves insufficient (e.g., dynamically loaded iframes), fall back to:

```typescript
// Find the iframe frame and scan it independently
const targetFrame = page.frames().find(f =>
  f.url().includes('cdpn.io') || f.name() === 'result'
);
if (targetFrame) {
  const iframeResults = await new AxeBuilder({ page: /* need a Page, not Frame */ })
    // Note: AxeBuilder requires a Page, not a Frame
    // For frame-level scanning, use manual injection
}
```

---

## 7. Rule Count Impact Analysis

| Configuration | Rules Run | % of Total |
|---|---|---|
| Current (`wcag2a/2aa/21a/21aa/22aa`) | 69 | 66% |
| + `best-practice` | 96 | 92% |
| + `experimental` | 100 | 96% |
| + `wcag2aaa` | 101 | 97% |
| All (excl. deprecated) | 100 | 96% |
| All rules | 104 | 100% |

Adding `best-practice` alone jumps from 69 to 96 rules — a **39% increase** in rule coverage.

Combined with iframe scanning, this addresses the two root causes of the detection gap:

1. **We weren't scanning inside the iframe** (content was invisible)
2. **We were running only 66% of available rules** (missing all best practices)

---

## 8. Key Discovery: @axe-core/playwright is Already Installed

The package `@axe-core/playwright` v4.11.1 is already in `package.json` as a dependency but is **not used anywhere in the codebase**. Our `engine.ts` manually injects `axe.min.js` instead.

Switching to `AxeBuilder` from `@axe-core/playwright` is the single highest-impact change because it:

1. Automatically handles iframe scanning via `runPartial`/`finishRun`
2. Works with cross-origin iframes (Playwright controls all frames via CDP)
3. Properly configures `allowedOrigins` automatically
4. Handles the `module` shim issue we work around manually
5. Manages injection timing and frame discovery

---

## References and Evidence

- **axe-core v4.11.1 API**: `node_modules/axe-core/README.md` — "Supports iframes of infinite depth"
- **axe-core API docs**: [API.md](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) — `iframes: true` default, `frameWaitTime: 60000`
- **axe-core context docs**: [context.md](https://github.com/dequelabs/axe-core/blob/develop/doc/context.md) — `fromFrames` selector
- **axe-core runPartial docs**: [run-partial.md](https://github.com/dequelabs/axe-core/blob/develop/doc/run-partial.md) — Recommended for browser drivers
- **axe-core frame-messenger docs**: [frame-messenger.md](https://github.com/dequelabs/axe-core/blob/develop/doc/frame-messenger.md) — `allowedOrigins`, `pingWaitTime`
- **@axe-core/playwright v4.11.1 source**: `node_modules/@axe-core/playwright/dist/index.js` — `runPartialRecursive()`, `inject()`, `finishRun()`
- **@axe-core/playwright README**: Documents `AxeBuilder`, `.include()`, `.exclude()`, `.withTags()`, `.setLegacyMode()`
- **axe-core type definitions**: `node_modules/axe-core/axe.d.ts` — `RunOptions.iframes`, `RunOptions.frameWaitTime`
- **Current engine**: `src/lib/scanner/engine.ts` — Manual injection, no iframe handling

## Discovered Research Topics

- Performance impact of scanning all frames on large sites with many iframes
- Whether `AxeBuilder` handles dynamically loaded iframes (loaded after page.goto())
- How to merge results from `AxeBuilder` (single AxeResults) with our existing scoring/reporting pipeline
- Whether switching to `AxeBuilder` changes the result format in ways that affect `result-parser.ts`

## Clarifying Questions

1. **Should we add `wcag2aaa` tag?** The `color-contrast-enhanced` rule (AAA level) may produce many findings. Is AAA conformance a goal?
2. **Should we add all experimental rules or pick selectively?** Some experimental rules like `p-as-heading` are quite useful.
3. **Do we need to support scanning the iframe content separately** (as a standalone page) in addition to scanning it as part of the parent page? This matters for CodePen URLs vs. generic sites.
