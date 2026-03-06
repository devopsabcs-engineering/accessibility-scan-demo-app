import type { ScanRecord } from '../types/scan';

const scans = new Map<string, ScanRecord>();

export function createScan(id: string, url: string): ScanRecord {
  const record: ScanRecord = {
    id,
    url,
    status: 'pending',
    progress: 0,
    message: 'Scan queued',
    startedAt: new Date().toISOString(),
  };
  scans.set(id, record);
  return record;
}

export function getScan(id: string): ScanRecord | undefined {
  return scans.get(id);
}

export function updateScan(id: string, updates: Partial<ScanRecord>): void {
  const scan = scans.get(id);
  if (scan) {
    Object.assign(scan, updates);
  }
}
