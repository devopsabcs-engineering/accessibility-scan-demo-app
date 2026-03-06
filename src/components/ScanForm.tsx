'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanForm() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a URL.');
      return;
    }

    try {
      new URL(url.trim());
    } catch {
      setError('Please enter a valid URL (e.g., https://www.example.com).');
      return;
    }

    if (!/^https?:\/\//i.test(url.trim())) {
      setError('Only HTTP and HTTPS URLs are supported.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to start scan.');
        return;
      }

      const { scanId } = await res.json();
      router.push(`/scan/${scanId}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col gap-3">
        <label htmlFor="scan-url" className="text-lg font-medium">
          Website URL
        </label>
        <p id="scan-url-help" className="text-sm text-gray-600 dark:text-gray-400">
          Enter the full URL of the page you want to scan for accessibility issues.
        </p>
        <div className="flex gap-2">
          <input
            id="scan-url"
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.ontario.ca"
            aria-describedby="scan-url-help"
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? 'Starting...' : 'Scan'}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-red-600 dark:text-red-400 text-sm">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
