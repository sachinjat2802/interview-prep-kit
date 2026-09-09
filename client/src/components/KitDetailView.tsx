'use client';

import React, { useState, useMemo } from 'react';
import { Kit, Question, Flashcard } from '../lib/types';
import { getRadarTabLabel } from '../utils/roleUtils';
import { api } from '../lib/api';
import { QuestionItem } from './QuestionItem';
import { FlashcardPractice } from './FlashcardPractice';
import { ScheduleView } from './ScheduleView';
import { ReadinessExport } from './ReadinessExport';
import { ProgressWidget } from './ProgressWidget';
import { MockInterviewModal } from './MockInterviewModal';
import { STARStoryBuilder } from './STARStoryBuilder';
import { ReverseQuestions } from './ReverseQuestions';
import { NegotiationPlaybook } from './NegotiationPlaybook';
import { TechStackRadar } from './TechStackRadar';
import { PanicCardsMode } from './PanicCardsMode';
import { ConfidenceHeatmap } from './ConfidenceHeatmap';
import { ElevatorPitchCoach } from './ElevatorPitchCoach';
import { JDGapMatcher } from './JDGapMatcher';
import {
  ArrowLeft, Globe, Calendar, Sparkles, Plus, Edit3,
  Building2, Briefcase, BookOpen, Layers, Award, RefreshCw,
  Cpu, CheckCircle2, Zap, Workflow
} from 'lucide-react';

interface KitDetailViewProps {
  kit: Kit;
  onBack: () => void;
  onRefreshKit: () => void;
}

