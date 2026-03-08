import ScanForm from '@/components/ScanForm';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold">
            AODA WCAG 2.2 Accessibility Scanner
          </h1>
          <p className="text-gray-600 text-lg">
            Scan a single page or crawl an entire site for WCAG 2.2 Level AA accessibility compliance.
          </p>
        </div>

        {/* Scan Form */}
        <ScanForm />

        {/* How It Works */}
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-gray-200 dark:border-gray-700 list-none p-0 m-0">
          <li className="text-center space-y-2">
            <div className="text-2xl" aria-hidden="true">1</div>
            <h2 className="font-medium">Enter URL</h2>
            <p className="text-sm text-gray-600">Provide the web page address you want to test.</p>
          </li>
          <li className="text-center space-y-2">
            <div className="text-2xl" aria-hidden="true">2</div>
            <h2 className="font-medium">Automated Scan</h2>
            <p className="text-sm text-gray-600">We use axe-core + Playwright to test against WCAG 2.2 AA criteria.</p>
          </li>
          <li className="text-center space-y-2">
            <div className="text-2xl" aria-hidden="true">3</div>
            <h2 className="font-medium">Get Report</h2>
            <p className="text-sm text-gray-600">View your score, violations, and download a PDF report.</p>
          </li>
        </ol>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 pt-4">
          Powered by axe-core and Playwright. Open-source accessibility testing for AODA compliance.
        </p>
      </div>
    </div>
  );
}
