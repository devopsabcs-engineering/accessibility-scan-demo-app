import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('a11y-scanner');
const meter = metrics.getMeter('a11y-scanner');

const scanDuration = meter.createHistogram('scan.duration_ms', {
  description: 'Duration of a single-page scan in milliseconds',
  unit: 'ms',
});

const scanCounter = meter.createCounter('scan.total', {
  description: 'Total number of scans initiated',
});

const scanErrorCounter = meter.createCounter('scan.errors', {
  description: 'Total number of scan errors',
});

const crawlDuration = meter.createHistogram('crawl.duration_ms', {
  description: 'Duration of a site crawl in milliseconds',
  unit: 'ms',
});

const crawlCounter = meter.createCounter('crawl.total', {
  description: 'Total number of crawls initiated',
});

const crawlErrorCounter = meter.createCounter('crawl.errors', {
  description: 'Total number of crawl errors',
});

const crawlPagesScanned = meter.createHistogram('crawl.pages_scanned', {
  description: 'Number of pages scanned per crawl',
});

export function trackScanStart(scanId: string, url: string) {
  scanCounter.add(1, { url: new URL(url).hostname });
  return tracer.startSpan('scan', {
    attributes: { 'scan.id': scanId, 'scan.url': url },
  });
}

export function trackScanComplete(
  span: ReturnType<typeof tracer.startSpan>,
  scanId: string,
  url: string,
  durationMs: number,
  score: number,
  violationCount: number,
) {
  scanDuration.record(durationMs, { url: new URL(url).hostname });
  span.setAttributes({
    'scan.duration_ms': durationMs,
    'scan.score': score,
    'scan.violation_count': violationCount,
  });
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export function trackScanError(
  span: ReturnType<typeof tracer.startSpan>,
  scanId: string,
  url: string,
  error: string,
) {
  scanErrorCounter.add(1, { url: new URL(url).hostname });
  span.setStatus({ code: SpanStatusCode.ERROR, message: error });
  span.recordException(new Error(error));
  span.end();
}

export function trackCrawlStart(crawlId: string, url: string) {
  crawlCounter.add(1, { url: new URL(url).hostname });
  return tracer.startSpan('crawl', {
    attributes: { 'crawl.id': crawlId, 'crawl.url': url },
  });
}

export function trackCrawlComplete(
  span: ReturnType<typeof tracer.startSpan>,
  crawlId: string,
  url: string,
  durationMs: number,
  pagesScanned: number,
  pagesFailed: number,
) {
  crawlDuration.record(durationMs, { url: new URL(url).hostname });
  crawlPagesScanned.record(pagesScanned, { url: new URL(url).hostname });
  span.setAttributes({
    'crawl.duration_ms': durationMs,
    'crawl.pages_scanned': pagesScanned,
    'crawl.pages_failed': pagesFailed,
  });
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export function trackCrawlError(
  span: ReturnType<typeof tracer.startSpan>,
  crawlId: string,
  url: string,
  error: string,
) {
  crawlErrorCounter.add(1, { url: new URL(url).hostname });
  span.setStatus({ code: SpanStatusCode.ERROR, message: error });
  span.recordException(new Error(error));
  span.end();
}
