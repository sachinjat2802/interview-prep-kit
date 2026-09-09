'use client';

import React, { useState, useMemo } from 'react';
import { Zap, ChevronRight, ChevronLeft } from 'lucide-react';
import { isTechnicalRole } from '../utils/roleUtils';

interface PanicCardsModeProps {
  companyName: string;
  roleTitle: string;
}

interface PanicCard {
  title: string;
  category: string;
  keyPoint: string;
  example: string;
}

function getTechPanicCards(companyName: string): PanicCard[] {
  return [
    {
      title: 'Anchor Rule #1: STAR Story Hook',
      category: 'Behavioral',
      keyPoint: 'Always start with the Quantified Result upfront in your first sentence!',
      example: '"When I redesigned our database indexing, we cut query latency by 45% while handling 10k QPS..."',
    },
    {
      title: 'Anchor Rule #2: System Design Scaling Formula',
      category: 'System Design',
      keyPoint: '1 Million Daily Active Users (DAU) @ 10 requests/day = 100 QPS average, ~200 Peak QPS.',
      example: 'Memory math: 1M active sessions * 2KB per session = 2GB RAM required in Redis.',
    },
    {
      title: 'Anchor Rule #3: Technical Trade-off Pivot Phrase',
      category: 'Technical Delivery',
      keyPoint: 'Never say "I don\'t know." Say: "I haven\'t used framework X in production, but here is how I would evaluate it..."',
      example: 'Pivot to core fundamentals: HTTP protocols, thread concurrency, or data structure complexity.',
    },
    {
      title: 'Anchor Rule #4: The 60-Second Intro Punch',
      category: 'Self Introduction',
      keyPoint: 'Structure: Current Role → Major Technical Impact → Why THIS Company Right Now.',
      example: `Focus 80% of your time on tangible technical achievements that match ${companyName}'s needs.`,
    },
    {
      title: 'Anchor Rule #5: Salary Negotiation Rule',
      category: 'Negotiation',
      keyPoint: 'Never give the first number during verbal screening.',
      example: '"I\'m open to competitive market rates for this role; what is the target range for this position?"',
    },
  ];
}

function getNonTechPanicCards(companyName: string): PanicCard[] {
  return [
    {
      title: 'Anchor Rule #1: STAR Story Hook',
      category: 'Behavioral',
      keyPoint: 'Always start with the Quantified Result upfront in your first sentence!',
      example: '"In my previous role, I maintained a 4.9 customer rating over 2,000+ trips while keeping a perfect safety record..."',
    },
    {
      title: 'Anchor Rule #2: Situational Response Formula',
      category: 'Situational',
      keyPoint: 'Problem → Your Action → Positive Outcome. Always show you stayed calm and professional.',
      example: '"When a customer was upset about a delay, I immediately communicated the reason, offered an alternative, and ensured they arrived safely."',
    },
    {
      title: 'Anchor Rule #3: The Pivot Phrase',
      category: 'Skills Gap',
      keyPoint: 'Never say "I don\'t know." Say: "I haven\'t encountered that exact situation, but here is how I would handle it..."',
      example: 'Pivot to your core strengths: reliability, professionalism, safety awareness, or customer focus.',
    },
    {
      title: 'Anchor Rule #4: The 60-Second Intro Punch',
      category: 'Self Introduction',
      keyPoint: 'Structure: Who You Are → Your Best Professional Achievement → Why THIS Company.',
      example: `Focus on your reliability, work ethic, and specific reasons you want to join ${companyName}.`,
    },
    {
      title: 'Anchor Rule #5: Compensation Discussion',
      category: 'Negotiation',
      keyPoint: 'Know the market rate for your role in your area before the interview.',
      example: '"I\'m looking for fair compensation that reflects the demands of the role; what is the pay structure for this position?"',
    },
  ];
}

export const PanicCardsMode: React.FC<PanicCardsModeProps> = ({
  companyName,
  roleTitle,
}) => {
  const [index, setIndex] = useState(0);

  const panicCards = useMemo(() => {
    return isTechnicalRole(roleTitle)
      ? getTechPanicCards(companyName)
      : getNonTechPanicCards(companyName);
  }, [roleTitle, companyName]);

  const current = panicCards[index];

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
          <Zap className="h-3.5 w-3.5" />
          <span>Rapid 5-Minute Warmup</span>
        </div>
        <h3 className="text-xl font-extrabold text-zinc-900">Pre-Interview Panic Cards Mode</h3>
        <p className="text-xs text-zinc-600 font-medium">
          Rapid-fire essential mental anchors and formulas to review in the 5 minutes before your interview starts.
        </p>
      </div>

      {/* Card Carousel Display */}
      <div className="rounded-3xl border-2 border-black bg-white p-8 space-y-6 shadow-xl font-sans">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-black text-white px-3 py-1 text-xs font-extrabold">
            Card {index + 1} of {panicCards.length} — {current.category}
          </span>
          <span className="text-xs font-bold text-zinc-500">{roleTitle} @ {companyName}</span>
        </div>

        <div className="space-y-3">
          <h4 className="text-xl font-extrabold text-zinc-900">{current.title}</h4>
          <p className="text-sm font-bold text-black leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
            {current.keyPoint}
          </p>
          <div className="text-xs text-zinc-700 font-medium italic pl-2 border-l-2 border-black">
            {current.example}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
          <button
            onClick={() => setIndex(prev => Math.max(0, prev - 1))}
            disabled={index === 0}
            className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => setIndex(prev => Math.min(panicCards.length - 1, prev + 1))}
            disabled={index === panicCards.length - 1}
            className="flex items-center gap-1 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-30"
          >
            <span>Next Card</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
