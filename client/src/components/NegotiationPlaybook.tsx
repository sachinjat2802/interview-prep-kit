'use client';

import React, { useState } from 'react';
import { DollarSign, Sparkles, Copy, Check, ShieldCheck } from 'lucide-react';

interface NegotiationPlaybookProps {
  roleTitle: string;
  companyName: string;
}

export const NegotiationPlaybook: React.FC<NegotiationPlaybookProps> = ({
  roleTitle,
  companyName,
}) => {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const scripts = [
    {
      title: 'Initial Verbal Offer Response (Buying Time)',
      script: `Thank you so much for extending the offer for the ${roleTitle} role at ${companyName}! I'm genuinely thrilled about the team's direction. Could you please send over the full written details including equity vesting, bonus target, and benefits so I can review everything thoroughly with my family over the next 48 hours?`,
      tacticalTip: 'Never accept on the spot. Always request the full written offer packet first.',
    },
    {
      title: 'Counter-Offer Script (Targeting Base & Signing Bonus)',
      script: `I am very excited about joining ${companyName}. Based on market benchmarks for ${roleTitle} roles in this location and my relevant professional experience, I was hoping we could discuss adjusting the base compensation to better reflect the market rate. If we can reach agreement, I am ready to commit immediately.`,
      tacticalTip: 'Tie your counter to specific market data and offer immediate sign-off if met.',
    },
    {
      title: 'Competing Offer Email Template',
      script: `Hi [Recruiter Name],\n\nI wanted to check in regarding my candidacy for ${roleTitle}. I've recently received another competitive offer with a decision deadline of [Date]. However, ${companyName} remains my top choice due to the team culture and growth opportunities. Is there any flexibility to expedite our offer details or adjust total compensation so I can finalize my decision with ${companyName}?`,
      tacticalTip: 'Creates genuine urgency without sounding adversarial.',
    },
  ];

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(title);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Compensation Strategy</span>
        </div>
        <h3 className="text-xl font-extrabold text-zinc-900">Salary & Offer Negotiation Playbook</h3>
        <p className="text-xs text-zinc-600 font-medium">
          Battle-tested scripts and strategies to maximize base compensation, equity, and signing bonuses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 font-sans">
        {scripts.map((item, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-black" />
                <span>{item.title}</span>
              </h4>
              <button
                onClick={() => handleCopy(item.script, item.title)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                {copiedScript === item.title ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-black" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-black" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs font-medium text-zinc-800 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">
              {item.script}
            </p>

            <div className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-black shrink-0" />
              <span><strong>Strategy Note:</strong> {item.tacticalTip}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
