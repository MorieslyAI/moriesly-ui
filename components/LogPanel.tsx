
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-900/80 rounded-lg border border-slate-700 overflow-hidden">
      <div className="p-3 bg-slate-800 border-b border-slate-700">
        <h2 className="text-cyan-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Detection Log
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs md:text-sm">
        {logs.length === 0 && (
          <div className="text-slate-500 text-center italic mt-10">
            Waiting for visual input...
          </div>
        )}
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`p-3 rounded border-l-4 ${
              log.sender === 'spy' 
                ? 'bg-red-950/30 border-red-500 text-red-200' 
                : 'bg-slate-800/50 border-cyan-500 text-cyan-200'
            }`}
          >
            <div className="flex justify-between items-center mb-1 opacity-50 text-[10px]">
               <span>{log.sender === 'spy' ? 'MORIESLY AI' : 'TARGET'}</span>
               <span>{log.timestamp.toLocaleTimeString()}</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">
              {log.text}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogPanel;
