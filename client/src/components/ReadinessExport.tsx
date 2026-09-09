'use client';

import { Kit } from '../lib/types';
import { Printer, AlertTriangle, CheckCircle, BarChart3, Sparkles } from 'lucide-react';
import { getCategoryLabel } from '../utils/roleUtils';

interface ReadinessExportProps {
  kit: Kit;
}

export const ReadinessExport: React.FC<ReadinessExportProps> = ({ kit }) => {
  const { role, questions, company_brief, source, coverage } = kit;
  const roleTitle = role?.title || source?.role || 'Job Position';

  const mustHaves = role?.requirements?.filter(r => r.priority === 'must') || [];
  const uncoveredMusts = coverage?.uncovered_requirement_ids || [];

  // Calculate readiness score
  const mustCoverageRatio = mustHaves.length > 0
    ? (mustHaves.length - uncoveredMusts.length) / mustHaves.length
    : 1.0;
  
  const questionCountFactor = Math.min(1.0, (questions?.length || 0) / 8);
  const readinessScore = Math.round((mustCoverageRatio * 70) + (questionCountFactor * 30));

  // Category counts
  const categoryCounts: Record<string, number> = {
    technical: 0,
    behavioural: 0,
    'system-design': 0,
    'company-fit': 0,
  };

  (questions || []).forEach(q => {
    if (categoryCounts[q.category] !== undefined) {
      categoryCounts[q.category]++;
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportMarkdown = () => {
    let content = `# Interview Readiness Cheatsheet — ${role?.title || 'Prep Kit'}\n\n`;
    content += `Company: ${source?.company || 'N/A'}\n`;
    content += `Readiness Score: ${readinessScore}%\n\n`;
    content += `## Company Brief\n${company_brief?.summary || ''}\n\n`;
    content += `## Top Questions\n`;
    (questions || []).forEach((q, i) => {
      content += `${i + 1}. **[${q.category}]** ${q.prompt}\n   *Outline:* ${q.answer_outline}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${source?.company || 'interview'}_prep_cheatsheet.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      {/* Screen View (Dashboard) */}
      <div className="no-print space-y-6">
        {/* Top Header & Score Banner */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Readiness Diagnostic & Export</span>
              </div>
              <h3 className="text-2xl font-extrabold text-zinc-900">
                Interview Readiness Index & Cheatsheet
              </h3>
              <p className="text-xs text-zinc-600 max-w-xl font-medium">
                Combines requirement coverage verification, category diversity, and question depth to diagnose prep gaps before your interview.
              </p>
            </div>

            {/* Score Radial Box */}
            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 border border-zinc-200 shadow-sm font-sans">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-black text-white font-black text-2xl">
                {readinessScore}%
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-zinc-600">Readiness Score</span>
                <p className="text-sm font-extrabold text-zinc-900">
                  {readinessScore >= 85 ? 'Highly Prepared' : readinessScore >= 60 ? 'Moderate Preparation' : 'Gaps Detected'}
                </p>
                <p className="text-xs font-semibold text-zinc-600">
                  {uncoveredMusts.length === 0 ? 'All must-haves covered' : `${uncoveredMusts.length} must-haves uncovered`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
          {/* Weak Spot Alert & Must-Haves */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-sm">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-black" />
              <span>Must-Have Requirement Coverage Diagnostic</span>
            </h4>

            {uncoveredMusts.length > 0 ? (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-2 text-xs">
                <p className="font-extrabold text-red-900">Attention: {uncoveredMusts.length} Must-Have Requirement(s) Uncovered</p>
                <ul className="list-disc pl-4 space-y-1 text-red-900 font-medium">
                  {uncoveredMusts.map(id => {
                    const req = mustHaves.find(r => r.id === id);
                    return (
                      <li key={id}>
                        <span className="font-extrabold">{id}:</span> {req?.text || id}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 flex items-center gap-3 text-xs text-zinc-900 font-semibold">
                <CheckCircle className="h-5 w-5 text-black shrink-0" />
                <span>Excellent! 100% of must-have requirements have at least one dedicated prep question.</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-zinc-700">Must-Have Requirements Breakdown ({mustHaves.length}):</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {mustHaves.map(r => {
                  const isCovered = !uncoveredMusts.includes(r.id);
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="rounded bg-black px-1.5 py-0.5 font-sans text-[10px] text-white font-extrabold">{r.id}</span>
                        <span className="text-zinc-900 truncate font-semibold">{r.text}</span>
                      </div>
                      {isCovered ? (
                        <span className="rounded bg-black text-white px-2 py-0.5 text-[10px] font-extrabold shrink-0">Covered</span>
                      ) : (
                        <span className="rounded bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-extrabold shrink-0">Missing</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Strength Breakdown */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-sm">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-black" />
              <span>Question Category Diversity</span>
            </h4>

            <div className="space-y-3">
              {[
                { cat: 'technical', label: getCategoryLabel('technical', roleTitle), count: categoryCounts.technical },
                { cat: 'behavioural', label: getCategoryLabel('behavioural', roleTitle), count: categoryCounts.behavioural },
                { cat: 'system-design', label: getCategoryLabel('system-design', roleTitle), count: categoryCounts['system-design'] },
                { cat: 'company-fit', label: getCategoryLabel('company-fit', roleTitle), count: categoryCounts['company-fit'] },
              ].map(item => {
                const pct = (questions?.length || 0) > 0 ? Math.round((item.count / questions.length) * 100) : 0;
                return (
                  <div key={item.cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-zinc-900">
                      <span>{item.label}</span>
                      <span className="font-bold">{item.count} items ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 border border-zinc-200">
                      <div className="h-full bg-black transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-zinc-800 transition-all uppercase tracking-wider"
              >
                <Printer className="h-4 w-4" />
                <span>Print Cheatsheet</span>
              </button>
              <button
                onClick={handleExportMarkdown}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white py-3 text-xs font-bold text-zinc-900 shadow-sm hover:bg-zinc-100 transition-all uppercase tracking-wider"
              >
                <Sparkles className="h-4 w-4 text-black" />
                <span>Export Markdown</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable 1-Page Cheatsheet Layout */}
      <div className="printable-cheatsheet hidden print:block bg-white text-black p-6 space-y-4 font-sans text-xs">
        <div className="border-b-2 border-black pb-3 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-black">{role?.title || 'Interview'} Prep Cheatsheet</h1>
            <p className="text-xs font-semibold text-gray-700">{source?.company || 'Company'} — {source?.location || 'Remote'}</p>
          </div>
          <div className="text-right text-[10px] text-gray-600">
            <p>Generated by PrepAI</p>
            <p>{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-gray-200 p-1">Company Summary & Product</h2>
          <p className="text-[11px] leading-relaxed text-gray-800">{company_brief?.summary} {company_brief?.what_they_do}</p>
        </div>

        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-gray-200 p-1">Key Must-Have Requirements</h2>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {mustHaves.map(r => (
              <div key={r.id} className="border border-gray-300 p-1.5 rounded">
                <span className="font-bold font-sans">[{r.id}]</span> {r.text}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-gray-200 p-1">High-Yield Questions & Talking Points</h2>
          <div className="space-y-2">
            {(questions || []).slice(0, 6).map((q, idx) => (
              <div key={q.id} className="border-b border-gray-200 pb-1.5">
                <p className="font-bold text-[11px]">Q{idx + 1} ({q.category}): {q.prompt}</p>
                <p className="text-[10px] text-gray-700 mt-0.5 leading-snug">Key Points: {q.answer_outline}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
