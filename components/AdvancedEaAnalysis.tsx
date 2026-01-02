import React, { useState } from 'react';
import { generateDeepStrategyReport } from '../services/geminiService';
import { Trade, TradeStats } from '../utils/analytics';

interface AdvancedEaAnalysisProps {
  trades: Trade[];
  stats: TradeStats | null;
}

const AdvancedEaAnalysis: React.FC<AdvancedEaAnalysisProps> = ({ trades, stats }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!trades || trades.length === 0 || !stats) return;
    
    setLoading(true);
    setError(null);
    try {
      // Create a CSV-like string for the prompt
      const tradeDataStr = trades.map(t => 
        `${t.time},${t.type},${t.lot},${t.symbol},${t.openPrice},${t.closePrice},${t.profit}`
      ).join('\n');
      
      const result = await generateDeepStrategyReport(tradeDataStr, stats);
      setReport(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Advanced Markdown Parser for the Audit Report
  const renderReport = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Header 1 (Report Title)
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-cyber-neonBlue mt-10 mb-6 border-b-2 border-cyber-neonBlue/50 pb-4 tracking-widest uppercase shadow-[0_4px_20px_rgba(0,243,255,0.1)]">{line.replace('# ', '')}</h1>;
      }
      
      // Header 2 (Section Titles)
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-xl font-bold text-cyber-neonPink mt-10 mb-4 flex items-center bg-white/5 p-3 rounded-r-lg border-l-4 border-cyber-neonPink">
            <span className="w-2 h-2 bg-cyber-neonPink mr-3 rounded-full animate-pulse"></span>
            {line.replace('## ', '')}
          </h2>
        );
      }
      
      // Header 3 (Subsections)
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold text-white mt-6 mb-2 pl-4 border-l-2 border-gray-600">{line.replace('### ', '')}</h3>;
      }
      
      // Verdict / Decision Highlighting
      if (line.includes('Verdict') && (line.includes('✅') || line.includes('⚠️') || line.includes('❌') || line.includes('🛠'))) {
             const parts = line.split(':');
             return (
               <div key={index} className="my-6 p-6 border-2 border-cyber-neonGreen/50 bg-cyber-neonGreen/10 rounded-xl shadow-[0_0_25px_rgba(0,255,159,0.15)] flex flex-col md:flex-row items-center justify-between">
                  <span className="font-bold text-cyber-neonGreen text-xl tracking-widest uppercase mb-2 md:mb-0">{parts[0]}</span>
                  <span className="text-white font-bold text-2xl">{parts.slice(1).join(':')}</span>
               </div>
             );
      }

      // Special Highlight for "Risk Flags" or "Strengths" if detected in list items
      if (line.trim().startsWith('- **')) {
        const parts = line.replace('- **', '').split('**:');
        if (parts.length > 1) {
            return (
            <li key={index} className="ml-4 mb-2 text-gray-300 list-none flex items-start group hover:bg-white/5 p-1 rounded transition-colors">
                <span className="text-cyber-neonBlue font-bold mr-2 mt-1">›</span>
                <div className="flex-1">
                    <span className="font-bold text-cyber-neonBlue mr-2">{parts[0]}:</span>
                    <span className="text-gray-200">{parts.slice(1).join('**:')}</span>
                </div>
            </li>
            );
        }
      }

      // Standard Lists
      if (line.trim().startsWith('- ')) {
        return <li key={index} className="ml-8 mb-1 text-gray-400 list-disc marker:text-cyber-neonPurple leading-relaxed">{line.replace('- ', '')}</li>;
      }

      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }

      // Standard Paragraphs
      return <p key={index} className="mb-2 text-gray-300 leading-relaxed font-mono text-sm pl-2">{line}</p>;
    });
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] glass-panel rounded-xl p-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-black/40 border border-gray-700 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2 tracking-widest">NO DATA STREAM DETECTED</h3>
        <p className="text-gray-500 max-w-md mb-6">
          The AI Analysis Core requires active trade data to generate a strategic audit. Please load data via the CSV or Myfxbook modules first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header / Control */}
      <div className="glass-panel p-6 rounded-xl flex flex-col md:flex-row justify-between items-center border-l-4 border-l-cyber-neonPink shadow-neon-pink">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest flex items-center">
            <svg className="w-8 h-8 mr-3 text-cyber-neonPink animate-pulse-fast" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            การวิเคราะห์เชิงลึกเชิงปริมาณ (Master Audit)
          </h2>
          <p className="text-xs text-cyber-neonPink/80 font-mono mt-1 pl-11">GLOBAL QUANT & EA AUDITOR • 3-PHASE VERIFICATION</p>
        </div>
        
        {!report && (
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className={`
              mt-4 md:mt-0 px-8 py-4 rounded font-bold uppercase tracking-widest shadow-lg transition-all
              flex items-center space-x-3 border-2
              ${loading 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700' 
                : 'bg-cyber-neonPink/10 text-cyber-neonPink border-cyber-neonPink hover:bg-cyber-neonPink hover:text-black hover:shadow-[0_0_30px_rgba(255,0,255,0.6)] hover:scale-105'
              }
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                RUNNING 3-PHASE AUDIT...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>START MASTER AUDIT</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-6 rounded-xl text-center font-mono text-sm shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <h3 className="text-xl font-bold mb-2">ANALYSIS INTERRUPTED</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Report Container */}
      {report && (
        <div className="glass-panel p-8 md:p-12 rounded-xl relative overflow-hidden animate-slide-up">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyber-neonBlue/5 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyber-neonPink/5 blur-[100px] rounded-full -ml-20 -mb-20 pointer-events-none"></div>
          <div className="absolute inset-0 bg-cyber-grid opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-4xl mx-auto">
            {renderReport(report)}
            
            <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-xs font-mono text-gray-500 gap-4">
              <div className="flex items-center">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                 GENERATED BY EA SENTINEL AI CORE (GEMINI 1.5 PRO)
              </div>
              <div className="tracking-widest">CONFIDENTIAL // INSTITUTIONAL USE ONLY</div>
              <button 
                onClick={() => setReport(null)}
                className="text-cyber-neonBlue hover:text-white underline"
              >
                START NEW ANALYSIS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedEaAnalysis;