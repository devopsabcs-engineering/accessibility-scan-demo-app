import type { ReportData } from '../../types/report';
import type { AxeNode } from '../../types/scan';

const impactColors: Record<string, string> = {
  critical: '#dc2626',
  serious: '#ea580c',
  moderate: '#ca8a04',
  minor: '#2563eb',
};

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#22c55e';
    case 'B': return '#84cc16';
    case 'C': return '#eab308';
    case 'D': return '#f97316';
    case 'F': return '#ef4444';
    default: return '#6b7280';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const categoryLabels: Record<string, string> = {
  'cat.aria': 'ARIA',
  'cat.color': 'Color & Contrast',
  'cat.forms': 'Forms',
  'cat.keyboard': 'Keyboard',
  'cat.language': 'Language',
  'cat.name-role-value': 'Name / Role / Value',
  'cat.parsing': 'Parsing',
  'cat.semantics': 'Semantics',
  'cat.sensory-and-visual-cues': 'Sensory & Visual Cues',
  'cat.structure': 'Structure',
  'cat.tables': 'Tables',
  'cat.text-alternatives': 'Text Alternatives',
  'cat.time-and-media': 'Time & Media',
};

function extractCategory(tags: string[]): string {
  const catTag = tags.find(t => t.startsWith('cat.'));
  if (!catTag) return 'General';
  return categoryLabels[catTag] || 'General';
}

function cappedNodes(nodes: AxeNode[], max: number): { shown: AxeNode[]; remaining: number } {
  return {
    shown: nodes.slice(0, max),
    remaining: Math.max(0, nodes.length - max),
  };
}

