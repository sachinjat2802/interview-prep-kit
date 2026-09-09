'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { User, Kit } from '../lib/types';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/AuthModal';
import { CreateKitModal } from '../components/CreateKitModal';
import { ProgressWidget } from '../components/ProgressWidget';
import { KitCard } from '../components/KitCard';
import { KitDetailView } from '../components/KitDetailView';
import { Sparkles, Plus, Layers, Loader2, Search, ArrowLeft } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [kits, setKits] = useState<Kit[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);

  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [activeKit, setActiveKit] = useState<Kit | null>(null);

  const [generatingKitId, setGeneratingKitId] = useState<string | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<'all' | '1-3' | '4-14' | '15-60' | '61-180' | '181-730'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'generating' | 'failed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'timeline-asc' | 'timeline-desc' | 'company'>('newest');

  // ─── Auth Check on Mount ───

  useEffect(() => {
    (async () => {
      try {
        const token = api.getToken();
        if (token) {
          const res = await api.getMe();
          setUser(res.user);
        }
      } catch {
        api.setToken(null);
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // ─── Fetch Kits List ───

  const fetchKits = useCallback(async () => {
    if (!user) return;
    setLoadingKits(true);
    try {
      const res = await api.getKits();
      setKits(res.kits as Kit[]);
    } catch (err) {
      console.error('Failed to fetch kits:', err);
    } finally {
      setLoadingKits(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchKits();
    } else {
      setKits([]);
      setSelectedKitId(null);
      setActiveKit(null);
    }
  }, [user, fetchKits]);

  // ─── Fetch Single Kit Detail ───

  const fetchKitDetail = useCallback(async (id: string) => {
    setLoadingKits(true);
    try {
      const res = await api.getKit(id);
      if (!res.kit) {
        setSelectedKitId(null);
        setActiveKit(null);
        return;
      }
      setActiveKit(res.kit as Kit);
      if (res.kit.status === 'generating') {
        setGeneratingKitId(id);
      }
    } catch {
      setSelectedKitId(null);
      setActiveKit(null);
    } finally {
      setLoadingKits(false);
    }
  }, []);

  useEffect(() => {
    if (selectedKitId) {
      fetchKitDetail(selectedKitId);
    } else {
      setActiveKit(null);
    }
  }, [selectedKitId, fetchKitDetail]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      api.setToken(null);
    }
    setUser(null);
    setKits([]);
    setSelectedKitId(null);
  };

  const handleKitCreated = (id: string) => {
    setGeneratingKitId(id);
    setSelectedKitId(id);
    fetchKits();
  };

  const handleDeleteKit = async (kitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this prep kit?')) return;

    try {
      await api.deleteKit(kitId);
      if (selectedKitId === kitId) {
        setSelectedKitId(null);
      }
      fetchKits();
    } catch (err) {
      console.error('Failed to delete kit:', err);
    }
  };

  // Multi-Criteria Filtering and Sorting
  const filteredKits = kits
    .filter(kit => {
      // 1. Keyword Search
      const query = searchQuery.toLowerCase().trim();
      const company = (kit.source?.company || kit.companyUrl || '').toLowerCase();
      const role = (kit.role?.title || kit.source?.role || '').toLowerCase();
      if (query && !company.includes(query) && !role.includes(query)) return false;

      // 2. Status Filter
      if (statusFilter !== 'all' && kit.status !== statusFilter) return false;

      // 3. Timeline Filter (1 day to 2 years / 730 days)
      const days = kit.daysAvailable || 5;
      if (timelineFilter === '1-3' && (days < 1 || days > 3)) return false;
      if (timelineFilter === '4-14' && (days < 4 || days > 14)) return false;
      if (timelineFilter === '15-60' && (days < 15 || days > 60)) return false;
      if (timelineFilter === '61-180' && (days < 61 || days > 180)) return false;
      if (timelineFilter === '181-730' && (days < 181 || days > 730)) return false;

      return true;
    })
    .sort((kitA, kitB) => {
      if (sortBy === 'newest') return new Date(kitB.createdAt || 0).getTime() - new Date(kitA.createdAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(kitA.createdAt || 0).getTime() - new Date(kitB.createdAt || 0).getTime();
      if (sortBy === 'timeline-asc') return (kitA.daysAvailable || 5) - (kitB.daysAvailable || 5);
      if (sortBy === 'timeline-desc') return (kitB.daysAvailable || 5) - (kitA.daysAvailable || 5);
      if (sortBy === 'company') {
        const nameA = (kitA.source?.company || kitA.companyUrl || '').toLowerCase();
        const nameB = (kitB.source?.company || kitB.companyUrl || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCreate={() => {
          if (!user) {
            setIsAuthOpen(true);
          } else {
            setIsCreateOpen(true);
          }
        }}
        onLogout={handleLogout}
        onGoHome={() => setSelectedKitId(null)}
      />

      <main className="flex-1">
        {!authChecked ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 text-black animate-spin" />
          </div>
        ) : !user ? (
          /* Guest Hero Banner */
          <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="mx-auto max-w-5xl text-center space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-black bg-black px-4 py-1.5 text-xs font-extrabold text-white shadow-sm">
                <Sparkles className="h-4 w-4 text-white fill-white" />
                <span>AI RESEARCH & INTERVIEW PREP KIT GENERATOR</span>
              </div>

              <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                Turn Any Job Description Into A{' '}
                <span className="underline decoration-zinc-900 underline-offset-8">
                  Personalised Interview Kit
                </span>
              </h1>

              <p className="text-base sm:text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed font-normal">
                Autonomous AI pipeline that researches target companies, extracts requirements, and generates tailored question banks, flashcards, and daily study schedules.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="btn-defi-mint flex items-center gap-2.5 rounded-2xl px-8 py-4 text-sm font-extrabold shadow-xl uppercase tracking-wider"
                >
                  <Sparkles className="h-5 w-5 stroke-[2.5]" />
                  <span>Get Started — Free</span>
                </button>
              </div>
            </div>
          </section>
        ) : selectedKitId && activeKit ? (
          /* Active Kit View or Generating State */
          activeKit.status === 'generating' || activeKit.status === 'pending' || generatingKitId === selectedKitId ? (
            <div className="mx-auto max-w-4xl py-12 px-4 space-y-6">
              <button
                onClick={() => setSelectedKitId(null)}
                className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-black transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-black" />
                <span>BACK TO DASHBOARD</span>
              </button>
              <ProgressWidget
                kitId={selectedKitId}
                onComplete={() => {
                  setGeneratingKitId(null);
                  fetchKitDetail(selectedKitId);
                  fetchKits();
                }}
              />
            </div>
          ) : (
            <KitDetailView
              kit={activeKit}
              onBack={() => setSelectedKitId(null)}
              onRefreshKit={() => fetchKitDetail(selectedKitId)}
            />
          )
        ) : (
          /* Logged-In User Dashboard */
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6 bg-white">
            {/* Dashboard Header Banner */}
            <div className="defi-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-zinc-200">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-md badge-defi-mint px-2.5 py-0.5 text-xs font-bold">
                  <span>DASHBOARD</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                  Your Interview Prep Kits
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                  Select a kit to practice flashcards, view study schedule, or export 1-page cheatsheets.
                </p>
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="btn-defi-mint flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold uppercase tracking-wider shadow-md shrink-0"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Create Prep Kit</span>
              </button>
            </div>

            {/* Multiple Filter Controls Bar */}
            <div className="defi-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-sans border border-zinc-200">
              {/* Left: Search input */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Search company or role..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="defi-input w-full rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-zinc-900 placeholder-zinc-400"
                />
              </div>

              {/* Middle: Timeline Filter Dropdown (1 day to 2 years) */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 font-semibold">Timeline:</span>
                <select
                  value={timelineFilter}
                  onChange={e => setTimelineFilter(e.target.value as 'all' | '1-3' | '4-14' | '15-60' | '61-180' | '181-730')}
                  className="defi-input rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 cursor-pointer"
                >
                  <option value="all">All Timelines (1d - 2y)</option>
                  <option value="1-3">1 - 3 Days (Sprint)</option>
                  <option value="4-14">4 - 14 Days (Short Term)</option>
                  <option value="15-60">15 - 60 Days (Medium Term)</option>
                  <option value="61-180">61 - 180 Days (Long Term)</option>
                  <option value="181-730">181d - 2 Years (Career Track)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 font-semibold">Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as 'all' | 'ready' | 'generating' | 'failed' | 'pending')}
                  className="defi-input rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="ready">Ready</option>
                  <option value="generating">Generating</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 font-semibold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'newest' | 'oldest' | 'timeline-asc' | 'timeline-desc' | 'company')}
                  className="defi-input rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="timeline-asc">Timeline (Short to Long)</option>
                  <option value="timeline-desc">Timeline (Long to Short)</option>
                  <option value="company">Company Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Kits Grid */}
            {loadingKits ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 text-black animate-spin" />
              </div>
            ) : filteredKits.length === 0 ? (
              <div className="defi-card rounded-3xl p-12 text-center space-y-4 border border-zinc-200">
                <Layers className="mx-auto h-12 w-12 text-zinc-400" />
                <h3 className="text-lg font-extrabold text-zinc-900">No Prep Kits Found</h3>
                <p className="text-xs font-medium text-zinc-500 max-w-md mx-auto">
                  {searchQuery ? 'No kits match your search filter.' : 'Create your first interview preparation kit by submitting a job description and company URL.'}
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="btn-defi-mint inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-extrabold uppercase tracking-wider shadow-md"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Create First Kit</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredKits.map(kit => (
                  <KitCard
                    key={kit._id}
                    kit={kit}
                    onSelect={id => setSelectedKitId(id)}
                    onDelete={handleDeleteKit}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={user => {
          setUser(user);
          fetchKits();
        }}
      />

      <CreateKitModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onKitCreated={handleKitCreated}
      />
    </div>
  );
}
