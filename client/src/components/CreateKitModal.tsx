'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { formatDaysLabel } from '../utils/uiUtils';
import { X, Sparkles, FileText, Globe, Calendar, AlertCircle, Layers, Cpu, Zap } from 'lucide-react';

interface CreateKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKitCreated: (kitId: string) => void;
}

const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;

export const CreateKitModal: React.FC<CreateKitModalProps> = ({
  isOpen,
  onClose,
  onKitCreated,
}) => {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');
  const [jdText, setJdText] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [daysAvailable, setDaysAvailable] = useState<number>(5);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkJsonText, setBulkJsonText] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!jdText.trim()) {
      setError('Please paste a job description');
      return;
    }
    if (!companyUrl.trim() || !URL_REGEX.test(companyUrl.trim())) {
      setError('Please enter a valid company website address (e.g. stripe.com)');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createKit(jdText.trim(), companyUrl.trim(), daysAvailable);
      onKitCreated(res.kit._id);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to start kit generation');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cases: Array<{ jd: string; company_url: string; days: number }> = [];
    try {
      if (bulkFile) {
        const text = await bulkFile.text();
        cases = JSON.parse(text);
      } else if (bulkJsonText.trim()) {
        cases = JSON.parse(bulkJsonText.trim());
      } else {
        throw new Error('Please select a JSON file or paste JSON content');
      }

      if (!Array.isArray(cases) || cases.length === 0) {
        throw new Error('JSON content must be a non-empty array of cases');
      }

      setLoading(true);
      const res = await api.createBulkKits(cases);
      if (res.kitIds && res.kitIds.length > 0) {
        onKitCreated(res.kitIds[0]);
      }
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to parse or submit bulk cases');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4 font-sans">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                Create Interview Prep Kit <span className="text-xs font-semibold text-zinc-600">AI Generator</span>
              </h3>
              <p className="text-xs text-zinc-500 font-medium">Extract company intelligence and generate tailored question bank</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-black transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-200 bg-zinc-100 px-6 pt-3 gap-2 font-sans">
          <button
            onClick={() => setTab('single')}
            className={`flex items-center gap-2 rounded-t-xl border-t border-x px-4 py-2.5 text-xs font-extrabold transition-all ${
              tab === 'single'
                ? 'border-zinc-300 bg-white text-black'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <FileText className="h-4 w-4 text-black" />
            <span>SINGLE ROLE</span>
          </button>
          <button
            onClick={() => setTab('bulk')}
            className={`flex items-center gap-2 rounded-t-xl border-t border-x px-4 py-2.5 text-xs font-extrabold transition-all ${
              tab === 'bulk'
                ? 'border-zinc-300 bg-white text-black'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="h-4 w-4 text-black" />
            <span>BULK BATCH (MULTIPLE ROLES)</span>
          </button>
        </div>

        {/* Form Body */}
        {tab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto bg-white text-zinc-900 font-sans">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-black mb-1.5">
                Target Company Domain
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3 h-4 w-4 text-black" />
                <input
                  type="text"
                  required
                  placeholder="e.g. stripe.com or accenture.com"
                  value={companyUrl}
                  onChange={e => setCompanyUrl(e.target.value)}
                  className="defi-input w-full rounded-xl py-2.5 pl-10 pr-3 text-sm font-semibold text-zinc-900 placeholder-zinc-400"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500 font-medium">
                System will scrape Glassdoor, LeetCode & tech blog benchmarks for this company.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-black">
                  Job Description Text
                </label>
                <span className="text-xs font-semibold text-zinc-500">
                  {jdText.length} chars
                </span>
              </div>
              <textarea
                required
                rows={5}
                placeholder="Paste the full job description text here (requirements, responsibilities, tech stack)..."
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                className="defi-input w-full rounded-xl p-3 text-xs text-zinc-900 placeholder-zinc-400 font-sans leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-black">
                  Preparation Timeline (1 Day to 2 Years)
                </label>
                <span className="rounded-md bg-black text-white px-3 py-0.5 text-xs font-extrabold">
                  {formatDaysLabel(daysAvailable)}
                </span>
              </div>

              {/* Quick Preset Buttons (1 Day to 2 Years) */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-3 font-sans">
                {[
                  { days: 1, label: '1d' },
                  { days: 3, label: '3d' },
                  { days: 7, label: '1w' },
                  { days: 30, label: '1m' },
                  { days: 90, label: '3m' },
                  { days: 180, label: '6m' },
                  { days: 365, label: '1y' },
                  { days: 730, label: '2y' },
                ].map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setDaysAvailable(p.days)}
                    className={`rounded-lg border py-1.5 text-xs font-extrabold transition-all ${
                      daysAvailable === p.days
                        ? 'border-black bg-black text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:text-black'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-black shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={730}
                  value={daysAvailable}
                  onChange={e => setDaysAvailable(parseInt(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-defi-mint flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-xs font-extrabold uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2 font-sans text-white">
                    <Cpu className="h-4 w-4 animate-spin text-white" />
                    Executing Pipeline...
                  </span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 stroke-[2.5]" />
                    <span>Generate Prep Kit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto bg-white text-zinc-900 font-sans">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs font-semibold text-zinc-600">
              Bulk batch generation allows importing an array of company & JD test cases:
            </p>
            <pre className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-900 font-mono border border-zinc-200">
{`[
  {
    "company_url": "https://stripe.com",
    "jd": "Senior Backend Engineer...",
    "days": 5
  }
]`}
            </pre>

            <div>
              <label className="block text-xs font-extrabold text-zinc-900 mb-1.5">Upload JSON File</label>
              <input
                type="file"
                accept=".json"
                onChange={e => setBulkFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-zinc-700 file:mr-4 file:rounded-xl file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-sans file:font-extrabold file:text-white hover:file:bg-zinc-800 cursor-pointer"
              />
            </div>

            <div className="relative flex py-1 items-center font-sans">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold text-zinc-500 uppercase">Or Paste Raw Payload</span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>

            <div>
              <textarea
                rows={4}
                placeholder="Paste JSON array here..."
                value={bulkJsonText}
                onChange={e => setBulkJsonText(e.target.value)}
                className="defi-input w-full rounded-xl p-3 text-xs text-zinc-900 placeholder-zinc-400 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-defi-mint flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? <span>Processing Bulk Batch...</span> : <span>Process Bulk Cases</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