export function generateReportHtml(data: ReportData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WCAG 2.2 Accessibility Report - ${escapeHtml(data.url)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6; margin: 0; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px; border-bottom: 2px solid #d1d5db; background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; border: 8px solid ${gradeColor(data.score.grade)}; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; }
    .score-number { font-size: 36px; font-weight: bold; color: ${gradeColor(data.score.grade)}; }
    .score-grade { font-size: 14px; color: #6b7280; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .compliant { background: #dcfce7; color: #166534; }
    .non-compliant { background: #fee2e2; color: #991b1b; }
    .principle-bar { height: 12px; border-radius: 6px; background: #e5e7eb; margin-top: 4px; }
    .principle-fill { height: 100%; border-radius: 6px; background: #3b82f6; }
    .section { page-break-inside: avoid; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>WCAG 2.2 Level AA Accessibility Report</h1>
  <p style="color:#6b7280;margin-top:0;">
    ${escapeHtml(data.url)}<br>
    Scanned on ${escapeHtml(data.scanDate)} &middot; Engine: ${escapeHtml(data.engineVersion)}
  </p>

  <h2>Executive Summary</h2>
  <div class="section" style="text-align:center;padding:20px 0;">
    <div class="score-circle">
      <span class="score-number">${data.score.overallScore}</span>
      <span class="score-grade">Grade ${data.score.grade}</span>
    </div>
    <div style="margin-top:12px;">
      <span class="badge ${data.score.aodaCompliant ? 'compliant' : 'non-compliant'}">
        ${data.score.aodaCompliant ? 'AODA Compliant' : 'Needs Remediation'}
      </span>
    </div>
    <div style="display:flex;justify-content:center;gap:40px;margin-top:16px;">
      <div><strong style="color:#ef4444;font-size:24px;">${data.score.totalViolations}</strong><br><span style="font-size:12px;color:#6b7280;">Violations</span><br><span style="font-size:11px;color:#9ca3af;">(${data.score.totalElementViolations} elements)</span></div>
      <div><strong style="color:#22c55e;font-size:24px;">${data.score.totalPasses}</strong><br><span style="font-size:12px;color:#6b7280;">Passed</span></div>
      <div><strong style="color:#eab308;font-size:24px;">${data.score.totalIncomplete}</strong><br><span style="font-size:12px;color:#6b7280;">Needs Review</span></div>
    </div>
  </div>

  <h2>WCAG Principles (POUR)</h2>
  <div class="section">
    ${(['perceivable', 'operable', 'understandable', 'robust'] as const).map(p => {
      const ps = data.score.principleScores[p];
      return `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span style="text-transform:capitalize;font-weight:500;">${p}</span>
          <span>${ps.score}% (${ps.violationCount} violations, ${ps.passCount} passes)</span>
        </div>
        <div class="principle-bar"><div class="principle-fill" style="width:${ps.score}%;"></div></div>
      </div>`;
    }).join('')}
  </div>

  <h2>Category Breakdown</h2>
  <div class="section">
    ${(() => {
      const counts: Record<string, number> = {};
      data.violations.forEach(v => {
        const cat = extractCategory(v.tags);
        counts[cat] = (counts[cat] || 0) + 1;
      });
      const total = data.violations.length || 1;
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) return '<p style="color:#16a34a;font-weight:500;">No category violations found.</p>';
      return `<table>
        <thead><tr><th>Category</th><th>Violations</th><th style="width:40%;">Distribution</th></tr></thead>
        <tbody>
          ${sorted.map(([cat, count]) => `
            <tr>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:500;">${escapeHtml(cat)}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${count}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">
                <div style="height:12px;border-radius:6px;background:#e5e7eb;">
                  <div style="height:100%;border-radius:6px;background:#3b82f6;width:${Math.round((count / total) * 100)}%;"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    })()}
  </div>

  <h2>Impact Breakdown</h2>
  <div class="section">
    <table>
      <thead><tr><th>Impact</th><th>Failed</th><th>Passed</th></tr></thead>
      <tbody>
        ${(['critical', 'serious', 'moderate', 'minor'] as const).map(impact => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${impact}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#dc2626;">${data.score.impactBreakdown[impact].failed}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#16a34a;">${data.score.impactBreakdown[impact].passed}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${data.violations.length > 0 ? `
  <h2>Detailed Violations (${data.violations.length})</h2>
  <div class="section">
    ${data.violations.map(v => {
      const { shown, remaining } = cappedNodes(v.nodes, 5);
      const category = extractCategory(v.tags);
      return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:${impactColors[v.impact] || '#6b7280'};">${v.impact}</span>
          <span style="font-weight:600;font-size:15px;">${escapeHtml(v.help)}</span>
          <span style="color:#6b7280;font-size:12px;">${escapeHtml(v.id)}</span>
          <span style="color:#6b7280;font-size:12px;">${v.nodes.length} element(s)</span>
          <span style="color:#6b7280;font-size:12px;">${escapeHtml(v.principle || '-')}</span>
        </div>
        <p style="margin:8px 0;font-size:13px;color:#374151;">${escapeHtml(v.description)}</p>
        <p style="margin:4px 0 12px;font-size:12px;color:#6b7280;">Category: ${escapeHtml(category)}</p>
        ${shown.map(node => `
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:8px;">
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">Selector: <code style="background:#e5e7eb;padding:2px 4px;border-radius:3px;font-size:11px;">${escapeHtml(node.target.join(' > '))}</code></p>
            <pre style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;margin:8px 0;"><code>${escapeHtml(node.html)}</code></pre>
            ${node.failureSummary ? `<p style="margin:4px 0 0;font-size:12px;color:#ca8a04;background:#fefce8;padding:8px;border-radius:4px;">${escapeHtml(node.failureSummary)}</p>` : ''}
          </div>
        `).join('')}
        ${remaining > 0 ? `<p style="font-size:12px;color:#6b7280;font-style:italic;">...and ${remaining} more element(s)</p>` : ''}
        <a href="${escapeHtml(v.helpUrl)}" style="font-size:13px;color:#2563eb;text-decoration:none;" target="_blank" rel="noopener noreferrer">Learn more &rarr;</a>
      </div>`;
    }).join('')}
  </div>
  ` : '<h2>Violations</h2><p style="color:#16a34a;font-weight:500;">No violations found.</p>'}

  <h2>AODA Compliance Note</h2>
  <div class="section" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;">
    <p style="margin:0;font-size:13px;">${escapeHtml(data.aodaNote)}</p>
  </div>

  <h2>Disclaimer</h2>
  <p style="font-size:11px;color:#9ca3af;">${escapeHtml(data.disclaimer)}</p>
</body>
</html>`;
}
