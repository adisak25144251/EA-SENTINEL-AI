import React from 'react';

export interface EaRow {
  id: number;
  eaName: string;
  symbol: string;
  timeframe: string;
  gain: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeLike: number;
  status: string;
}

interface EaRankingTableProps {
  rows: EaRow[];
}

const EaRankingTable: React.FC<EaRankingTableProps> = ({ rows }) => {
  return (
    <div className="glass-panel rounded-xl overflow-hidden animate-fade-in relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-neonBlue via-cyber-neonPurple to-cyber-neonPink"></div>
      <div className="p-5 flex justify-between items-center bg-white/5">
        <h3 className="font-bold text-white flex items-center gap-2 tracking-widest text-sm">
          <svg className="w-4 h-4 text-cyber-neonBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          ACTIVE ALGORITHMS
        </h3>
        <button className="text-[10px] bg-cyber-neonBlue/10 hover:bg-cyber-neonBlue hover:text-black text-cyber-neonBlue border border-cyber-neonBlue px-3 py-1 rounded transition-all uppercase font-bold tracking-wider">Expand Registry</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-black/40 text-[10px] uppercase font-bold text-cyber-neonBlue tracking-widest border-b border-white/10">
            <tr>
              <th className="px-6 py-4">Identity</th>
              <th className="px-6 py-4">Asset</th>
              <th className="px-6 py-4 text-right">Performance</th>
              <th className="px-6 py-4 text-right">Drawdown</th>
              <th className="px-6 py-4 text-right">PF</th>
              <th className="px-6 py-4 text-center">Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                <td className="px-6 py-5 font-bold text-white group-hover:text-cyber-neonPink transition-colors">
                  {row.eaName} 
                  <span className="text-[10px] text-gray-500 ml-2 border border-gray-700 rounded px-1 group-hover:border-cyber-neonPink group-hover:text-cyber-neonPink transition-colors">{row.timeframe}</span>
                </td>
                <td className="px-6 py-5 font-mono text-xs">{row.symbol}</td>
                <td className="px-6 py-5 text-right font-bold text-cyber-neonGreen drop-shadow-[0_0_5px_rgba(0,255,159,0.5)]">+{row.gain}%</td>
                <td className="px-6 py-5 text-right text-red-400">{row.maxDrawdown}%</td>
                <td className="px-6 py-5 text-right font-mono text-white">{row.profitFactor}</td>
                <td className="px-6 py-5 text-center">
                  <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wide border ${
                    row.status === 'Good' 
                      ? 'bg-cyber-neonGreen/10 text-cyber-neonGreen border-cyber-neonGreen/50 shadow-[0_0_10px_rgba(0,255,159,0.2)]' 
                      : 'bg-yellow-900/10 text-yellow-400 border-yellow-900/30'
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
               <tr>
                 <td colSpan={6} className="px-6 py-12 text-center text-gray-600 italic font-mono">NO ACTIVE SIGNALS DETECTED</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EaRankingTable;