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
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Enter a URL to scan for WCAG 2.2 Level AA accessibility compliance.
          </p>
        </div>

        {/* Scan Form */}
        <ScanForm />

        {/* How It Works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center space-y-2">
            <div className="text-2xl">1</div>
            <h2 className="font-medium">Enter URL</h2>
            <p className="text-sm text-gray-500">Provide the web page address you want to test.</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-2xl">2</div>
            <h2 className="font-medium">Automated Scan</h2>
            <p className="text-sm text-gray-500">We use axe-core + Playwright to test against WCAG 2.2 AA criteria.</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-2xl">3</div>
            <h2 className="font-medium">Get Report</h2>
            <p className="text-sm text-gray-500">View your score, violations, and download a PDF report.</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-4">
          Powered by axe-core and Playwright. Open-source accessibility testing for AODA compliance.
        </p>
      </div>
    </div>
  );
}
