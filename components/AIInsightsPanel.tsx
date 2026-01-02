import React from 'react';

type Insights = {
  keyFindings: string[];
  suggestions: string[];
  riskFlags: string[];
};

export default function AIInsightsPanel({ insights }: { insights: Insights }) {
  return (
    <aside className="glass-panel p-6 rounded-xl space-y-6 border border-cyber-neonBlue/20">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-sm font-bold tracking-widest text-white uppercase">Neural Insights</h3>
        <button className="rounded-full border border-cyber-neonBlue/50 px-3 py-1 text-[10px] text-cyber-neonBlue hover:bg-cyber-neonBlue hover:text-black transition-colors uppercase font-bold">
          Refresh Context
        </button>
      </div>

      <section>
        <h4 className="text-[10px] font-bold text-cyber-neonBlue uppercase tracking-wider mb-3">Key Patterns</h4>
        <ul className="space-y-2">
          {insights.keyFindings.map((f, i) => (
            <li key={i} className="text-xs text-gray-300 flex items-start">
               <span className="mr-2 text-cyber-neonBlue">›</span>
               {f}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="text-[10px] font-bold text-cyber-neonGreen uppercase tracking-wider mb-3">
          Optimization Strategy
        </h4>
        <ul className="space-y-2">
          {insights.suggestions.map((s, i) => (
            <li key={i} className="text-xs text-gray-300 flex items-start bg-cyber-neonGreen/5 p-2 rounded border-l-2 border-cyber-neonGreen">
               {s}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-3">Threat Detection</h4>
        <ul className="space-y-2">
          {insights.riskFlags.map((r, i) => (
            <li key={i} className="text-xs text-red-200 flex items-start">
              <svg className="w-3 h-3 mr-2 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {r}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}