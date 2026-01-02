
import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisSectionProps {
  result: AnalysisResult;
}

const CodeBlock: React.FC<{ title: string; code: string }> = ({ title, code }) => (
  <div className="mt-4 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
    <div className="bg-gray-800 px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-700 flex justify-between items-center">
      <span>{title}</span>
      <span className="text-trading-accent">Python Source</span>
    </div>
    <div className="p-4 overflow-x-auto">
      <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">{code}</pre>
    </div>
  </div>
);

const AnalysisSection: React.FC<AnalysisSectionProps> = ({ result }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-trading-card p-5 rounded-xl border-l-4 border-trading-accent shadow-lg">
          <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Dominant Regime</h3>
          <div className="text-2xl font-bold text-white mb-1">{result.regime.type}</div>
          <p className="text-sm text-gray-400">{result.regime.description}</p>
        </div>
        
        <div className="bg-trading-card p-5 rounded-xl border-l-4 border-purple-500 shadow-lg">
          <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Regime Breakdown</h3>
          <div className="text-sm text-white space-y-1">
             {result.regime.breakdown && Object.entries(result.regime.breakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                   <span className="text-gray-400">{k}:</span>
                   <span>{v}</span>
                </div>
             ))}
          </div>
        </div>

        <div className="bg-trading-card p-5 rounded-xl border-l-4 border-trading-warning shadow-lg">
          <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Volatility</h3>
          <div className="text-lg font-bold text-white">{result.features.volatility}</div>
          <div className="text-xs text-gray-500 mt-1">{result.features.equitySlope}</div>
        </div>
      </div>

      {/* Anomalies & Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-trading-card p-6 rounded-xl border border-gray-800">
          <h3 className="text-red-400 font-bold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Detected Anomalies
          </h3>
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {result.anomalies.map((note, i) => {
              const message = typeof note === 'string' ? note : `Trade #${note.index}: ${note.message}`;
              const type = typeof note === 'string' ? 'general' : note.type;
              return (
                <li key={i} className="text-sm text-gray-300 bg-red-900/20 p-2 rounded border-l-2 border-red-500">
                   {typeof note !== 'string' && <span className="block text-xs font-bold text-red-400 uppercase">{type}</span>}
                   {message}
                </li>
              );
            })}
            {result.anomalies.length === 0 && <li className="text-gray-500 italic">No major anomalies detected.</li>}
          </ul>
        </div>

        <div className="bg-trading-card p-6 rounded-xl border border-gray-800">
          <h3 className="text-trading-success font-bold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            AI Strategy Suggestions
          </h3>
          <ul className="space-y-2">
            {result.suggestions.map((rec, i) => (
              <li key={i} className="text-sm text-gray-300 bg-green-900/20 p-2 rounded border-l-2 border-trading-success">{rec}</li>
            ))}
            {result.suggestions.length === 0 && <li className="text-gray-500 italic">No specific suggestions generated.</li>}
          </ul>
        </div>
      </div>

      {/* Code Generation Section */}
      <div className="bg-trading-card p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-bold text-white mb-2">Live Analysis Module</h3>
        <p className="text-sm text-gray-400 mb-6">These templates represent the active logic running in your backend.</p>
        
        <div className="space-y-6 opacity-75 hover:opacity-100 transition-opacity">
           <div className="p-4 bg-gray-900 rounded border border-gray-700">
              <code className="text-sm text-blue-300 block mb-2"># Active Backend: ai-service/analysis_regime.py</code>
              <code className="text-xs text-gray-500 block">
                 Status: Connected to Python Microservice<br/>
                 Endpoint: /analyze-ea<br/>
                 Model: K-Means Clustering + Heuristic Rules
              </code>
           </div>
        </div>
      </div>

    </div>
  );
};

export default AnalysisSection;
