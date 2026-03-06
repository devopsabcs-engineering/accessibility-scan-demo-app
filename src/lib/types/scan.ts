import type { ScoreResult } from './score';

export type ScanStatus = 'pending' | 'navigating' | 'scanning' | 'scoring' | 'complete' | 'error';

export interface ScanRequest {
  url: string;
}

export interface ScanRecord {
  id: string;
  url: string;
  status: ScanStatus;
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  results?: ScanResults;
  error?: string;
}

export interface ScanResults {
  url: string;
  timestamp: string;
  engineVersion: string;
  violations: AxeViolation[];
  passes: AxePass[];
  incomplete: AxeIncomplete[];
  inapplicable: AxeInapplicable[];
  score: ScoreResult;
}

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
  principle?: string;
}

export interface AxeNode {
  html: string;
  target: string[];
  impact: string;
  failureSummary?: string;
}

export interface AxePass {
  id: string;
  tags: string[];
  description: string;
  nodes: { html: string; target: string[] }[];
}

export interface AxeIncomplete {
  id: string;
  impact: string | null;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

export interface AxeInapplicable {
  id: string;
  tags: string[];
  description: string;
}

// Re-export score types for convenience
export type { ScoreResult, ScoreGrade, PrincipleScores, PrincipleScore, ImpactBreakdown } from './score';
