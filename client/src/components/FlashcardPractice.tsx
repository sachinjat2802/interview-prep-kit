'use client';

import React, { useState } from 'react';
import { Flashcard } from '../lib/types';
import { calculateSM2 } from '../lib/sm2';
import { RotateCw, Award, Plus, Layers, Sparkles, Tag, Zap, Clock, Brain } from 'lucide-react';

interface FlashcardPracticeProps {
  flashcards: Flashcard[];
  onUpdateFlashcard?: (cardId: string, data: Partial<Flashcard>) => void;
  onAddFlashcard: (card: Omit<Flashcard, 'id'>) => void;
  onDeleteFlashcard?: (cardId: string) => void;
}

export const FlashcardPractice: React.FC<FlashcardPracticeProps> = ({
  flashcards,
  onUpdateFlashcard,
  onAddFlashcard,
}) => {
  const [confidenceMap, setConfidenceMap] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="defi-card rounded-3xl p-10 text-center space-y-4 border border-zinc-200 bg-white text-zinc-900 font-sans">
        <Layers className="mx-auto h-12 w-12 text-zinc-400" />
        <h4 className="text-lg font-extrabold text-zinc-900">No Flashcards Available</h4>
        <p className="text-xs font-semibold text-zinc-600">Generate or add custom flashcards to start spaced repetition practice.</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-defi-mint inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider shadow-md"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add First Card</span>
        </button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex] || flashcards[0];
  const totalCards = flashcards.length;

  const ratedCount = Object.keys(confidenceMap).length;
  const avgConfidence = ratedCount > 0
    ? (Object.values(confidenceMap).reduce((a, b) => a + b, 0) / ratedCount).toFixed(1)
    : 'N/A';

  const handleRate = (score: number) => {
    setConfidenceMap(prev => ({
      ...prev,
      [currentCard.id]: score,
    }));

    // Compute SuperMemo-2 Spaced Repetition interval & ease factor
    const newSm2 = calculateSM2(score, currentCard.sm2);
    if (onUpdateFlashcard) {
      onUpdateFlashcard(currentCard.id, { sm2: newSm2 });
    }

    setIsFlipped(false);

    if (currentIndex < totalCards - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleRestartLeastConfident = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    onAddFlashcard({
      front: newFront.trim(),
      back: newBack.trim(),
      requirement_ids: [],
    });
    setNewFront('');
    setNewBack('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      {/* Session Progress Header */}
      <div className="defi-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-sans border border-zinc-200 bg-white">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[11px] text-zinc-600 font-semibold uppercase tracking-wider block">Card Progress</span>
            <div className="text-lg font-extrabold text-zinc-900 mt-0.5">
              {Math.min(currentIndex + 1, totalCards)} <span className="text-xs text-zinc-500 font-normal">/ {totalCards}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <span className="text-[11px] text-zinc-600 font-semibold uppercase tracking-wider block">Completed</span>
            <div className="text-lg font-extrabold text-black mt-0.5">
              {ratedCount} <span className="text-xs text-zinc-600 font-normal">({Math.round((ratedCount / totalCards) * 100)}%)</span>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div>
            <span className="text-[11px] text-zinc-600 font-semibold uppercase tracking-wider block">Avg Confidence</span>
            <div className="text-lg font-extrabold text-black mt-0.5">
              {avgConfidence} <span className="text-xs text-zinc-600 font-normal">/ 5.0</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-extrabold text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-black stroke-[2.5]" />
            <span>Add Card</span>
          </button>
          <button
            onClick={handleRestartLeastConfident}
            className="btn-defi-mint flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold text-white shadow-md"
          >
            <Sparkles className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Weakest First</span>
          </button>
        </div>
      </div>

      {/* Main Flashcard Display */}
      {sessionCompleted ? (
        <div className="defi-card rounded-3xl border border-zinc-300 bg-white p-10 text-center space-y-4 shadow-sm font-sans">
          <Award className="mx-auto h-16 w-16 text-black" />
          <h4 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Flashcard Session Complete!</h4>
          <p className="text-sm font-medium text-zinc-600 max-w-md mx-auto">
            You evaluated all {totalCards} flashcards with an average confidence rating of <span className="font-extrabold text-black">{avgConfidence} / 5.0</span>.
          </p>
          <div className="pt-3">
            <button
              onClick={handleRestartLeastConfident}
              className="btn-defi-mint inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-xs font-extrabold uppercase tracking-wider shadow-md"
            >
              <RotateCw className="h-4 w-4 stroke-[2.5]" />
              <span>Restart Session (Focus on Weakest)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 font-sans">
          {/* Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="defi-card group relative min-h-[280px] cursor-pointer rounded-3xl p-8 transition-all border border-zinc-200 bg-white hover:border-black shadow-md"
          >
            {/* Top Indicator */}
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 mb-6">
              <span className="font-extrabold uppercase tracking-wider text-black flex items-center gap-2">
                <Zap className="h-4 w-4 text-black fill-black" />
                {isFlipped ? 'Answer & Key Points (Back)' : 'Question Prompt (Front)'}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-600 group-hover:text-black transition-colors font-bold">
                <RotateCw className="h-3.5 w-3.5" />
                Click card to flip
              </span>
            </div>

            {/* Content */}
            <div className="flex min-h-[170px] items-center justify-center text-center px-4">
              {isFlipped ? (
                <p className="text-lg sm:text-xl font-bold text-zinc-900 leading-relaxed whitespace-pre-wrap font-sans">
                  {currentCard.back}
                </p>
              ) : (
                <p className="text-xl sm:text-2xl font-extrabold text-black leading-relaxed tracking-tight font-sans">
                  {currentCard.front}
                </p>
              )}
            </div>

            {/* Requirement tags & SM-2 Badge */}
            <div className="absolute bottom-5 left-8 right-8 flex items-center justify-between gap-2 text-xs font-semibold text-zinc-600">
              {currentCard.requirement_ids && currentCard.requirement_ids.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-black" />
                  {currentCard.requirement_ids.map(rid => (
                    <span key={rid} className="rounded-lg bg-zinc-100 border border-zinc-300 px-2 py-0.5 text-[10px] font-extrabold text-zinc-900">
                      {rid}
                    </span>
                  ))}
                </div>
              ) : <div />}

              {/* SM-2 Spaced Repetition Badge */}
              <div className="flex items-center gap-1.5 rounded-full border border-black/10 bg-zinc-50 px-2.5 py-1 text-[11px] font-extrabold text-black">
                <Brain className="h-3.5 w-3.5 text-black" />
                <span>SM-2 Interval: {currentCard.sm2?.interval || 1}d</span>
                <span className="text-zinc-400">•</span>
                <span>EF: {currentCard.sm2?.easeFactor ? currentCard.sm2.easeFactor.toFixed(2) : '2.50'}</span>
              </div>
            </div>
          </div>

          {/* Rating Scale Actions with SM-2 Preview */}
          <div className="defi-card rounded-2xl p-5 text-center border border-zinc-200 bg-white font-sans">
            <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-zinc-800 mb-3">
              <Clock className="h-4 w-4 text-black" />
              <span>SuperMemo-2 (SM-2) Spaced Repetition Evaluation</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 flex-wrap font-sans">
              {[
                { score: 1, label: '1 - Forgot', sub: '1 day' },
                { score: 2, label: '2 - Hard', sub: '1 day' },
                { score: 3, label: '3 - Good', sub: `${calculateSM2(3, currentCard.sm2).interval} days` },
                { score: 4, label: '4 - Easy', sub: `${calculateSM2(4, currentCard.sm2).interval} days` },
                { score: 5, label: '5 - Perfect', sub: `${calculateSM2(5, currentCard.sm2).interval} days` },
              ].map(item => (
                <button
                  key={item.score}
                  onClick={() => handleRate(item.score)}
                  className="group flex flex-col items-center rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-extrabold text-zinc-900 hover:bg-black hover:text-white transition-all shadow-sm"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] font-normal text-zinc-500 group-hover:text-zinc-300 mt-0.5">
                    Review in {item.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Flashcard Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4 text-zinc-900 font-sans">
            <h4 className="text-lg font-extrabold text-zinc-900">Add Custom Flashcard</h4>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Front (Question)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What is optimistic locking in PostgreSQL?"
                  value={newFront}
                  onChange={e => setNewFront(e.target.value)}
                  className="defi-input w-full rounded-xl p-3 text-xs font-medium text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Back (Answer)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Checking version numbers before update..."
                  value={newBack}
                  onChange={e => setNewBack(e.target.value)}
                  className="defi-input w-full rounded-xl p-3 text-xs font-medium text-zinc-900"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-defi-mint rounded-xl px-5 py-2 text-xs font-extrabold uppercase tracking-wider"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
