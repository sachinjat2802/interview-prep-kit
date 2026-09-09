'use client';

import React from 'react';
import { Question, Requirement } from '../lib/types';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { getCategoryLabel } from '../utils/roleUtils';

interface ConfidenceHeatmapProps {
  questions: Question[];
  requirements: Requirement[];
  roleTitle?: string;
}

export const ConfidenceHeatmap: React.FC<ConfidenceHeatmapProps> = ({
  questions,
  requirements: _requirements,
  roleTitle = 'Job Position',
}) => {
  const categories = [
    { id: 'technical', label: getCategoryLabel('technical', roleTitle) },
    { id: 'behavioural', label: getCategoryLabel('behavioural', roleTitle) },
    { id: 'system-design', label: getCategoryLabel('system-design', roleTitle) },
    { id: 'company-fit', label: getCategoryLabel('company-fit', roleTitle) },
  ];

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Prep Readiness Radar</span>
        </div>
        <h3 className="text-xl font-extrabold text-zinc-900">Confidence Heatmap & Blindspot Detector</h3>
        <p className="text-xs text-zinc-600 font-medium">
          Category breakdown of question depth and requirement coverage to isolate weak spots before your interview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
        {categories.map(cat => {
          const catQuestions = questions.filter(q => q.category === cat.id);
          const count = catQuestions.length;
          const isWeak = count < 2;

          return (
            <div
              key={cat.id}
              className={`rounded-2xl border p-5 space-y-3 shadow-sm ${
                isWeak ? 'border-amber-300 bg-amber-50/40' : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-zinc-900">{cat.label}</h4>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                  isWeak ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-black text-white'
                }`}>
                  {count} Questions Prepared
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 border border-zinc-200">
                <div
                  className={`h-full transition-all ${isWeak ? 'bg-amber-500' : 'bg-black'}`}
                  style={{ width: `${Math.min(100, count * 25)}%` }}
                />
              </div>

              {isWeak ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>Prep Blindspot Detected: Generate or add at least 2 questions in this section.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
                  <span>Sufficient question coverage established.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
