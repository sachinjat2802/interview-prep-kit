'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

interface ReverseQuestionsProps {
  companyName: string;
  roleTitle: string;
}

export const ReverseQuestions: React.FC<ReverseQuestionsProps> = ({
  companyName,
  roleTitle,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const questionsList = [
    {
      audience: 'Engineering Manager',
      category: 'Team Execution & Engineering Culture',
      question: `What is the biggest technical or architectural debt bottleneck the team is actively trying to refactor in the next 6 months at ${companyName}?`,
      rationale: 'Shows high technical maturity and interest in solving practical team challenges.',
    },
    {
      audience: 'Staff / Principal Engineer',
      category: 'Architecture & System Scale',
      question: `How does ${companyName} handle deployment rollbacks and database migrations when shipping breaking schema updates under peak traffic?`,
      rationale: 'Demonstrates deep familiarity with production reliability and zero-downtime deployments.',
    },
    {
      audience: 'VP / Director of Engineering',
      category: 'Product Strategy & Vision',
      question: `How are technical roadmap priorities balanced against urgent customer feature requests when resource constraints arise for the ${roleTitle} team?`,
      rationale: 'Signals product mindset and understanding of business tradeoffs.',
    },
    {
      audience: 'Peer / Senior Engineer',
      category: 'Day-in-the-Life & On-Call',
      question: 'What does a typical on-call escalation rotation look like, and how does the team conduct post-mortems after high-severity incidents?',
      rationale: 'Reveals true operational health and psychological safety of the team culture.',
    },
    {
      audience: 'Recruiter / HR',
      category: 'Growth & Success Metrics',
      question: `What would success look like for someone in this ${roleTitle} role at the 90-day mark?`,
      rationale: 'Proves goal-orientation and immediate drive to deliver impact.',
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Candidate Strategy Playbook</span>
        </div>
        <h3 className="text-xl font-extrabold text-zinc-900">Reverse Interview Questions ("Questions to Ask Them")</h3>
        <p className="text-xs text-zinc-600 font-medium">
          Asking insightful, high-yield questions at the end of your interview differentiates you as a top 1% thoughtful candidate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
        {questionsList.map((item, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-sm hover:border-zinc-400 transition-all">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-black text-white px-2.5 py-0.5 text-[10px] font-extrabold">
                {item.audience}
              </span>
              <span className="text-[10px] font-bold text-zinc-500">{item.category}</span>
            </div>

            <p className="text-xs font-extrabold text-zinc-900 leading-relaxed">
              "{item.question}"
            </p>

            <div className="rounded-xl bg-zinc-50 p-3 text-[11px] text-zinc-700 border border-zinc-200 font-medium">
              <strong>Why this works:</strong> {item.rationale}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleCopy(item.question, i)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                {copiedIndex === i ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-black" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-black" />
                    <span>Copy Question</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
