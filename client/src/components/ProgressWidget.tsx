'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface ProgressWidgetProps {
  kitId: string;
  onComplete: () => void;
  onFailed?: (msg: string) => void;
}

const STEPS = [
  'Extracting Role Requirements',
  'Crawling Target Company Site',
  'Benchmarking Industry Interview Questions',
  'Generating Company Brief',
  'Generating Question Bank',
  'Creating Flashcards',
  'Checking Coverage & Gap Filling',
  'Building Study Schedule',
];

export const ProgressWidget: React.FC<ProgressWidgetProps> = ({
  kitId,
  onComplete,
  onFailed,
}) => {
  const [progress, setProgress] = useState({
    step: 1,
    totalSteps: 8,
    message: 'Initializing research pipeline...',
    status: 'generating',
  });
  const [error, setError] = useState<string | null>(null);

  const statusRef = React.useRef(progress.status);
  statusRef.current = progress.status;

  useEffect(() => {
    let isSubscribed = true;

    // 1. Initial Fetch of current progress
    const fetchCurrentStatus = async () => {
      try {
        const res = await api.getKit(kitId);
        if (res.kit && isSubscribed) {
          if (res.kit.generationProgress) {
            setProgress((prev) => ({
              ...prev,
              step: Math.max(1, res.kit.generationProgress.step || prev.step),
              totalSteps: res.kit.generationProgress.totalSteps || 8,
              message: res.kit.generationProgress.message || prev.message,
              status: res.kit.status || prev.status,
            }));
          }
          if (res.kit.status === 'ready') {
            onComplete();
          } else if (res.kit.status === 'failed') {
            setError(res.kit.errorMessage || 'Generation failed');
            if (onFailed) onFailed(res.kit.errorMessage || 'Generation failed');
          }
        }
      } catch (e) {
        console.error('Failed to fetch kit status:', e);
      }
    };

    fetchCurrentStatus();

    // 2. Poll fallback every 2 seconds for guaranteed pipeline progress updates
    const pollInterval = setInterval(() => {
      if (statusRef.current === 'generating') {
        fetchCurrentStatus();
      }
    }, 2000);

    // 3. SSE Stream listener for real-time push events
    const unsubscribe = api.subscribeToProgress(kitId, (data) => {
      if (!isSubscribed) return;

      if (data.step !== undefined) {
        setProgress((prev) => ({
          ...prev,
          step: Math.max(1, data.step),
          totalSteps: data.totalSteps || 8,
          message: data.message || prev.message,
          status: data.status || prev.status,
        }));
      }

      if (data.status === 'ready' || data.step >= 8) {
        setTimeout(() => {
          if (isSubscribed) onComplete();
        }, 600);
      }

      if (data.status === 'failed') {
        setError(data.message || 'Generation failed');
        if (onFailed) onFailed(data.message || 'Generation failed');
      }
    });

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (unsubscribe) unsubscribe();
    };
  }, [kitId, onComplete, onFailed]);

  const percent = Math.min(100, Math.round((progress.step / progress.totalSteps) * 100));

  return (
    <div className="mx-auto w-full max-w-3xl defi-card rounded-3xl p-8 shadow-xl border border-zinc-200 bg-white text-zinc-900 space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white shadow-md">
            {error ? (
              <AlertTriangle className="h-6 w-6 text-red-400" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            )}
          </div>
          <div>
            <h4 className="text-xl font-bold text-zinc-900 tracking-tight">
              {error ? 'Generation Issue' : 'AI Pipeline Active'}
            </h4>
            <p className="text-sm font-medium text-zinc-500">Kit ID: <span className="font-mono text-zinc-700">{kitId}</span></p>
          </div>
        </div>
        <span className="rounded-xl bg-black text-white px-4 py-1.5 text-base font-extrabold shadow-sm">
          {percent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 border border-zinc-300">
        <div
          className="h-full bg-black transition-all duration-500 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Live status message ticker */}
      <div className="rounded-2xl border border-zinc-300 bg-zinc-100 p-4 text-sm text-zinc-900 flex items-center gap-3 font-semibold shadow-inner">
        <Sparkles className="h-5 w-5 shrink-0 text-black animate-pulse" />
        <span>{progress.message}</span>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-bold text-red-900 mb-1">Execution Failure</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 8-Step Pipeline Progress Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {STEPS.map((stepName, i) => {
          const stepNum = i + 1;
          const isDone = progress.step > stepNum || progress.status === 'ready';
          const isCurrent = progress.step === stepNum;

          return (
            <div
              key={stepName}
              className={`flex items-center gap-3 rounded-xl p-3.5 transition-all ${
                isDone
                  ? 'border border-black bg-black text-white font-bold shadow-sm'
                  : isCurrent
                  ? 'border-2 border-black bg-white text-zinc-900 font-extrabold shadow-md'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-700 font-medium'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-5 w-5 text-black animate-spin shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-300 shrink-0" />
              )}
              <span className="truncate">{stepName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
