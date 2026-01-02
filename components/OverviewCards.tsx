import React from 'react';

interface OverviewProps {
  overview: {
    totalEquity: number;
    totalBalance: number;
    totalGain: number;
    maxDrawdown: number;
    winRate: number;
  };
}

const Card: React.FC<{ label: string; value: string | number; suffix?: string; color?: string; glow?: string }> = ({ label, value, suffix, color = "text-white", glow }) => (
  <div className={`glass-panel p-5 rounded-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border-t border-t-white/10 ${glow ? 'shadow-[0_0_15px_' + glow + ']' : ''}`}>
    <div className="text-cyber-neonBlue/60 text-[10px] uppercase tracking-[0.2em] font-bold z-10 relative mb-2">{label}</div>
    <div className={`text-2xl font-bold ${color} z-10 relative font-sans`}>
      {value}<span className="text-sm ml-1 opacity-70">{suffix}</span>
    </div>
    <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
  </div>
);

const OverviewCards: React.FC<OverviewProps> = ({ overview }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
      <Card 
        label="TOTAL EQUITY" 
        value={overview.totalEquity.toLocaleString()} 
        suffix="$"
        color="text-white"
        glow="rgba(255,255,255,0.1)"
      />
      <Card 
        label="BALANCE" 
        value={overview.totalBalance.toLocaleString()} 
        suffix="$"
      />
      <Card 
        label="TOTAL GAIN" 
        value={"+" + overview.totalGain} 
        suffix="%" 
        color="text-cyber-neonGreen"
        glow="rgba(0,255,159,0.1)"
      />
      <Card 
        label="MAX DD" 
        value={overview.maxDrawdown} 
        suffix="%" 
        color="text-red-400"
      />
       <Card 
        label="WIN RATE" 
        value={(overview.winRate * 100).toFixed(0)} 
        suffix="%" 
        color="text-cyber-neonBlue"
      />
    </div>
  );
};

export default OverviewCards;