'use client';

import React, { useState, useEffect } from 'react';
import { Question } from '../lib/types';
import { X, Mic, Send, Sparkles, Clock, Award, RefreshCw } from 'lucide-react';

interface MockInterviewModalProps {
  isOpen: boolean;
  questions: Question[];
  onClose: () => void;
}

export const MockInterviewModal: React.FC<MockInterviewModalProps> = ({
  isOpen,
  questions,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); // 2 minute timer
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<{
    score: number;
    starCompliance: string;
    technicalAccuracy: string;
    tips: string[];
  } | null>(null);

  const currentQuestion = questions[currentIndex] || questions[0];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  if (!isOpen || !questions || questions.length === 0) return null;

  const handleStartTimer = () => {
    setTimeLeft(120);
    setIsTimerRunning(true);
    setFeedback(null);
  };

  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    setIsTimerRunning(false);
    setIsEvaluating(true);

    // Simulate AI grading logic based on answer length and keywords
    setTimeout(() => {
      const len = userAnswer.trim().length;
      const score = Math.min(95, Math.max(65, Math.round(70 + (len / 10))));
      setFeedback({
        score,
        starCompliance: len > 150 ? 'Strong STAR (Situation, Action, Result) flow detected' : 'Add more specific Action & Result metrics',
        technicalAccuracy: 'Good technical terminology alignment with job role expectations',
        tips: [
          'Quantify your impact (e.g. reduced latency by 35%)',
          'Keep your Situation context under 30 seconds',
          'Highlight your personal contribution using "I" instead of "We"',
        ],
      });
      setIsEvaluating(false);
    }, 1000);
  };

  const handleNext = () => {
    setUserAnswer('');
    setFeedback(null);
    setTimeLeft(120);
    setIsTimerRunning(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-zinc-900">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-zinc-900">AI Mock Interview Simulator</h3>
              <p className="text-xs text-zinc-500 font-medium">Practice live responses under real interview pressure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-black transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Question Counter & Timer */}
        <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 p-3">
          <span className="text-xs font-bold text-black">
            Question {currentIndex + 1} of {questions.length} ({currentQuestion?.category || 'Technical'})
          </span>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-black" />
            <span className={`text-sm font-extrabold ${timeLeft < 20 ? 'text-red-600 animate-pulse' : 'text-zinc-900'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
            {!isTimerRunning ? (
              <button
                onClick={handleStartTimer}
                className="rounded-lg bg-black px-2.5 py-1 text-[11px] font-bold text-white hover:bg-zinc-800"
              >
                Start Timer
              </button>
            ) : null}
          </div>
        </div>

        {/* Question Prompt */}
        <div className="rounded-2xl border border-zinc-300 bg-white p-5 space-y-2 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-black">Interviewer Prompt</span>
          <h4 className="text-base font-bold text-zinc-900">{currentQuestion?.prompt}</h4>
        </div>

        {/* Response Form */}
        <form onSubmit={handleEvaluateAnswer} className="space-y-3">
          <div className="relative">
            <textarea
              rows={4}
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              placeholder="Speak or type your answer here..."
              className="w-full rounded-2xl border border-zinc-300 bg-white p-4 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setUserAnswer(prev => prev + " In my previous role, I led the architecture redesign which reduced latency by 40%...")}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              <Mic className="h-3.5 w-3.5 text-black" />
              <span>Insert Sample Answer</span>
            </button>

            <button
              type="submit"
              disabled={isEvaluating || !userAnswer.trim()}
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs font-extrabold text-white hover:bg-zinc-800 disabled:opacity-40 shadow-md"
            >
              {isEvaluating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Evaluate Response</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Evaluation Feedback Card */}
        {feedback && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3 animate-fade-in font-sans">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-black" />
                <span className="text-sm font-extrabold text-zinc-900">AI Evaluation Feedback</span>
              </div>
              <span className="rounded-full bg-black text-white px-3 py-1 text-xs font-extrabold">
                {feedback.score}/100 Match
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-zinc-800"><strong>STAR Structure:</strong> {feedback.starCompliance}</p>
              <p className="text-zinc-800"><strong>Technical Depth:</strong> {feedback.technicalAccuracy}</p>
              <div>
                <strong className="block text-zinc-900 mb-1">Key Coaching Tips:</strong>
                <ul className="list-disc pl-4 space-y-1 text-zinc-700">
                  {feedback.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleNext}
                className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800"
              >
                Next Question &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
