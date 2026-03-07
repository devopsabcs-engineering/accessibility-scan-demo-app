import type { AxeViolation } from '../../types/scan';
import { generateSarif } from '../../report/sarif-generator';

export function formatSarif(url: string, violations: AxeViolation[], toolVersion: string): string {
  const sarifLog = generateSarif(url, violations, toolVersion);
  return JSON.stringify(sarifLog, null, 2);
}
