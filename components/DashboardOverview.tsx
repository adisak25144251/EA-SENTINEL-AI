import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Trade, TradeStats } from '../utils/analytics';
import { AnalysisResult } from '../types';
import OverviewCards from "./OverviewCards";

interface DashboardOverviewProps {
  stats: TradeStats | null;
  trades: Trade[];
  analysis: AnalysisResult | null;
}

const COLORS = ['#00f3ff', '#ff00ff', '#00ff9f', '#bc13fe', '#ffb700'];

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ stats, trades, analysis }) => {

  // --- 1. Data Preparation ---

  // Monthly Performance Data (Simulating Candles/Bars)
  const monthlyData = useMemo(() => {
    if (!trades.length) return [];
    const grouped: Record<string, number> = {};
    trades.forEach(t => {
      const date = new Date(t.time);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      grouped[key] = (grouped[key] || 0) + t.profit;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-12); // Last 12 months
  }, [trades]);

  // Symbol Allocation Data (Pie Chart)
  const symbolData = useMemo(() => {
    if (!trades.length) return [];
    const grouped: Record<string, number> = {};
    trades.forEach(t => {
      // Just count frequency or volume, here we use frequency
      grouped[t.symbol] = (grouped[t.symbol] || 0) + 1;
    });
    return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5
  }, [trades]);

  // Strategy Radar Data (Score 0-100)
  const radarData = useMemo(() => {
    if (!stats) return [];
    
    // Normalize metrics to 0-100 scale for visualization
    const profitability = Math.min((stats.profitFactor / 3) * 100, 100); // Target PF 3.0
    const reliability = stats.winRate; // Already 0-100
    const safety = Math.max(0, 100 - (stats.maxDrawdown / (stats.netProfit || 1) * 100)); // Lower DD is better
    const frequency = Math.min((stats.totalTrades / 100) * 100, 100); // Arbitrary scale
    const efficiency = stats.avgLoss !== 0 ? Math.min((stats.avgWin / Math.abs(stats.avgLoss)) * 50, 100) : 100;

    return [
      { subject: 'Profitability', A: profitability, fullMark: 100 },
      { subject: 'Win Rate', A: reliability, fullMark: 100 },
      { subject: 'Safety', A: safety, fullMark: 100 },
      { subject: 'Activity', A: frequency, fullMark: 100 },
      { subject: 'Risk/Reward', A: efficiency, fullMark: 100 },
    ];
  }, [stats]);


  // --- 2. Render Handlers ---

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] glass-panel rounded-xl p-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-black/40 border border-gray-700 flex items-center justify-center mb-6">
           <svg className="w-10 h-10 text-gray-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2 tracking-widest">AWAITING SIGNAL</h3>
        <p className="text-gray-500 max-w-md mb-6 font-mono">
          Please load trade data via CSV or Myfxbook to initialize the Command Center.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & KPI Cards */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-4 border-b border-white/10 pb-4">
        <div>
           <h2 className="text-3xl font-bold text-white tracking-widest font-sans flex items-center gap-2">
            <span className="text-cyber-neonBlue">COMMAND</span> CENTER
           </h2>
           <p className="text-xs text-gray-500 font-mono mt-1">REAL-TIME STRATEGY TELEMETRY</p>
        </div>
        {analysis && (
          <div className="bg-cyber-neonPurple/10 border border-cyber-neonPurple/50 px-4 py-2 rounded text-right">
             <div className="text-[10px] text-cyber-neonPurple font-bold uppercase tracking-wider">AI VERDICT</div>
             <div className="text-white font-bold">{analysis.regime.type} // {Math.round(analysis.regime.confidence * 100)}% CONF</div>
          </div>
        )}
      </div>

      <OverviewCards 
        overview={{
          totalEquity: stats.netProfit + 10000, // Assuming starting bal 10k for visual
          totalBalance: stats.netProfit + 10000,
          totalGain: parseFloat(((stats.netProfit / 10000) * 100).toFixed(2)),
          maxDrawdown: parseFloat(stats.maxDrawdown.toFixed(2)),
          winRate: stats.winRate / 100
        }} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: Monthly Performance (Bar) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl relative">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-white font-bold tracking-widest text-sm flex items-center">
               <span className="w-2 h-2 bg-cyber-neonGreen rounded-full mr-2 shadow-[0_0_8px_#00ff9f]"></span>
               MONTHLY PERFORMANCE
             </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(5, 5, 17, 0.9)', borderColor: '#00ff9f', color: '#fff' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#00ff9f' : '#ff3366'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Strategy Fingerprint (Radar) */}
        <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center relative">
           <h3 className="absolute top-6 left-6 text-white font-bold tracking-widest text-sm flex items-center">
             <span className="w-2 h-2 bg-cyber-neonPink rounded-full mr-2 shadow-[0_0_8px_#ff00ff]"></span>
             STRATEGY SCORE
           </h3>
           <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Strategy" dataKey="A" stroke="#ff00ff" strokeWidth={2} fill="#ff00ff" fillOpacity={0.2} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(5, 5, 17, 0.9)', borderColor: '#ff00ff', color: '#fff' }} />
              </RadarChart>
            </ResponsiveContainer>
           </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* CHART 3: Symbol Allocation (Pie) */}
         <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-white font-bold tracking-widest text-sm mb-4 flex items-center">
               <svg className="w-4 h-4 mr-2 text-cyber-neonBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
               ASSET ALLOCATION
            </h3>
            <div className="h-[250px] w-full flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={symbolData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {symbolData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(5, 5, 17, 0.9)', borderColor: '#fff' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* AI Suggestions List (Visualized) */}
         <div className="lg:col-span-2 glass-panel p-6 rounded-xl border-l-4 border-l-cyber-neonBlue">
            <h3 className="text-white font-bold tracking-widest text-sm mb-4 flex items-center">
               <svg className="w-4 h-4 mr-2 text-cyber-neonBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
               AI OPTIMIZATION VECTORS
            </h3>
            <div className="space-y-3">
               {analysis?.suggestions && analysis.suggestions.length > 0 ? (
                  analysis.suggestions.map((suggestion, idx) => (
                     <div key={idx} className="flex items-start p-3 bg-white/5 rounded hover:bg-white/10 transition-colors border border-transparent hover:border-cyber-neonBlue/30">
                        <span className="text-cyber-neonBlue font-mono text-xs mr-3 mt-1">0{idx + 1}</span>
                        <p className="text-sm text-gray-300 font-light">{suggestion}</p>
                     </div>
                  ))
               ) : (
                  <div className="text-center py-8 text-gray-500 font-mono text-sm">
                     NO OPTIMIZATION DATA AVAILABLE. RUN ANALYSIS MODULE.
                  </div>
               )}
            </div>
         </div>

      </div>
    </div>
  );
};

export default DashboardOverview;