'use client';

import React, { useState } from 'react';
import { Question } from '../lib/types';
import { ChevronUp, ChevronDown, Trash2, Edit3, Check, X, Tag, HelpCircle, BookOpen, Layers, GraduationCap } from 'lucide-react';
import { SystemDesignVisualizer } from './SystemDesignVisualizer';
import { QuestionStudyPanel } from './QuestionStudyPanel';
import { getCategoryLabel, isTechnicalRole } from '../utils/roleUtils';

interface QuestionItemProps {
  question: Question;
  index: number;
  totalInCat: number;
  onUpdate: (updatedData: Partial<Question>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCategoryChange: (newCategory: Question['category']) => void;
  kitId: string;
  roleTitle?: string;
}

function getCategoryOptions(roleTitle: string): Array<{ id: Question['category']; label: string }> {
  return [
    { id: 'technical', label: getCategoryLabel('technical', roleTitle) },
    { id: 'behavioural', label: getCategoryLabel('behavioural', roleTitle) },
    { id: 'system-design', label: getCategoryLabel('system-design', roleTitle) },
    { id: 'company-fit', label: getCategoryLabel('company-fit', roleTitle) },
  ];
}

export const QuestionItem: React.FC<QuestionItemProps> = React.memo(({
  question,
  index,
  totalInCat,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onCategoryChange,
  kitId,
  roleTitle = 'Job Position',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showStudyPanel, setShowStudyPanel] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [outline, setOutline] = useState(question.answer_outline);
  const [difficulty, setDifficulty] = useState(question.difficulty);

  const hasDiagram = question.answer_outline.includes('```mermaid');

  const handleSave = () => {
    onUpdate({
      prompt: prompt.trim(),
      answer_outline: outline.trim(),
      difficulty,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPrompt(question.prompt);
    setOutline(question.answer_outline);
    setDifficulty(question.difficulty);
    setIsEditing(false);
  };

  // State badge style
  const stateBadge = (() => {
    if (question._state === 'user_created') {
      return (
        <span className="rounded-full bg-black text-white px-2 py-0.5 text-[10px] font-bold">
          Handcrafted
        </span>
      );
    }
    if (question._state === 'edited') {
      return (
        <span className="rounded-full bg-zinc-800 text-white px-2 py-0.5 text-[10px] font-bold">
          User Edited
        </span>
      );
    }
    return (
      <span className="rounded-full bg-zinc-100 border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
        AI Draft
      </span>
    );
  })();

  return (
    <div className="group rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-400 shadow-sm text-zinc-900">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-xs font-bold text-white">
            Q{index + 1}
          </span>
          {stateBadge}

          {/* Difficulty Tag */}
          <div className="flex items-center gap-1 rounded-md bg-zinc-50 px-2 py-0.5 border border-zinc-200 text-xs text-zinc-900 font-sans font-semibold">
            <span>Difficulty:</span>
            <span className="font-extrabold">{question.difficulty}/3</span>
          </div>

          {/* Requirement Tags */}
          {question.requirement_ids && question.requirement_ids.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-600 font-sans font-medium">
              <Tag className="h-3 w-3 text-black" />
              {question.requirement_ids.map(rid => (
                <span key={rid} className="rounded bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-900 font-extrabold">
                  {rid}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-90 sm:opacity-70 group-hover:opacity-100 transition-opacity font-sans">
          {/* Category Selector */}
          <select
            value={question.category}
            onChange={e => onCategoryChange(e.target.value as Question['category'])}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-900 focus:outline-none focus:border-black cursor-pointer"
            title="Move category"
          >
            {getCategoryOptions(roleTitle).map(c => (
              <option key={c.id} value={c.id}>
                Move to {c.label}
              </option>
            ))}
          </select>

          {/* Reorder Buttons */}
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-black disabled:opacity-30"
            title="Move Up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalInCat - 1}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-black disabled:opacity-30"
            title="Move Down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {!isEditing && (
            <>
              <button
                onClick={() => setShowStudyPanel(!showStudyPanel)}
                className={`rounded flex items-center gap-1.5 px-2 py-1 transition-colors ${showStudyPanel ? 'bg-blue-100 text-blue-700 font-bold' : 'text-zinc-500 hover:bg-blue-50 hover:text-blue-600'}`}
                title="Deep Dive Study Mode"
              >
                <GraduationCap className="h-4 w-4" />
                <span className="text-[10px] uppercase font-bold hidden sm:inline">Deep Dive</span>
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-black"
                title="Edit Question"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </>
          )}

          <button
            onClick={onDelete}
            className="rounded p-1 text-zinc-500 hover:bg-red-50 hover:text-red-600"
            title="Delete Question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isEditing ? (
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Question Prompt</label>
            <textarea
              rows={2}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Answer Outline & Key Talking Points</label>
            <textarea
              rows={3}
              value={outline}
              onChange={e => setOutline(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Difficulty (1 to 3)</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`rounded-md px-3 py-1 text-xs font-bold border transition-colors ${
                    difficulty === lvl
                      ? 'border-black bg-black text-white'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                  }`}
                >
                  Level {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-zinc-900 leading-relaxed flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-black shrink-0 mt-0.5" />
            <span>{question.prompt}</span>
          </h5>
          <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800 border border-zinc-200 leading-relaxed font-sans">
            <div className="flex items-center justify-between font-semibold text-black text-[11px] mb-1">
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Answer Outline:</span>
              </div>
              {hasDiagram && (
                <button
                  onClick={() => setShowVisualizer(!showVisualizer)}
                  className="flex items-center gap-1.5 rounded-lg border border-black bg-black px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>
                    {showVisualizer 
                      ? 'Hide Diagram' 
                      : isTechnicalRole(roleTitle) 
                        ? 'View Architecture & Trade-Off Blueprint' 
                        : 'View Workflow & Process Mindmap'}
                  </span>
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap">
              {question.answer_outline.replace(/```mermaid[\s\S]*?```/g, '').trim()}
            </p>
          </div>

          {hasDiagram && showVisualizer && (
            <SystemDesignVisualizer prompt={question.prompt} answerOutline={question.answer_outline} />
          )}

          {showStudyPanel && (
            <QuestionStudyPanel 
              kitId={kitId} 
              questionId={question.id} 
              prompt={question.prompt} 
              answerOutline={question.answer_outline} 
            />
          )}
        </div>
      )}
    </div>
  );
});
