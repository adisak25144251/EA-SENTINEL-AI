import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisSectionProps {
  result: AnalysisResult;
}

const CodeBlock: React.FC<{ title: string; code: string }> = ({ title, code }) => (
  <div className="mt-4 bg-black/60 rounded-lg overflow-hidden border border-gray-800">
    <div className="bg-gray-900/80 px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-800 flex justify-between items-center">
      <span className="text-cyber-neonPink">{title}</span>
      <span className="text-cyber-neonGreen text-[10px] border border-cyber-neonGreen/30 px-1 rounded">PYTHON 3.9</span>
    </div>
    <div className="p-4 overflow-x-auto custom-scrollbar">
      <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{code}</pre>
    </div>
  </div>
);

const AnalysisSection: React.FC<AnalysisSectionProps> = ({ result }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border-l-4 border-cyber-neonBlue">
          <h3 className="text-cyber-neonBlue text-[10px] font-bold uppercase tracking-widest mb-2">Dominant Regime</h3>
          <div className="text-2xl font-bold text-white mb-1 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">{result.regime.type}</div>
          <p className="text-xs text-gray-400 font-mono">{result.regime.description}</p>
        </div>
        
        <div className="glass-panel p-5 rounded-xl border-l-4 border-cyber-neonPurple">
          <h3 className="text-cyber-neonPurple text-[10px] font-bold uppercase tracking-widest mb-2">Regime Breakdown</h3>
          <div className="text-xs text-white space-y-2 font-mono">
             {result.regime.breakdown && Object.entries(result.regime.breakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-white/5 pb-1">
                   <span className="text-gray-400">{k}:</span>
                   <span className="text-cyber-neonPurple">{v}</span>
                </div>
             ))}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border-l-4 border-yellow-500">
          <h3 className="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mb-2">Volatility Index</h3>
          <div className="text-lg font-bold text-white">{result.features.volatility}</div>
          <div className="text-[10px] text-gray-500 mt-1 font-mono">{result.features.equitySlope}</div>
        </div>
      </div>

      {/* Anomalies & Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl border border-red-500/20">
          <h3 className="text-red-400 font-bold mb-4 flex items-center tracking-widest text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            DETECTED ANOMALIES
          </h3>
          <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {result.anomalies.map((note, i) => {
              const message = typeof note === 'string' ? note : `Trade #${note.index}: ${note.message}`;
              const type = typeof note === 'string' ? 'general' : note.type;
              return (
                <li key={i} className="text-xs text-gray-300 bg-red-900/10 p-2 rounded border-l-2 border-red-500 font-mono">
                   {typeof note !== 'string' && <span className="block text-[10px] font-bold text-red-400 uppercase mb-1">{type}</span>}
                   {message}
                </li>
              );
            })}
            {result.anomalies.length === 0 && <li className="text-gray-500 italic text-xs">System Nominal. No anomalies.</li>}
          </ul>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-cyber-neonGreen/20">
          <h3 className="text-cyber-neonGreen font-bold mb-4 flex items-center tracking-widest text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            OPTIMIZATION STRATEGIES
          </h3>
          <ul className="space-y-2">
            {result.suggestions.map((rec, i) => (
              <li key={i} className="text-xs text-gray-300 bg-cyber-neonGreen/5 p-2 rounded border-l-2 border-cyber-neonGreen font-mono">{rec}</li>
            ))}
            {result.suggestions.length === 0 && <li className="text-gray-500 italic text-xs">Awaiting data input...</li>}
          </ul>
        </div>
      </div>

      {/* Code Generation Section */}
      <div className="glass-panel p-6 rounded-xl border border-white/10">
        <h3 className="text-lg font-bold text-white mb-2 tracking-widest">LIVE MODULE STATUS</h3>
        <p className="text-xs text-gray-400 mb-6 font-mono">ACTIVE BACKEND ENDPOINTS DETECTED</p>
        
        <div className="space-y-6 opacity-75 hover:opacity-100 transition-opacity">
           <div className="p-4 bg-black/40 rounded border border-cyber-neonBlue/30 shadow-[0_0_10px_rgba(0,243,255,0.05)]">
              <code className="text-xs text-cyber-neonBlue block mb-2 font-mono"># Active Backend: ai-service/analysis_regime.py</code>
              <code className="text-[10px] text-gray-500 block font-mono leading-relaxed">
                 STATUS: ONLINE<br/>
                 ENDPOINT: /analyze-ea<br/>
                 MODEL: K-MEANS + GEMINI HYBRID
              </code>
           </div>
        </div>
      </div>

    </div>
  );
};

export default AnalysisSection;