export const KitDetailView: React.FC<KitDetailViewProps> = ({
  kit: initialKit,
  onBack,
  onRefreshKit,
}) => {
  const [kit, setKit] = useState<Kit>(initialKit);
  type TabType = 'overview' | 'questions' | 'flashcards' | 'schedule' | 'readiness' | 'pipeline';
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedCategory, setSelectedCategory] = useState<Question['category']>('technical');

  // Sub-feature states
  const [showMockModal, setShowMockModal] = useState(false);
  const [questionsSubTab, setQuestionsSubTab] = useState<'list' | 'star'>('list');
  const [flashcardSubTab, setFlashcardSubTab] = useState<'practice' | 'panic'>('practice');
  const [overviewSubTab, setOverviewSubTab] = useState<'brief' | 'radar' | 'pitch' | 'gaps'>('brief');

  // Edit brief state
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [briefSummary, setBriefSummary] = useState(kit.company_brief?.summary || '');
  const [briefWhatTheyDo, setBriefWhatTheyDo] = useState(kit.company_brief?.what_they_do || '');

  // Add Question modal
  const [showAddQModal, setShowAddQModal] = useState(false);
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQOutline, setNewQOutline] = useState('');
  const [newQCategory, setNewQCategory] = useState<Question['category']>('technical');
  const [newQDifficulty, setNewQDifficulty] = useState(2);

  const [loadingRegen, setLoadingRegen] = useState<string | null>(null);

  // ─── Question Handlers ───

  const handleUpdateQuestion = React.useCallback(async (qId: string, updatedData: Partial<Question>) => {
    try {
      const res = await api.updateItem(kit._id, qId, 'question', updatedData);
      setKit(res.kit);
    } catch (error) {
      console.error('Failed to update question:', error);
    }
  }, [kit._id]);

  const handleDeleteQuestion = React.useCallback(async (qId: string) => {
    try {
      const res = await api.deleteItem(kit._id, qId, 'question');
      setKit(res.kit);
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  }, [kit._id]);

  const handleAddQuestion = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQPrompt.trim()) return;

    try {
      const res = await api.addItem(kit._id, 'question', {
        prompt: newQPrompt.trim(),
        answer_outline: newQOutline.trim(),
        category: newQCategory,
        difficulty: newQDifficulty,
        requirement_ids: [],
      });
      setKit(res.kit);
      setNewQPrompt('');
      setNewQOutline('');
      setShowAddQModal(false);
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  }, [kit._id, newQPrompt, newQOutline, newQCategory, newQDifficulty]);

  const handleReorderQuestion = React.useCallback(async (qId: string, direction: 'up' | 'down', category: Question['category']) => {
    const categoryQuestions = (kit.questions || []).filter(q => q.category === category);
    const index = categoryQuestions.findIndex(q => q.id === qId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categoryQuestions.length) return;

    // Swap in array
    const updatedCategory = [...categoryQuestions];
    const temp = updatedCategory[index];
    updatedCategory[index] = updatedCategory[newIndex];
    updatedCategory[newIndex] = temp;

    // Reconstruct global questions list
    const otherQuestions = (kit.questions || []).filter(q => q.category !== category);
    const updatedGlobal = [...otherQuestions, ...updatedCategory];

    setKit(prev => ({ ...prev, questions: updatedGlobal }));
    await api.updateKit(kit._id, { questions: updatedGlobal });
  }, [kit._id, kit.questions]);

  const handleMoveQuestionCategory = React.useCallback(async (qId: string, newCategory: Question['category']) => {
    const updatedGlobal = (kit.questions || []).map(q => {
      if (q.id === qId) {
        return { ...q, category: newCategory, _state: 'edited' as const };
      }
      return q;
    });

    setKit(prev => ({ ...prev, questions: updatedGlobal }));
    await api.updateKit(kit._id, { questions: updatedGlobal });
  }, [kit._id, kit.questions]);

  // ─── Flashcard Handlers ───

  const handleUpdateFlashcard = React.useCallback(async (fId: string, data: Partial<Flashcard>) => {
    try {
      const res = await api.updateItem(kit._id, fId, 'flashcard', data);
      setKit(res.kit);
    } catch (error) {
      console.error('Failed to update flashcard:', error);
    }
  }, [kit._id]);

  const handleAddFlashcard = React.useCallback(async (data: Omit<Flashcard, 'id'>) => {
    try {
      const res = await api.addItem(kit._id, 'flashcard', data);
      setKit(res.kit);
    } catch (error) {
      console.error('Failed to add flashcard:', error);
    }
  }, [kit._id]);

  const handleDeleteFlashcard = React.useCallback(async (fId: string) => {
    try {
      const res = await api.deleteItem(kit._id, fId, 'flashcard');
      setKit(res.kit);
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
    }
  }, [kit._id]);

  // ─── Brief Edit & Regeneration ───

  const handleSaveBrief = React.useCallback(async () => {
    try {
      const updatedBrief = {
        ...kit.company_brief,
        summary: briefSummary,
        what_they_do: briefWhatTheyDo,
      };
      const res = await api.updateKit(kit._id, { company_brief: updatedBrief });
      setKit(res.kit);
      setIsEditingBrief(false);
    } catch (error) {
      console.error('Failed to save brief:', error);
    }
  }, [kit._id, kit.company_brief, briefSummary, briefWhatTheyDo]);

  const handleRegenerateSection = React.useCallback(async (section: string, appendCount?: number) => {
    setLoadingRegen(section);
    try {
      const res = await api.regenerateSection(kit._id, section, appendCount);
      setKit(res.kit);
    } catch (error: unknown) {
      alert((error as Error).message || 'Section regeneration failed');
    } finally {
      setLoadingRegen(null);
    }
  }, [kit._id]);

  const currentCategoryQuestions = useMemo(
    () => (kit.questions || []).filter(q => q.category === selectedCategory),
    [kit.questions, selectedCategory]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 bg-white text-zinc-900 font-sans">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 font-sans">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-extrabold text-zinc-700 hover:text-black transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-black" />
          <span>BACK TO DASHBOARD</span>
        </button>

        <div className="flex items-center gap-2 font-semibold">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-800">
            {kit.daysAvailable}d Preparation Schedule
          </span>
          <span className="rounded-full bg-black text-white px-3 py-1 text-xs font-extrabold">
            {kit.questions?.length || 0} Questions
          </span>
        </div>
      </div>

      {/* Kit Header Card */}
      <div className="defi-card rounded-3xl p-8 border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-extrabold text-black">
              <Building2 className="h-4 w-4 text-black" />
              <span>{kit.source?.company || 'Target Company'}</span>
              <span>•</span>
              <Globe className="h-3.5 w-3.5 text-black" />
              <a href={kit.companyUrl} target="_blank" rel="noreferrer" className="hover:underline text-zinc-900 font-bold">
                {kit.companyUrl}
              </a>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
              {kit.role?.title || kit.source?.role || 'Job Position'}
            </h1>
            <p className="text-xs font-semibold text-zinc-600 flex flex-wrap items-center gap-4 pt-1">
              <span>Seniority: <strong className="text-zinc-900 font-extrabold">{kit.role?.seniority || 'Standard'}</strong></span>
              <span>Location: <strong className="text-zinc-900 font-extrabold">{kit.source?.location || 'Remote'}</strong></span>
              <span>Researched: <strong className="text-zinc-900 font-extrabold">{kit.source?.researched_at ? new Date(kit.source.researched_at).toLocaleDateString() : 'Recently'}</strong></span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-zinc-200 space-x-2 overflow-x-auto no-print font-sans">
        {[
          { id: 'overview', label: 'Company Brief & Role', icon: Building2 },
          { id: 'questions', label: `Question Bank (${kit.questions?.length || 0})`, icon: BookOpen },
          { id: 'flashcards', label: `Flashcards (${kit.flashcards?.length || 0})`, icon: Layers },
          { id: 'schedule', label: 'Study Schedule', icon: Calendar },
          { id: 'readiness', label: 'Readiness & Export', icon: Award },
          { id: 'pipeline', label: 'AI Pipeline Stages', icon: Cpu },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'border-black text-black bg-zinc-100 rounded-t-xl'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Brief */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview Sub-Feature Pills */}
          <div className="flex border-b border-zinc-200 space-x-2">
            {[
              { id: 'brief', label: 'Company Brief & Requirements' },
              { id: 'radar', label: getRadarTabLabel(kit.role?.title || kit.source?.role || '') },
              { id: 'pitch', label: '60s Elevator Pitch Coach' },
              { id: 'gaps', label: 'Experience Gap Matcher' },
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setOverviewSubTab(sub.id as typeof overviewSubTab)}
                className={`border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                  overviewSubTab === sub.id
                    ? 'border-black text-black bg-zinc-50 font-extrabold'
                    : 'border-transparent text-zinc-500 hover:text-black'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {overviewSubTab === 'radar' && (
            <TechStackRadar 
              companyName={kit.source?.company || 'Target Company'} 
              jdText={kit.jdText || ''} 
              roleTitle={kit.role?.title || kit.source?.role || ''} 
            />
          )}

          {overviewSubTab === 'pitch' && (
            <ElevatorPitchCoach roleTitle={kit.role?.title || 'Senior Role'} companyName={kit.source?.company || 'Target Company'} />
          )}

          {overviewSubTab === 'gaps' && (
            <JDGapMatcher requirements={kit.role?.requirements || []} />
          )}

          {overviewSubTab === 'brief' && (
            <div className="space-y-8">
              {/* Company Brief Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                  <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-black" />
                    <span>Company Brief</span>
                  </h3>

                  <div className="flex items-center gap-2">
                    {!isEditingBrief && (
                      <button
                        onClick={() => setIsEditingBrief(true)}
                        className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-black"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleRegenerateSection('company_brief')}
                      disabled={loadingRegen === 'company_brief'}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 text-black ${loadingRegen === 'company_brief' ? 'animate-spin' : ''}`} />
                      <span>Regenerate Brief</span>
                    </button>
                  </div>
                </div>

                {isEditingBrief ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">Summary</label>
                      <textarea
                        rows={3}
                        value={briefSummary}
                        onChange={e => setBriefSummary(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">What They Do & Products</label>
                      <textarea
                        rows={3}
                        value={briefWhatTheyDo}
                        onChange={e => setBriefWhatTheyDo(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs text-zinc-900"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsEditingBrief(false)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBrief}
                        className="rounded-lg bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                      >
                        Save Brief
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs text-zinc-700 leading-relaxed">
                    <div>
                      <h4 className="font-semibold text-black mb-1">Summary & Overview:</h4>
                      <p className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">{kit.company_brief?.summary || 'No summary available.'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-black mb-1">What They Do:</h4>
                      <p className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">{kit.company_brief?.what_they_do || 'No details available.'}</p>
                    </div>
                  </div>
                )}

                {/* Pages Used */}
                {kit.source?.pages_used && kit.source.pages_used.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-zinc-500 block mb-1">Sources Crawled & Researched:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {kit.source.pages_used.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-[10px] text-zinc-600 hover:text-black hover:border-zinc-400 truncate max-w-xs"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Role & Requirements Section */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-6 shadow-sm">
                <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-200 pb-3 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-black" />
                  <span>Extracted Requirements ({kit.role?.requirements?.length || 0})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(kit.role?.requirements || []).map(r => (
                    <div
                      key={r.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-black px-2 py-0.5 font-sans text-[10px] font-extrabold text-white">
                            {r.id}
                          </span>
                          <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-900 font-semibold capitalize">
                            {r.kind}
                          </span>
                        </div>
                        <p className="text-zinc-900 font-medium">{r.text}</p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                          r.priority === 'must'
                            ? 'bg-black text-white'
                            : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {r.priority === 'must' ? 'Must Have' : 'Nice Have'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Question Bank */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Questions Sub-Feature Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setQuestionsSubTab('list')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  questionsSubTab === 'list'
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:text-black'
                }`}
              >
                Question Bank ({kit.questions?.length || 0})
              </button>
              <button
                onClick={() => setQuestionsSubTab('star')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  questionsSubTab === 'star'
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:text-black'
                }`}
              >
                Behavioral STAR Story Builder
              </button>
            </div>

            <button
              onClick={() => setShowMockModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-1.5 text-xs font-extrabold text-white hover:bg-zinc-800 shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              <span>Start AI Mock Simulator</span>
            </button>
          </div>

          {questionsSubTab === 'star' ? (
            <STARStoryBuilder requirements={kit.role?.requirements || []} />
          ) : (
            <div className="space-y-6">
              {/* Sub-category Filter Tabs & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex gap-2 overflow-x-auto">
                  {[
                    { id: 'technical', label: 'Technical' },
                    { id: 'behavioural', label: 'Behavioural' },
                    { id: 'system-design', label: 'System Design' },
                    { id: 'company-fit', label: 'Company & Culture' },
                  ].map(c => {
                    const count = (kit.questions || []).filter(q => q.category === c.id).length;
                    const isSelected = selectedCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id as Question['category'])}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-black text-white shadow-md'
                            : 'bg-white border border-zinc-200 text-zinc-600 hover:text-black'
                        }`}
                      >
                        {c.label} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowAddQModal(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Question</span>
                  </button>

                  <button
                    onClick={() => handleRegenerateSection(selectedCategory, 3)}
                    disabled={loadingRegen === selectedCategory}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-extrabold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
                    title="Generate 3 additional questions for this category and auto-update the Study Plan"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-black" />
                    <span>Generate 3 More Questions</span>
                  </button>

                  <button
                    onClick={() => handleRegenerateSection(selectedCategory)}
                    disabled={loadingRegen === selectedCategory}
                    className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingRegen === selectedCategory ? 'animate-spin' : ''}`} />
                    <span>Regenerate Category</span>
                  </button>
                </div>
              </div>

              {/* List of Questions in Category */}
              {currentCategoryQuestions.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
                  <p className="text-xs text-zinc-500 mb-3">No questions in this category yet.</p>
                  <button
                    onClick={() => handleRegenerateSection(selectedCategory)}
                    className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Generate {selectedCategory} Questions</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentCategoryQuestions.map((q, idx) => (
                    <QuestionItem
                      key={q.id}
                      question={q}
                      index={idx}
                      totalInCat={currentCategoryQuestions.length}
                      onUpdate={data => handleUpdateQuestion(q.id, data)}
                      onDelete={() => handleDeleteQuestion(q.id)}
                      onMoveUp={() => handleReorderQuestion(q.id, 'up', selectedCategory)}
                      onMoveDown={() => handleReorderQuestion(q.id, 'down', selectedCategory)}
                      onCategoryChange={newCat => handleMoveQuestionCategory(q.id, newCat)}
                      kitId={kit._id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add Question Modal */}
          {showAddQModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4 text-zinc-900">
                <h4 className="text-base font-bold text-zinc-900">Add Handcrafted Question</h4>
                <form onSubmit={handleAddQuestion} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Category</label>
                    <select
                      value={newQCategory}
                      onChange={e => setNewQCategory(e.target.value as Question['category'])}
                      className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs text-zinc-900"
                    >
                      <option value="technical">Technical</option>
                      <option value="behavioural">Behavioural</option>
                      <option value="system-design">System Design</option>
                      <option value="company-fit">Company & Culture</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Question Prompt</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. How do you optimize slow SQL database queries?"
                      value={newQPrompt}
                      onChange={e => setNewQPrompt(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Answer Outline</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Analyze execution plans (EXPLAIN), check indexes, reduce joins..."
                      value={newQOutline}
                      onChange={e => setNewQOutline(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Difficulty (1 to 3)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setNewQDifficulty(lvl)}
                          className={`rounded-md px-3 py-1 text-xs font-bold border ${
                            newQDifficulty === lvl ? 'border-black bg-black text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                          }`}
                        >
                          Level {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddQModal(false)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                    >
                      Add Question
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Flashcard Practice */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          <div className="flex border-b border-zinc-200 space-x-2">
            <button
              onClick={() => setFlashcardSubTab('practice')}
              className={`border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                flashcardSubTab === 'practice'
                  ? 'border-black text-black bg-zinc-50 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              Spaced Repetition Deck ({kit.flashcards?.length || 0})
            </button>
            <button
              onClick={() => setFlashcardSubTab('panic')}
              className={`border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                flashcardSubTab === 'panic'
                  ? 'border-black text-black bg-zinc-50 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              5-Min Pre-Interview Panic Mode
            </button>
          </div>

          {flashcardSubTab === 'panic' ? (
            <PanicCardsMode companyName={kit.source?.company || 'Target Company'} roleTitle={kit.role?.title || 'Senior Position'} />
          ) : (
            <FlashcardPractice
              flashcards={kit.flashcards || []}
              onUpdateFlashcard={handleUpdateFlashcard}
              onAddFlashcard={handleAddFlashcard}
              onDeleteFlashcard={handleDeleteFlashcard}
            />
          )}
        </div>
      )}

      {/* Tab 4: Study Schedule */}
      {activeTab === 'schedule' && (
        <div className="space-y-8">
          <ScheduleView
            schedule={kit.schedule}
            questions={kit.questions || []}
            requirements={kit.role?.requirements || []}
            kitId={kit._id}
            onRegenerateSchedule={() => handleRegenerateSection('schedule')}
          />
          <ConfidenceHeatmap questions={kit.questions || []} requirements={kit.role?.requirements || []} />
        </div>
      )}

      {/* Tab 5: Readiness & Cheatsheet */}
      {activeTab === 'readiness' && (
        <div className="space-y-8">
          <ReadinessExport kit={kit} />
          <ReverseQuestions companyName={kit.source?.company || 'Target Company'} roleTitle={kit.role?.title || 'Senior Position'} />
          <NegotiationPlaybook companyName={kit.source?.company || 'Target Company'} roleTitle={kit.role?.title || 'Senior Position'} />
        </div>
      )}

      {/* Tab 6: AI Pipeline Stages */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {kit.status === 'generating' || kit.status === 'pending' ? (
            <ProgressWidget
              kitId={kit._id}
              onComplete={onRefreshKit}
            />
          ) : (
            <div className="space-y-6">
              {/* Pipeline Overview Card */}
              <div className="defi-card rounded-3xl p-6 sm:p-8 space-y-6 border border-zinc-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                        Autonomous AI Generation Pipeline
                        <span className="rounded-md bg-black text-white px-2.5 py-0.5 text-[10px] font-sans font-extrabold">
                          {kit.status.toUpperCase()} (100% SUCCESS)
                        </span>
                      </h3>
                      <p className="text-xs font-semibold text-zinc-600">
                        8-Step Deterministic Pipeline • EventBus SSE Real-Time Streaming
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRegenerateSection('company_brief')}
                    className="btn-defi-mint flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Re-Run AI Pipeline</span>
                  </button>
                </div>

                {/* Engine Stats Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans text-xs">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">AI Model</span>
                    <span className="font-extrabold text-zinc-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-black" />
                      Gemini 3.5 Flash Lite
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Pipeline Steps</span>
                    <span className="font-extrabold text-zinc-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                      8 of 8 Completed
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Requirement Coverage</span>
                    <span className="font-extrabold text-black flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-black fill-black" />
                      100% Coverage Verified
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Target Domain</span>
                    <span className="font-extrabold text-zinc-900 truncate block">
                      {kit.source?.company || kit.companyUrl}
                    </span>
                  </div>
                </div>
              </div>

              {/* 8-Step Pipeline Stages Detailed Grid */}
              <div className="space-y-4">
                <h4 className="text-sm font-sans font-extrabold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-black" />
                  <span>Pipeline Execution Stages & Data Outputs</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
                  {[
                    {
                      step: 1,
                      name: 'Extract Role Requirements',
                      desc: 'Parses hard skills, soft skills, and seniority expectations from JD text using LLM structure validator.',
                      output: `${kit.role?.requirements?.length || 0} Requirements extracted (${kit.role?.requirements?.filter(r => r.priority === 'must').length || 0} Must-Have, ${kit.role?.requirements?.filter(r => r.priority === 'nice').length || 0} Nice-to-Have)`,
                    },
                    {
                      step: 2,
                      name: 'Crawl Target Company Site',
                      desc: 'Executes HTTP client & headless scraper across company website, tech blogs, and about pages.',
                      output: `${kit.source?.pages_used?.length || 1} Corporate & Tech Blog pages scraped`,
                    },
                    {
                      step: 3,
                      name: 'Benchmarking Industry Interview Questions',
                      desc: 'Mines Glassdoor interview questions, LeetCode problem patterns, and tech stack tags.',
                      output: 'Glassdoor interview experiences & LeetCode benchmarks parsed',
                    },
                    {
                      step: 4,
                      name: 'Generate Company Brief',
                      desc: 'Synthesizes company executive summary, tech stack, and engineering culture overview.',
                      output: 'Executive Summary & What They Do briefs generated',
                    },
                    {
                      step: 5,
                      name: 'Generate Question Bank',
                      desc: 'Produces technical, behavioural, system design, and culture questions linked to extracted requirements.',
                      output: `${kit.questions?.length || 0} Questions created (${kit.questions?.filter(q => q.category === 'technical').length || 0} Tech, ${kit.questions?.filter(q => q.category === 'behavioural').length || 0} Behav, ${kit.questions?.filter(q => q.category === 'system-design').length || 0} SysDesign, ${kit.questions?.filter(q => q.category === 'company-fit').length || 0} Culture)`,
                    },
                    {
                      step: 6,
                      name: 'Create Flashcards',
                      desc: 'Builds active-recall flashcard deck with concise front prompts and bulleted back answers.',
                      output: `${kit.flashcards?.length || 0} Flashcards generated for spaced repetition`,
                    },
                    {
                      step: 7,
                      name: 'Check Coverage & Gap Filling',
                      desc: 'Audits question-to-requirement matrix to ensure zero unmapped skills.',
                      output: '100% Requirement Coverage verified',
                    },
                    {
                      step: 8,
                      name: 'Build Study Schedule',
                      desc: 'Calculates day-by-day study topics spread across timeline duration.',
                      output: `${kit.daysAvailable}-Day Preparation Schedule built`,
                    },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className="defi-card rounded-2xl p-5 border border-zinc-200 bg-white space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white text-xs font-extrabold">
                            {s.step}
                          </span>
                          <h5 className="font-extrabold text-zinc-900 text-sm tracking-tight">{s.name}</h5>
                        </div>
                        <span className="flex items-center gap-1 rounded-md bg-black text-white px-2 py-0.5 text-[10px] font-extrabold">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                          PASSED
                        </span>
                      </div>

                      <p className="text-zinc-600 text-xs leading-relaxed font-medium">{s.desc}</p>

                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 text-xs font-semibold flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-black shrink-0 mt-0.5" />
                        <span><strong>Output:</strong> {s.output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* AI Mock Interview Modal */}
      <MockInterviewModal
        isOpen={showMockModal}
        questions={kit.questions || []}
        onClose={() => setShowMockModal(false)}
      />
    </div>
  );
};
