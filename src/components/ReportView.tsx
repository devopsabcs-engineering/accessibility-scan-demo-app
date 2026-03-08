import type { ScanResults } from '@/lib/types/scan';
import ScoreDisplay from './ScoreDisplay';
import ViolationList from './ViolationList';
import Link from 'next/link';

interface ReportViewProps {
  results: ScanResults;
  scanId: string;
}

export default function ReportView({ results, scanId }: ReportViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="text-2xl font-bold">WCAG 2.2 Level AA Accessibility Report</h1>
        <p className="text-gray-600">
          <a href={results.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            {results.url}
          </a>
        </p>
        <p className="text-sm text-gray-600">
          Scanned on {new Date(results.timestamp).toLocaleString()} · Engine: {results.engineVersion}
        </p>
        <p className="text-sm text-gray-600">
          {results.score.totalViolations} violations across {results.score.totalElementViolations} elements
        </p>
      </header>

      {/* PDF Download */}
      <div className="flex justify-center gap-3">
        <a
          href={`/api/scan/${scanId}/pdf`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-medium"
          download
        >
          Download PDF Report
        </a>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          Scan Another URL
        </Link>
      </div>

      {/* Executive Summary */}
      <section aria-labelledby="score-heading">
        <h2 id="score-heading" className="text-xl font-semibold mb-4">Executive Summary</h2>
        <ScoreDisplay score={results.score} />
      </section>

      {/* Issue Summary Table */}
      <section aria-labelledby="issues-heading">
        <h2 id="issues-heading" className="text-xl font-semibold mb-4">Issue Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th scope="col" className="text-left py-2 px-3 font-medium">Impact Level</th>
                <th scope="col" className="text-right py-2 px-3 font-medium">Failed</th>
                <th scope="col" className="text-right py-2 px-3 font-medium">Passed</th>
              </tr>
            </thead>
            <tbody>
              {(['critical', 'serious', 'moderate', 'minor'] as const).map((impact) => (
                <tr key={impact} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3 capitalize">{impact}</td>
                  <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">{results.score.impactBreakdown[impact].failed}</td>
                  <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">{results.score.impactBreakdown[impact].passed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed Violations */}
      <section aria-labelledby="violations-heading">
        <h2 id="violations-heading" className="sr-only">Detailed Violations</h2>
        <ViolationList violations={results.violations} />
      </section>

      {/* Passes Section */}
      {results.passes.length > 0 && (
        <section aria-labelledby="passes-heading">
          <details>
            <summary className="text-xl font-semibold cursor-pointer hover:text-blue-600">
              <span id="passes-heading">Passed Rules ({results.passes.length})</span>
            </summary>
            <ul className="mt-3 space-y-1">
              {results.passes.map((p) => (
                <li key={p.id} className="text-sm text-gray-600 py-1">
                  <span className="text-green-500 mr-2" aria-hidden="true">✓</span>
                  {p.description}
                  <span className="text-xs text-gray-600 ml-2">({p.id})</span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {/* Incomplete / Manual Review */}
      {results.incomplete.length > 0 && (
        <section aria-labelledby="incomplete-heading">
          <details>
            <summary className="text-xl font-semibold cursor-pointer hover:text-blue-600">
              <span id="incomplete-heading">Needs Manual Review ({results.incomplete.length})</span>
            </summary>
            <ul className="mt-3 space-y-1">
              {results.incomplete.map((item) => (
                <li key={item.id} className="text-sm text-gray-600 py-1">
                  <span className="text-yellow-500 mr-2" aria-hidden="true">?</span>
                  {item.description}
                  <a href={item.helpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-2 text-xs">
                    Learn more
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {/* AODA Compliance Note */}
      <section aria-labelledby="aoda-heading" className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h2 id="aoda-heading" className="text-lg font-semibold mb-2">AODA Compliance Note</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          The Accessibility for Ontarians with Disabilities Act (AODA) requires compliance with WCAG 2.0 Level AA
          under the Integrated Accessibility Standards Regulation (IASR). WCAG 2.2 Level AA is a superset of
          WCAG 2.0 Level AA — a website that passes WCAG 2.2 AA also satisfies the AODA requirement.
          This scan tests against WCAG 2.2 Level AA criteria.
        </p>
      </section>

      {/* Disclaimer */}
      <footer className="text-xs text-gray-600 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p>
          <strong>Disclaimer:</strong> Automated accessibility testing can detect approximately 30-57% of WCAG failures.
          This report should be supplemented with manual testing, assisted technology testing, and expert review
          for comprehensive accessibility assessment. Scan results are point-in-time and may not reflect
          dynamic content changes.
        </p>
      </footer>
    </div>
  );
}
