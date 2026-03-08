'use client';

import { useEffect, useState } from 'react';

interface ScanProgressProps {
  scanId: string;
  onComplete: () => void;
  onError: (message: string) => void;
}

export default function ScanProgress({ scanId, onComplete, onError }: ScanProgressProps) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing scan...');
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    const eventSource = new EventSource(`/api/scan/${scanId}/status`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
      setMessage(data.message);
      setStatus(data.status);

      if (data.status === 'complete') {
        eventSource.close();
        onComplete();
      } else if (data.status === 'error') {
        eventSource.close();
        onError(data.message);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError('Connection to scan lost. Please refresh the page.');
    };

    return () => {
      eventSource.close();
    };
  }, [scanId, onComplete, onError]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Scanning in Progress</h2>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Scan progress"
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-3 overflow-hidden"
      >
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div aria-live="polite" className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{message}</span>
        <span>{progress}%</span>
      </div>
      <ol className="mt-4 flex gap-2 text-xs text-gray-600 dark:text-gray-400 list-none p-0 m-0" aria-label="Scan stages">
        {['Pending', 'Navigating', 'Scanning', 'Scoring', 'Complete'].map((stage) => (
          <li
            key={stage}
            aria-current={stage.toLowerCase() === status ? 'step' : undefined}
            className={`px-2 py-1 rounded ${
              stage.toLowerCase() === status
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            {stage}
          </li>
        ))}
      </ol>
    </div>
  );
}
