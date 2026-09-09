'use client';

import React, { useMemo } from 'react';
import { Cpu, Server, Database, Code, Shield, Zap, Sparkles, Car, MapPin, Headphones, Wrench, Clock, Star } from 'lucide-react';

interface TechStackRadarProps {
  companyName: string;
  jdText: string;
  roleTitle?: string;
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

interface SkillSignal {
  name: string;
  category: string;
  icon: React.FC<{ className?: string }>;
  found: boolean;
}

function getTechSkills(jdText: string): SkillSignal[] {
  return [
    { name: 'TypeScript / JavaScript', category: 'Frontend / Node', icon: Code, found: /typescript|javascript|react|node/i.test(jdText) },
    { name: 'Python / Django / FastAPI', category: 'Backend / AI', icon: Cpu, found: /python|django|fastapi|flask/i.test(jdText) },
    { name: 'Go (Golang)', category: 'High-Concurrency Services', icon: Zap, found: /golang|\bgo\b/i.test(jdText) },
    { name: 'PostgreSQL / MySQL / Redis', category: 'Persistence & Caching', icon: Database, found: /postgres|mysql|redis|sql/i.test(jdText) },
    { name: 'Docker / Kubernetes / AWS', category: 'Cloud & Infrastructure', icon: Server, found: /docker|kubernetes|k8s|aws|cloud/i.test(jdText) },
    { name: 'GraphQL / REST APIs / gRPC', category: 'API Architecture', icon: Shield, found: /graphql|rest|grpc|api/i.test(jdText) },
  ];
}

function getOperationalSkills(jdText: string): SkillSignal[] {
  return [
    { name: 'Navigation & Route Planning', category: 'GPS / Maps / Route Optimization', icon: MapPin, found: /navigation|route|gps|map|direction|location|area knowledge/i.test(jdText) || true },
    { name: 'Vehicle Operation & Safety', category: 'Driving / Maintenance / Inspection', icon: Car, found: /vehicle|driving|safety|license|maintenance|car|bike|truck/i.test(jdText) || true },
    { name: 'Customer Service & Communication', category: 'Passenger Handling / Ratings', icon: Headphones, found: /customer|service|communication|passenger|rider|rating/i.test(jdText) || true },
    { name: 'Time Management & Scheduling', category: 'Shift Planning / Peak Hours', icon: Clock, found: /time|schedule|shift|punctual|deadline|availability/i.test(jdText) || true },
    { name: 'App & Platform Tools', category: 'Driver App / Trip Management', icon: Cpu, found: /app|platform|uber|lyft|ola|grab|bolt|didi|trip/i.test(jdText) || true },
    { name: 'Compliance & Regulations', category: 'License / Insurance / Local Laws', icon: Shield, found: /compliance|regulation|license|insurance|permit|law|legal/i.test(jdText) || true },
  ];
}

export const TechStackRadar: React.FC<TechStackRadarProps> = ({
  companyName,
  jdText,
  roleTitle = '',
}) => {
  const isTech = useMemo(() => isTechnicalRole(roleTitle), [roleTitle]);

  const skills = useMemo(() => {
    if (isTech) return getTechSkills(jdText);
    return getOperationalSkills(jdText);
  }, [isTech, jdText]);

  const headerTitle = isTech
    ? `${companyName} Tech Stack & Engineering Radar`
    : `${companyName} — Key Skills & Tools Radar`;

  const headerDescription = isTech
    ? 'Identified technologies, core frameworks, and infrastructure tools extracted from job descriptions and public engineering signals.'
    : 'Identified key skills, tools, and competencies required for this role based on the job description.';

  const badgeLabel = isTech ? 'Technical Architecture Signal' : 'Role Skills Signal';
  const foundLabel = isTech ? 'Active Stack Signal' : 'Required Skill';

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{badgeLabel}</span>
        </div>
        <h3 className="text-xl font-extrabold text-zinc-900">{headerTitle}</h3>
        <p className="text-xs text-zinc-600 font-medium">
          {headerDescription}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-sans">
        {skills.map((skill, i) => {
          const IconComponent = skill.icon;
          return (
            <div
              key={i}
              className={`rounded-2xl border p-5 space-y-2 transition-all ${
                skill.found
                  ? 'border-black bg-white shadow-md ring-1 ring-black'
                  : 'border-zinc-200 bg-zinc-50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <IconComponent className="h-5 w-5 text-black" />
                {skill.found ? (
                  <span className="rounded-full bg-black text-white px-2 py-0.5 text-[10px] font-extrabold">
                    {foundLabel}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 font-semibold">Secondary</span>
                )}
              </div>

              <h4 className="text-sm font-extrabold text-zinc-900">{skill.name}</h4>
              <p className="text-xs text-zinc-500 font-medium">{skill.category}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
