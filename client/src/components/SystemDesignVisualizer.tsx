'use client';

import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Layers, AlertCircle, RefreshCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface SystemDesignVisualizerProps {
  prompt: string;
  answerOutline: string;
}

export const SystemDesignVisualizer: React.FC<SystemDesignVisualizerProps> = ({ prompt, answerOutline }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract the mermaid code block from the answer outline
  const extractMermaidCode = (text: string) => {
    const match = text.match(/```mermaid\n([\s\S]*?)```/i) || text.match(/```mermaid([\s\S]*?)```/i);
    return match ? match[1].trim() : null;
  };

  const mermaidCode = extractMermaidCode(answerOutline);

  useEffect(() => {
    if (!mermaidCode) {
      setLoading(false);
      setError('No Mermaid diagram found in the answer outline.');
      return;
    }

    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        fontFamily: 'Inter, sans-serif',
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#000000',
        lineColor: '#000000',
        secondaryColor: '#f4f4f5',
        tertiaryColor: '#e4e4e7',
      },
      securityLevel: 'loose',
    });

    const renderDiagram = async () => {
      try {
        setLoading(true);
        setError('');
        // Generate a unique ID for the render
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        setSvg(svg);
      } catch (err: unknown) {
        console.error('Mermaid rendering failed', err);
        setError((err as Error).message || 'Failed to render diagram.');
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [mermaidCode]);

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 font-sans text-zinc-900 shadow-sm overflow-hidden">
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
            System Design & Architecture Blueprint
          </h4>
        </div>

        {!loading && !error && svg && (
          <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1 border border-zinc-200">
            <button 
              onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} 
              className="p-1.5 hover:bg-white rounded text-zinc-600 hover:text-black transition-colors" 
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setScale(1)} 
              className="px-2 py-1 hover:bg-white rounded text-[10px] font-bold text-zinc-600 hover:text-black transition-colors min-w-[3rem]" 
              title="Reset Zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button 
              onClick={() => setScale(s => Math.min(s + 0.25, 3))} 
              className="p-1.5 hover:bg-white rounded text-zinc-600 hover:text-black transition-colors" 
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Render Area */}
      <div className="relative min-h-[200px] w-full flex items-center justify-center bg-zinc-50 rounded-xl border border-zinc-200 p-4 overflow-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center space-y-2 text-zinc-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-xs font-semibold">Generating diagram...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center space-y-2 text-red-500 max-w-lg text-center">
            <AlertCircle className="h-6 w-6" />
            <span className="text-xs font-semibold">Diagram Generation Failed</span>
            <p className="text-[10px] text-zinc-600 bg-white p-2 rounded border border-zinc-200 break-all text-left w-full">
              {error}
            </p>
            <div className="text-[10px] text-zinc-500 mt-2 bg-white p-2 rounded border border-zinc-200 w-full whitespace-pre-wrap text-left">
              <strong>Raw Code:</strong>
              <br />
              {mermaidCode}
            </div>
          </div>
        )}

        {!loading && !error && svg && (
          <div className="w-full h-full overflow-auto">
            <style>{`
              .mermaid-zoom-wrapper svg {
                width: 100% !important;
                max-width: none !important;
                height: auto !important;
              }
            `}</style>
            <div 
              ref={containerRef}
              className="mermaid-zoom-wrapper flex justify-center transition-all duration-200 ease-out origin-top-left"
              style={{ width: `${scale * 100}%`, minWidth: `${scale * 100}%` }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
