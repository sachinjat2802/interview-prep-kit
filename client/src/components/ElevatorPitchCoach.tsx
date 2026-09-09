'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

interface ElevatorPitchCoachProps {
  roleTitle: string;
  companyName: string;
  requirements?: Array<{ text: string; kind: string }>;
}

// Keywords that signal a software/engineering/data role
const TECH_ROLE_KEYWORDS = [
  'software', 'engineer', 'developer', 'devops', 'sre', 'data scientist',
  'data engineer', 'machine learning', 'ml engineer', 'ai engineer',
  'frontend', 'backend', 'full-stack', 'fullstack', 'architect',
  'cloud engineer', 'security engineer', 'platform engineer',
  'infrastructure', 'ios developer', 'android developer',
];

function isTechnicalRole(title: string): boolean {
  const lower = title.toLowerCase();
  return TECH_ROLE_KEYWORDS.some(kw => lower.includes(kw));
}

function generatePitch(roleTitle: string, companyName: string, requirements?: Array<{ text: string; kind: string }>): string {
  const isTech = isTechnicalRole(roleTitle);

  // Extract top domain keywords from requirements for personalization
  const reqKeywords = (requirements || [])
    .slice(0, 3)
    .map(r => r.text.split(/[.,;]/)[0].trim().toLowerCase())
    .filter(t => t.length > 5 && t.length < 60);

  if (isTech) {
    const domainFocus = reqKeywords.length > 0
      ? reqKeywords.slice(0, 2).join(' and ')
      : 'distributed systems and full-stack architecture';

    return `"Hi, I'm a ${roleTitle.toLowerCase()} with hands-on experience in ${domainFocus}. In my recent work, I led a project that significantly improved system performance and reliability while serving a growing user base. What excites me about joining ${companyName} as a ${roleTitle} is your team's focus on engineering excellence and product impact. I'm eager to bring my expertise in problem-solving and collaborative development to help drive ${companyName}'s technical roadmap forward."`;
  }

  // Non-technical / operational / service roles
  const domainFocus = reqKeywords.length > 0
    ? reqKeywords.slice(0, 2).join(' and ')
    : 'customer service excellence and reliable execution';

  return `"Hi, I'm an experienced professional with a strong track record in ${domainFocus}. In my previous role, I consistently maintained a high performance record with excellent customer ratings and a strong safety record. What draws me to ${companyName} as a ${roleTitle} is your commitment to quality service and team support. I'm ready to bring my reliability, professionalism, and dedication to ${companyName}'s standards of excellence."`;
}

export const ElevatorPitchCoach: React.FC<ElevatorPitchCoachProps> = ({
  roleTitle,
  companyName,
  requirements,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const isTech = useMemo(() => isTechnicalRole(roleTitle), [roleTitle]);

  const pitchText = useMemo(
    () => generatePitch(roleTitle, companyName, requirements),
    [roleTitle, companyName, requirements]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(pitchText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Phase descriptions adapt to role type
  const phases = isTech
    ? [
        { title: 'Phase 1: Hook (15s)', desc: 'Who you are + core technical domain.' },
        { title: 'Phase 2: Impact (30s)', desc: '1 quantifiable technical achievement.' },
        { title: 'Phase 3: Connection (15s)', desc: `Why THIS role @ ${companyName}.` },
      ]
    : [
        { title: 'Phase 1: Hook (15s)', desc: 'Who you are + core professional strengths.' },
        { title: 'Phase 2: Impact (30s)', desc: '1 quantifiable achievement (ratings, safety record, volume).' },
        { title: 'Phase 3: Connection (15s)', desc: `Why THIS role @ ${companyName}.` },
      ];

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Self-Introduction Coach</span>
        </div>
        <h3 className="text-xl font-extrabold text-zinc-900">60-Second Elevator Pitch Coach</h3>
        <p className="text-xs text-zinc-600 font-medium">
          A high-impact 60-second &quot;Tell Me About Yourself&quot; answer linking your track record directly to {companyName}&apos;s needs as a <strong>{roleTitle}</strong>.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-300 bg-white p-6 space-y-4 shadow-sm font-sans">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-black">Recommended Script</span>
          <button
            onClick={handleCopy}
            aria-label={isCopied ? 'Pitch copied' : 'Copy pitch to clipboard'}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-black" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-black" />
                <span>Copy Pitch</span>
              </>
            )}
          </button>
        </div>

        <p className="text-sm font-semibold text-zinc-900 leading-relaxed bg-zinc-50 p-5 rounded-2xl border border-zinc-200 font-sans">
          {pitchText}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          {phases.map((phase, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-3 space-y-1">
              <span className="font-extrabold text-black block">{phase.title}</span>
              <p className="text-zinc-600 font-medium">{phase.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
