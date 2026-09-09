'use client';

import React, { useState } from 'react';
import { Requirement } from '../lib/types';
import { Sparkles, Save } from 'lucide-react';

interface STARStoryBuilderProps {
  requirements: Requirement[];
}

export const STARStoryBuilder: React.FC<STARStoryBuilderProps> = ({ requirements }) => {
  const [selectedReqId, setSelectedReqId] = useState<string>(requirements[0]?.id || '');
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [savedStories, setSavedStories] = useState<Array<{
    reqId: string;
    situation: string;
    task: string;
    action: string;
    result: string;
  }>>([]);

  const currentReq = requirements.find(r => r.id === selectedReqId) || requirements[0];

  const handleSaveStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!situation.trim() || !action.trim()) return;

    setSavedStories(prev => [
      ...prev.filter(s => s.reqId !== selectedReqId),
      { reqId: selectedReqId, situation, task, action, result },
    ]);

    setSituation('');
    setTask('');
    setAction('');
    setResult('');
  };

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Behavioral Framework Coach</span>
        </div>
        <h3 className="text-xl font-extrabold text-zinc-900">STAR Method Story Builder</h3>
        <p className="text-xs text-zinc-600 font-medium">
          Map your real-world achievements directly to job requirements using Situation, Task, Action, and Quantified Result.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        {/* Requirement Selection Sidebar */}
        <div className="space-y-3 border-r border-zinc-200 pr-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-black">Select Requirement ({requirements.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {requirements.map(req => {
              const isSelected = req.id === selectedReqId;
              const hasStory = savedStories.some(s => s.reqId === req.id);
              return (
                <button
                  key={req.id}
                  onClick={() => setSelectedReqId(req.id)}
                  className={`w-full text-left rounded-xl p-3 border transition-all text-xs ${
                    isSelected
                      ? 'border-black bg-black text-white font-extrabold shadow-md'
                      : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${isSelected ? 'bg-white text-black' : 'bg-zinc-100 text-zinc-900'}`}>
                      {req.id}
                    </span>
                    {hasStory && (
                      <span className={`text-[10px] font-extrabold ${isSelected ? 'text-white' : 'text-zinc-900'}`}>✓ Story Built</span>
                    )}
                  </div>
                  <p className="line-clamp-2 font-medium">{req.text}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* STAR Input Form */}
        <div className="md:col-span-2 space-y-4">
          {currentReq && (
            <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-black">Targeting Requirement [{currentReq.id}]</span>
              <p className="text-xs font-bold text-zinc-900">{currentReq.text}</p>
            </div>
          )}

          <form onSubmit={handleSaveStory} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">1. Situation (Context & Challenge)</label>
              <textarea
                rows={2}
                value={situation}
                onChange={e => setSituation(e.target.value)}
                placeholder="Describe the project context, timeline pressure, or system bottleneck..."
                className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">2. Task (Your Responsibility)</label>
              <textarea
                rows={2}
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder="What was your specific role and objective in solving this?"
                className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">3. Action (Steps You Personally Took)</label>
              <textarea
                rows={2}
                value={action}
                onChange={e => setAction(e.target.value)}
                placeholder="Detail technical choices, trade-offs evaluated, and collaboration steps..."
                className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">4. Result (Quantified Metrics & Business Outcome)</label>
              <textarea
                rows={2}
                value={result}
                onChange={e => setResult(e.target.value)}
                placeholder="E.g. Reduced p99 latency by 45%, increased conversion rate by 12%..."
                className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs font-extrabold text-white hover:bg-zinc-800 shadow-md"
              >
                <Save className="h-4 w-4" />
                <span>Save STAR Story</span>
              </button>
            </div>
          </form>

          {/* Saved Stories List */}
          {savedStories.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-black">Your Built STAR Stories ({savedStories.length})</h4>
              <div className="space-y-3">
                {savedStories.map((story, i) => (
                  <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="rounded bg-black px-2 py-0.5 text-white text-[10px] font-extrabold">Req {story.reqId}</span>
                    </div>
                    <p className="text-zinc-800"><strong>Situation:</strong> {story.situation}</p>
                    <p className="text-zinc-800"><strong>Action:</strong> {story.action}</p>
                    <p className="text-zinc-800"><strong>Result:</strong> {story.result}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
