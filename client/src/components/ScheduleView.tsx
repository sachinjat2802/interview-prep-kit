'use client';

import React, { useState, useMemo } from 'react';
import { Schedule, Question, Requirement } from '../lib/types';
import { Calendar, Clock, AlertCircle, Sparkles, BookOpen, GraduationCap } from 'lucide-react';
import { QuestionStudyPanel } from './QuestionStudyPanel';

interface ScheduleViewProps {
  schedule: Schedule;
  questions: Question[];
  requirements: Requirement[];
  kitId: string;
  onRegenerateSchedule: () => void;
}

const ScheduleQuestionItem = ({ q, reqMap, kitId }: { q: Question, reqMap: Map<string, Requirement>, kitId: string }) => {
  const [showStudyPanel, setShowStudyPanel] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 font-sans">
        <div className="flex items-center gap-2">
          <span className="rounded bg-black px-2 py-0.5 text-[10px] font-extrabold text-white">
            {q.id}
          </span>
          <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-900 capitalize">
            {q.category}
          </span>
          <span className="text-[10px] font-bold text-zinc-700">
            Difficulty: {q.difficulty}/3
          </span>
        </div>
        <button
          onClick={() => setShowStudyPanel(!showStudyPanel)}
          className={`rounded flex items-center gap-1.5 px-2 py-1 transition-colors ${showStudyPanel ? 'bg-blue-100 text-blue-700 font-bold' : 'text-zinc-500 hover:bg-blue-50 hover:text-blue-600'}`}
          title="Deep Dive Study Mode"
        >
          <GraduationCap className="h-4 w-4" />
          <span className="text-[10px] uppercase font-bold hidden sm:inline">Deep Dive</span>
        </button>
      </div>

      <p className="text-sm font-bold text-zinc-900">{q.prompt}</p>
      <p className="text-xs text-zinc-800 bg-white p-2.5 rounded-lg border border-zinc-200 font-medium">
        {q.answer_outline}
      </p>

      {q.requirement_ids && q.requirement_ids.length > 0 && (
        <div className="flex items-center gap-2 pt-1 font-sans">
          <span className="text-[10px] font-semibold text-zinc-500">Covers requirements:</span>
          {q.requirement_ids.map(rid => {
            const req = reqMap.get(rid);
            return (
              <span key={rid} className="rounded bg-zinc-200 border border-zinc-300 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">
                {rid} {req?.priority === 'must' ? '(Must)' : ''}
              </span>
            );
          })}
        </div>
      )}

      {showStudyPanel && (
        <QuestionStudyPanel 
          kitId={kitId} 
          questionId={q.id} 
          prompt={q.prompt} 
          answerOutline={q.answer_outline} 
        />
      )}
    </div>
  );
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  questions,
  requirements,
  kitId,
  onRegenerateSchedule,
}) => {
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);

  const questionMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);
  const reqMap = useMemo(() => new Map(requirements.map(r => [r.id, r])), [requirements]);

  // Calculate must-have requirement coverage across schedule
  const { mustHaves, uncoveredMustHaves } = useMemo(() => {
    if (!schedule || !schedule.days) {
      return { mustHaves: [], uncoveredMustHaves: [] };
    }
    const scheduledQuestionIds = new Set<string>();
    for (const d of schedule.days) {
      for (const qid of d.question_ids) {
        scheduledQuestionIds.add(qid);
      }
    }
    const coveredReqIds = new Set<string>();
    for (const q of questions) {
      if (scheduledQuestionIds.has(q.id)) {
        for (const rid of q.requirement_ids) {
          coveredReqIds.add(rid);
        }
      }
    }
    const musts = requirements.filter(r => r.priority === 'must');
    const uncovered = musts.filter(r => !coveredReqIds.has(r.id));
    return { mustHaves: musts, uncoveredMustHaves: uncovered };
  }, [schedule, questions, requirements]);

  if (!schedule || !schedule.days || schedule.days.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-900">
        <Calendar className="mx-auto h-12 w-12 text-zinc-400 mb-3" />
        <h4 className="text-lg font-semibold text-zinc-900 mb-1">No Schedule Created</h4>
        <button
          onClick={onRegenerateSchedule}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
        >
          <Sparkles className="h-4 w-4" />
          <span>Build Schedule</span>
        </button>
      </div>
    );
  }

  const selectedDay = schedule.days.find(d => d.day === selectedDayNum) || schedule.days[0];

  return (
    <div className="space-y-6 bg-white text-zinc-900 font-sans">
      {/* Schedule Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div>
          <h4 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-black" />
            <span>{schedule.days_available}-Day Master Preparation Plan</span>
          </h4>
          <p className="text-xs text-zinc-600 mt-0.5 font-medium">
            Harder and must-have requirements are weighted toward earlier days. All session durations are exact integers.
          </p>
        </div>

        <div className="flex items-center gap-3 font-sans">
          <div className="rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-xs font-semibold">
            <span className="text-zinc-600">Must-Have Coverage: </span>
            <span className="font-extrabold text-black">
              {mustHaves.length - uncoveredMustHaves.length} / {mustHaves.length} Must-Haves Scheduled
            </span>
          </div>

          <button
            onClick={onRegenerateSchedule}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-extrabold text-zinc-900 hover:bg-zinc-100"
          >
            <Sparkles className="h-3.5 w-3.5 text-black" />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {uncoveredMustHaves.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2 font-sans font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            {uncoveredMustHaves.length} must-have requirements remain unscheduled: {uncoveredMustHaves.map(r => r.id).join(', ')}
          </span>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 font-sans">
        {schedule.days.map(d => {
          const isSelected = d.day === selectedDayNum;
          return (
            <button
              key={d.day}
              onClick={() => setSelectedDayNum(d.day)}
              className={`flex shrink-0 flex-col items-start gap-1 rounded-xl border p-3 min-w-[120px] transition-all text-left ${
                isSelected
                  ? 'border-black bg-black text-white shadow-md'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:text-black'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-black'}`}>Day {d.day}</span>
                <span className={`flex items-center gap-1 text-[10px] font-bold ${isSelected ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  <Clock className="h-3 w-3" />
                  {d.minutes}m
                </span>
              </div>
              <span className={`text-xs font-semibold truncate max-w-[110px] ${isSelected ? 'text-zinc-200' : 'text-zinc-900'}`}>
                {d.focus || 'General Prep'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Day Detail Card */}
      {selectedDay && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-black">
                Day {selectedDay.day} Focus Agenda
              </span>
              <h3 className="text-xl font-extrabold text-zinc-900 mt-0.5">{selectedDay.focus}</h3>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-4 py-2 border border-zinc-200 font-sans">
              <Clock className="h-4 w-4 text-black" />
              <span className="text-sm font-extrabold text-zinc-900">{selectedDay.minutes} minutes</span>
            </div>
          </div>

          {/* Assigned Questions */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-black" />
              <span>Assigned Questions for Day {selectedDay.day} ({selectedDay.question_ids.length})</span>
            </h4>

            {selectedDay.question_ids.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No specific questions assigned for this day. Use this day for general review.</p>
            ) : (
              <div className="space-y-3">
                {selectedDay.question_ids.map(qid => {
                  const q = questionMap.get(qid);
                  if (!q) return null;

                  return <ScheduleQuestionItem key={qid} q={q} reqMap={reqMap} kitId={kitId} />;
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
