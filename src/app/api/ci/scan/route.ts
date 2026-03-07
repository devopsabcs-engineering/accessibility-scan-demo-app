import { NextRequest, NextResponse } from 'next/server';
import { scanUrl } from '@/lib/scanner/engine';
import { parseAxeResults } from '@/lib/scanner/result-parser';
import { evaluateThreshold, getDefaultThreshold } from '@/lib/ci/threshold';
import { formatSarif } from '@/lib/ci/formatters/sarif';
import { formatJunit } from '@/lib/ci/formatters/junit';
import type { CiScanRequest, CiResult, CiViolationSummary } from '@/lib/types/crawl';

function isValidScanUrl(input: string): boolean {
  if (!input || typeof input !== 'string' || input.length > 2048) return false;

  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname;

  // Block private/internal IPs (SSRF prevention)
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fd') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  let body: CiScanRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  if (!isValidScanUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL. Only public HTTP/HTTPS URLs are allowed.' }, { status: 400 });
  }

  try {
    // Synchronous scan — blocks until complete
    const rawResults = await scanUrl(url.trim());
    const results = parseAxeResults(url.trim(), rawResults);

    // Threshold evaluation
    const thresholdConfig = body.threshold ?? getDefaultThreshold();
    const thresholdEvaluation = evaluateThreshold(
      results.score.overallScore,
      results.violations,
      thresholdConfig
    );

    // Build violation summaries
    const violations: CiViolationSummary[] = results.violations.map((v) => ({
      ruleId: v.id,
      impact: v.impact,
      description: v.description,
      instanceCount: v.nodes.length,
      helpUrl: v.helpUrl,
    }));

    const ciResult: CiResult = {
      passed: thresholdEvaluation.scorePassed && thresholdEvaluation.countPassed && thresholdEvaluation.rulePassed,
      score: results.score.overallScore,
      grade: results.score.grade,
      url: url.trim(),
      timestamp: new Date().toISOString(),
      violationCount: results.violations.length,
      thresholdEvaluation,
      violations,
    };

    // Format response
    const format = body.format ?? 'json';

    if (format === 'sarif') {
      const sarifOutput = formatSarif(url.trim(), results.violations, results.engineVersion);
      return new NextResponse(sarifOutput, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (format === 'junit') {
      const junitOutput = formatJunit(ciResult);
      return new NextResponse(junitOutput, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    return NextResponse.json(ciResult);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
