import React, { useMemo } from 'react';
import { AnalysisResult } from '../types';
import { Trade, TradeStats, detectRisks, analyzeSessions } from '../utils/analytics';
import { EquityChart, PnLHistogram } from './Charts';
import AIInsightsPanel from './AIInsightsPanel';

interface DashboardProps {
  stats: TradeStats;
  trades: Trade[];
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
}

const StatCard: React.FC<{ label: string; value: string; trend?: string; color?: string }> = ({ label, value, trend, color = 'text-white' }) => (
  <div className="glass-panel p-5 rounded-xl relative overflow-hidden group hover:border-cyber-neonBlue/50 transition-all duration-300">
    <div className="text-[10px] text-cyber-neonBlue/60 font-bold uppercase tracking-[0.2em] mb-2 font-mono">{label}</div>
    <div className={`text-3xl font-bold ${color} z-10 relative font-sans drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>{value}</div>
    {trend && <div className="text-xs text-gray-400 mt-2 z-10 relative font-mono border-t border-white/5 pt-2 inline-block">{trend}</div>}
    
    {/* Decorative Elements */}
    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full"></div>
    <div className="absolute bottom-0 right-0 w-24 h-24 bg-cyber-neonBlue/5 blur-2xl rounded-full group-hover:bg-cyber-neonBlue/10 transition-all"></div>
  </div>
);

const CodeBlock: React.FC<{ title: string; code: string }> = ({ title, code }) => (
  <div className="bg-black/60 rounded-lg overflow-hidden border border-gray-800">
    <div className="bg-gray-900/80 px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-800 flex justify-between items-center">
      <span className="text-cyber-neonPink">{title}</span>
      <span className="text-cyber-neonGreen text-[10px] border border-cyber-neonGreen/30 px-1 rounded">PYTHON 3.9</span>
    </div>
    <div className="p-4 overflow-x-auto custom-scrollbar">
      <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">{code}</pre>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ stats, trades, analysis, isAnalyzing }) => {
  const risks = useMemo(() => detectRisks(trades, stats), [trades, stats]);
  const sessionStats = useMemo(() => analyzeSessions(trades), [trades]);

  const aiInsights = useMemo(() => {
    if (!analysis) return null;
    
    // Normalize anomalies to string[] as required by AIInsightsPanel
    const normalizedAnomalies = (analysis.anomalies as any[]).map((a: any) => {
        if (typeof a === 'string') return a;
        return `[${a.type}] Trade #${a.index}: ${a.message}`;
    });

    return {
      keyFindings: [
        `Market Regime: ${analysis.regime.type}`,
        `Confidence: ${(analysis.regime.confidence * 100).toFixed(0)}%`,
        `Volatility: ${analysis.features.volatility}`,
        `Equity Slope: ${analysis.features.equitySlope}`,
        analysis.regime.description
      ],
      suggestions: analysis.suggestions,
      riskFlags: normalizedAnomalies
    };
  }, [analysis]);

  if (trades.length === 0) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* 1. Quantitative Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard 
          label="NET PROFIT" 
          value={`$${stats.netProfit.toFixed(2)}`} 
          color={stats.netProfit >= 0 ? 'text-cyber-neonGreen' : 'text-red-500'}
        />
        <StatCard 
          label="PROFIT FACTOR" 
          value={stats.profitFactor.toFixed(2)} 
          color="text-cyber-neonBlue"
        />
        <StatCard 
          label="WIN RATE" 
          value={`${stats.winRate.toFixed(1)}%`} 
          trend={`${stats.totalTrades} EXECUTIONS`}
        />
        <StatCard 
          label="MAX DRAWDOWN" 
          value={`$${stats.maxDrawdown.toFixed(2)}`} 
          color="text-red-400"
        />
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl relative">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-white font-bold tracking-widest text-sm flex items-center">
               <span className="w-2 h-2 bg-cyber-neonBlue rounded-full mr-2 shadow-[0_0_8px_#00f3ff]"></span>
               EQUITY GROWTH CURVE
             </h3>
             <span className="text-[10px] text-gray-500 font-mono">REAL-TIME RENDER</span>
          </div>
          <EquityChart data={trades} />
        </div>
        <div className="glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="text-white font-bold tracking-widest text-sm mb-6 flex items-center">
             <span className="w-2 h-2 bg-cyber-neonPurple rounded-full mr-2 shadow-[0_0_8px_#bc13fe]"></span>
             PNL DISTRIBUTION
          </h3>
          <div className="flex-1 flex items-center min-h-[150px]">
            <PnLHistogram data={trades} />
          </div>
          <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-gray-500 block mb-1">AVG WIN</span>
              <span className="text-cyber-neonGreen font-bold">+${stats.avgWin.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">AVG LOSS</span>
              <span className="text-red-400 font-bold">-${stats.avgLoss.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">BEST RUN</span>
              <span className="text-white">{stats.consecutiveWins} WINS</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">WORST RUN</span>
              <span className="text-white">{stats.consecutiveLosses} LOSSES</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Deterministic Analysis (Risks & Sessions) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Flags */}
          <div className="glass-panel p-6 rounded-xl border-l-4 border-l-red-500/50">
            <h3 className="text-white font-bold mb-4 flex items-center tracking-widest text-sm">
              <svg className="w-5 h-5 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              RISK PROTOCOLS
            </h3>
            {risks.length > 0 ? (
                <ul className="space-y-3">
                    {risks.map((flag, idx) => (
                        <li key={idx} className={`p-3 rounded border ${flag.level === 'high' ? 'bg-red-900/10 border-red-500/50 text-red-200' : 'bg-yellow-900/10 border-yellow-500/50 text-yellow-200'}`}>
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{flag.type}</span>
                                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                            </div>
                            <div className="text-xs">{flag.message}</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <svg className="w-12 h-12 mb-2 opacity-20 text-cyber-neonGreen" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-xs font-mono">SYSTEM STABLE // NO THREATS</p>
                </div>
            )}
          </div>

          {/* Session Performance */}
          <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-neonBlue/50">
             <h3 className="text-white font-bold mb-4 flex items-center tracking-widest text-sm">
              <svg className="w-5 h-5 mr-3 text-cyber-neonBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              TEMPORAL ANALYSIS
            </h3>
            <div className="space-y-4">
                {sessionStats.map((sess) => (
                    <div key={sess.session} className="flex items-center justify-between p-3 bg-white/5 rounded hover:bg-white/10 transition-colors border border-transparent hover:border-cyber-neonBlue/30">
                        <div className="flex items-center space-x-4">
                             <div className={`w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] ${sess.totalProfit >= 0 ? 'bg-cyber-neonGreen text-cyber-neonGreen' : 'bg-red-500 text-red-500'}`}></div>
                             <div>
                                 <div className="font-bold text-sm text-white tracking-wide">{sess.session}</div>
                                 <div className="text-[10px] text-gray-500 font-mono">{sess.count} TRADES</div>
                             </div>
                        </div>
                        <div className="text-right">
                            <div className={`font-mono font-bold text-sm ${sess.totalProfit >= 0 ? 'text-cyber-neonGreen' : 'text-red-400'}`}>
                                {sess.totalProfit >= 0 ? '+' : ''}{sess.totalProfit.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-gray-500">WR: {sess.winRate.toFixed(0)}%</div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      </div>

      {/* 4. AI Analysis Section */}
      {isAnalyzing && (
        <div className="p-12 text-center border border-dashed border-cyber-neonPurple/30 rounded-xl bg-cyber-neonPurple/5 backdrop-blur-sm">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyber-neonPurple mb-4 shadow-[0_0_20px_rgba(188,19,254,0.5)]"></div>
          <p className="text-cyber-neonPurple font-mono animate-pulse">NEURAL NETWORK PROCESSING...</p>
        </div>
      )}

      {analysis && !isAnalyzing && aiInsights && (
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-2 pt-6">
            <div className="h-px bg-cyber-neonBlue/20 flex-1"></div>
            <span className="text-cyber-neonBlue font-mono text-xs tracking-[0.3em] uppercase glow-text">GENERATIVE INTELLIGENCE</span>
            <div className="h-px bg-cyber-neonBlue/20 flex-1"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: AI Insights Panel */}
            <div className="lg:col-span-1">
               <AIInsightsPanel insights={aiInsights} />
            </div>

            {/* Right Col: Regime & Code */}
            <div className="lg:col-span-2 space-y-6">
               {/* AI Regime Card (Compact) */}
              <div className="glass-panel p-6 rounded-xl border border-cyber-neonPink/30 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-48 h-48 text-cyber-neonPink" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <h3 className="text-cyber-neonPink font-bold uppercase tracking-widest text-xs mb-2">DETECTED REGIME</h3>
                    <div className="text-4xl font-bold text-white mb-2 drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]">{analysis.regime.type}</div>
                  </div>
                   <div className="text-right">
                       <div className="text-[10px] text-gray-500 font-mono tracking-widest">CONFIDENCE</div>
                       <div className="text-2xl font-bold text-cyber-neonBlue">{(analysis.regime.confidence * 100).toFixed(0)}%</div>
                   </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mt-4 border-t border-white/10 pt-4 font-light">{analysis.regime.description}</p>
              </div>

               {/* Python Modules */}
              <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white tracking-wide text-sm">GENERATED CODEBLOCKS</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">AUTO-DEPLOYED TO SENTINEL CORE</p>
                  </div>
                  <div className="flex space-x-1">
                     <div className="w-2 h-2 rounded-full bg-red-500"></div>
                     <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                     <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 gap-4 bg-black/40">
                    <CodeBlock title="train_regime_classifier.py" code={analysis.pythonTemplates.trainClassifier} />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;