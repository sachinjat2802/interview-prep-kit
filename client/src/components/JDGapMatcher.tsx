'use client';

import React from 'react';
import { Requirement } from '../lib/types';
import { Sparkles, ArrowRight } from 'lucide-react';

interface JDGapMatcherProps {
  requirements: Requirement[];
}

export const JDGapMatcher: React.FC<JDGapMatcherProps> = ({ requirements }) => {
  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Requirement Skill Alignment</span>
        </div>
        <h3 className="text-xl font-extrabold text-zinc-900">JD-to-Experience Gap Matcher & Pivot Coach</h3>
        <p className="text-xs text-zinc-600 font-medium">
          Strategic pivot scripts for addressing potential experience gaps or unfamiliar frameworks during the interview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 font-sans">
        {requirements.slice(0, 5).map((req) => (
          <div key={req.id} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded bg-black text-white px-2 py-0.5 text-[10px] font-extrabold">
                Requirement [{req.id}]
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                req.priority === 'must' ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-700'
              }`}>
                {req.priority.toUpperCase()}
              </span>
            </div>

            <p className="text-xs font-extrabold text-zinc-900">{req.text}</p>

            <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-800 border border-zinc-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-black text-[11px]">
                <ArrowRight className="h-3.5 w-3.5 text-black" />
                <span>If Asked / If Experience Gap Arises:</span>
              </div>
              <p className="text-[11px] text-zinc-700 font-medium italic">
                "While my primary production focus has been on adjacent frameworks, the core concurrency, caching, and data modeling patterns transfer directly. For instance, in my last project..."
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
