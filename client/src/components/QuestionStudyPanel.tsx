import React, { useState, useRef, useEffect } from 'react';
import { Network, Brain, MessageSquare, Send, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { SystemDesignVisualizer } from './SystemDesignVisualizer';

interface QuestionStudyPanelProps {
  kitId: string;
  questionId: string;
  prompt: string;
  answerOutline: string;
}

export const QuestionStudyPanel: React.FC<QuestionStudyPanelProps> = ({ kitId, questionId, prompt, answerOutline }) => {
  const [tab, setTab] = useState<'mindmap' | 'technique' | 'chat'>('mindmap');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mindmap state
  const [mindmapData, setMindmapData] = useState<string | null>(null);

  // Technique state
  const [technique, setTechnique] = useState('Feynman Technique');
  const [techniqueExplanation, setTechniqueExplanation] = useState<string | null>(null);

  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleGenerateMindmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.generateMindmap(kitId, questionId);
      setMindmapData(res.result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate mind map');
    } finally {
      setLoading(false);
    }
  };

  const handleExplainTechnique = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.explainTechnique(kitId, questionId, technique);
      setTechniqueExplanation(res.result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim() || loading) return;

    const message = chatMessage.trim();
    setChatMessage('');
    const newHistory = [...chatHistory, { role: 'user' as const, content: message }];
    setChatHistory(newHistory);
    
    setLoading(true);
    setError(null);
    try {
      const res = await api.chatStudy(kitId, questionId, message, newHistory);
      setChatHistory([...newHistory, { role: 'assistant', content: res.result }]);
    } catch (err: any) {
      setError(err.message || 'Chat failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden font-sans">
      <div className="flex border-b border-blue-200 bg-white px-2 pt-2 gap-1">
        <button
          onClick={() => setTab('mindmap')}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-xs font-bold transition-colors ${
            tab === 'mindmap' ? 'bg-blue-50 text-blue-700 border-x border-t border-blue-200' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Network className="h-4 w-4" />
          Mind Map
        </button>
        <button
          onClick={() => setTab('technique')}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-xs font-bold transition-colors ${
            tab === 'technique' ? 'bg-blue-50 text-blue-700 border-x border-t border-blue-200' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Brain className="h-4 w-4" />
          Learning Technique
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-xs font-bold transition-colors ${
            tab === 'chat' ? 'bg-blue-50 text-blue-700 border-x border-t border-blue-200' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Ask AI
        </button>
      </div>

      <div className="p-4 bg-white min-h-[300px] relative">
        {error && <div className="mb-4 rounded bg-red-50 p-2 text-xs text-red-600 border border-red-200">{error}</div>}

        {/* MINDMAP TAB */}
        {tab === 'mindmap' && (
          <div className="space-y-4">
            {!mindmapData ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <p className="text-sm text-zinc-500 text-center max-w-sm">
                  Generate a visual breakdown of this question to understand the relationships between concepts.
                </p>
                <button
                  onClick={handleGenerateMindmap}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                  Generate Mind Map
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-200 overflow-hidden">
                <SystemDesignVisualizer prompt={prompt} answerOutline={mindmapData} />
              </div>
            )}
          </div>
        )}

        {/* TECHNIQUE TAB */}
        {tab === 'technique' && (
          <div className="space-y-4 flex flex-col h-full">
            <div className="flex items-center gap-2">
              <select
                value={technique}
                onChange={e => setTechnique(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Feynman Technique">Feynman Technique</option>
                <option value="Explain Like I'm 5">Explain Like I'm 5</option>
                <option value="Real-World Analogy">Real-World Analogy</option>
                <option value="Socratic Questioning">Socratic Questioning</option>
              </select>
              <button
                onClick={handleExplainTechnique}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                Explain
              </button>
            </div>
            
            <div className="flex-1 bg-zinc-50 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-800 whitespace-pre-wrap overflow-y-auto max-h-[400px]">
              {techniqueExplanation ? (
                techniqueExplanation
              ) : (
                <span className="text-zinc-400 italic">Select a technique and click Explain to deeply understand this concept.</span>
              )}
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {tab === 'chat' && (
          <div className="flex flex-col h-[400px]">
            <div className="flex-1 bg-zinc-50 rounded-lg border border-zinc-200 p-4 overflow-y-auto mb-3 space-y-4">
              {chatHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <p className="text-sm text-zinc-500 max-w-sm">
                    Ask cross-questions, clarify doubts, or request examples specifically related to this question.
                  </p>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendChat} className="flex gap-2 relative">
              <input
                type="text"
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!chatMessage.trim() || loading}
                className="absolute right-2 top-1.5 bottom-1.5 flex items-center justify-center rounded-lg bg-blue-600 px-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
