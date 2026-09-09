'use client';

import React from 'react';
import { Kit } from '../lib/types';
import { formatDaysLabel } from '../utils/uiUtils';
import { Calendar, Globe, Trash2, ArrowRight, CheckCircle2, Clock, AlertTriangle, Layers, Zap } from 'lucide-react';

interface KitCardProps {
  kit: Kit;
  onSelect: (kitId: string) => void;
  onDelete: (kitId: string, e: React.MouseEvent) => void;
}

export const KitCard: React.FC<KitCardProps> = ({ kit, onSelect, onDelete }) => {
  const company = kit.source?.company || extractHostname(kit.companyUrl) || 'Company';
  const roleTitle = kit.role?.title || kit.source?.role || 'Interview Candidate';
  const questionCount = kit.questions?.length || 0;
  const flashcardCount = kit.flashcards?.length || 0;

  const statusBadge = (() => {
    switch (kit.status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1.5 rounded-md bg-black text-white px-2.5 py-0.5 text-xs font-extrabold shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            <span>READY</span>
          </span>
        );
      case 'generating':
        return (
          <span className="flex items-center gap-1.5 rounded-md bg-zinc-100 border border-zinc-300 px-2.5 py-0.5 text-xs font-bold text-zinc-900">
            <Clock className="h-3.5 w-3.5 animate-spin text-black" />
            <span>GENERATING</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 rounded-md bg-red-100 border border-red-300 px-2.5 py-0.5 text-xs font-bold text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="rounded-md bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
            PENDING
          </span>
        );
    }
  })();

  return (
    <div
      onClick={() => onSelect(kit._id)}
      className="defi-card group relative flex flex-col justify-between rounded-2xl p-5 cursor-pointer bg-white border border-zinc-200 shadow-sm hover:border-black hover:shadow-md transition-all font-sans"
    >
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          {statusBadge}
          <button
            onClick={(e) => onDelete(kit._id, e)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete Prep Kit"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Title and Company */}
        <div>
          <h4 className="text-lg font-extrabold text-zinc-900 group-hover:text-black transition-colors line-clamp-1">
            {roleTitle}
          </h4>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 mt-1">
            <Globe className="h-3.5 w-3.5 text-black shrink-0" />
            <span className="truncate">{company}</span>
          </div>
        </div>

        {/* Questions & Flashcards Stats */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block">Questions</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Zap className="h-3.5 w-3.5 text-black fill-black" />
              <span className="text-xs font-extrabold text-zinc-900">{questionCount} Qs</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block">Flashcards</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Layers className="h-3.5 w-3.5 text-black" />
              <span className="text-xs font-extrabold text-zinc-900">{flashcardCount} Cards</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meta Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-3 text-xs font-medium text-zinc-600">
        <div className="flex items-center gap-1.5 truncate pr-2">
          <Calendar className="h-3.5 w-3.5 text-black shrink-0" />
          <span className="truncate">{formatDaysLabel(kit.daysAvailable || 5)}</span>
        </div>

        <span className="flex items-center gap-1 text-xs font-extrabold text-black group-hover:translate-x-1 transition-transform shrink-0">
          Open Kit
          <ArrowRight className="h-3.5 w-3.5 text-black" />
        </span>
      </div>
    </div>
  );
};

function extractHostname(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url || '';
  }
}
