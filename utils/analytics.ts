
export interface Trade {
  id: number;
  time: string;
  type: string;
  lot: number;
  symbol: string;
  openPrice: number;
  closePrice: number;
  profit: number;
  cumulativeProfit: number;
}

export interface TradeStats {
  totalTrades: number;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface RiskFlag {
  type: 'drawdown' | 'streak' | 'edge' | 'timing';
  level: 'high' | 'medium' | 'low';
  message: string;
}

export interface SessionStats {
  session: string;
  count: number;
  totalProfit: number;
  avgProfit: number;
  winRate: number;
}

export const parseCSV = (csvText: string): Trade[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const trades: Trade[] = [];
  let cumulative = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length < 5) continue;

    // Expected format: Time,Type,Lot,Symbol,[OpenPrice,ClosePrice],Profit
    // If OpenPrice/ClosePrice missing, default to 0
    
    const profitStr = parts[parts.length - 1];
    const profit = parseFloat(profitStr);
    
    let openPrice = 0;
    let closePrice = 0;
    let type = parts[1];
    let lot = parseFloat(parts[2]) || 0;
    let symbol = parts[3];

    // Try to detect 7 column format (Example Data)
    if (parts.length >= 7) {
       openPrice = parseFloat(parts[4]) || 0;
       closePrice = parseFloat(parts[5]) || 0;
    }

    if (!isNaN(profit)) {
      cumulative += profit;
      trades.push({
        id: i,
        time: parts[0],
        type: type,
        lot: lot,
        symbol: symbol,
        openPrice: openPrice,
        closePrice: closePrice,
        profit: profit,
        cumulativeProfit: cumulative
      });
    }
  }

  return trades;
};

// Convert Myfxbook API history to internal Trade format
export const convertMyfxbookHistory = (history: any[]): Trade[] => {
  let cumulative = 0;
  // Myfxbook usually returns newest first? Or oldest first? 
  // Assuming we sort by openTime to be safe for equity curve
  const sortedHistory = [...history].sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime());

  return sortedHistory.map((h, index) => {
    const profit = Number(h.profit);
    cumulative += profit;
    return {
      id: index + 1,
      time: h.openTime,
      type: h.action,
      lot: parseFloat(h.sizing?.value || "0"),
      symbol: h.symbol,
      openPrice: h.openPrice,
      closePrice: h.closePrice,
      profit: profit,
      cumulativeProfit: cumulative
    };
  });
};

export const calculateStats = (trades: Trade[]): TradeStats => {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      netProfit: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      avgWin: 0,
      avgLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0
    };
  }

  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let maxDD = 0;
  let peak = -Infinity;
  let currentStreak = 0; // >0 wins, <0 losses
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  trades.forEach(t => {
    // Win/Loss
    if (t.profit >= 0) {
      wins++;
      grossProfit += t.profit;
      if (currentStreak > 0) currentStreak++;
      else currentStreak = 1;
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      grossLoss += Math.abs(t.profit);
      if (currentStreak < 0) currentStreak--;
      else currentStreak = -1;
      maxLossStreak = Math.max(maxLossStreak, Math.abs(currentStreak));
    }

    // Drawdown
    if (t.cumulativeProfit > peak) peak = t.cumulativeProfit;
    const dd = peak - t.cumulativeProfit;
    if (dd > maxDD) maxDD = dd;
  });

  return {
    totalTrades: trades.length,
    netProfit: trades[trades.length - 1].cumulativeProfit,
    winRate: (wins / trades.length) * 100,
    profitFactor: grossLoss === 0 ? grossProfit : grossProfit / grossLoss,
    maxDrawdown: maxDD,
    avgWin: wins > 0 ? grossProfit / wins : 0,
    avgLoss: (trades.length - wins) > 0 ? grossLoss / (trades.length - wins) : 0,
    consecutiveWins: maxWinStreak,
    consecutiveLosses: maxLossStreak
  };
};

export const detectRisks = (trades: Trade[], stats: TradeStats): RiskFlag[] => {
  const flags: RiskFlag[] = [];

  // Streak Risk
  if (stats.consecutiveLosses >= 5) {
    flags.push({
      type: 'streak',
      level: 'medium',
      message: `Detected consecutive loss streak of ${stats.consecutiveLosses} trades. Potential strategy breakdown in current conditions.`
    });
  }

  // Edge Risk
  // Expectancy approx = netProfit / totalTrades
  const expectancy = stats.totalTrades > 0 ? stats.netProfit / stats.totalTrades : 0;
  if (stats.winRate < 40 && expectancy <= 0) {
    flags.push({
      type: 'edge',
      level: 'high',
      message: `Win rate is ${stats.winRate.toFixed(1)}% with non-positive expectancy. The strategy may lack a statistical edge.`
    });
  }
  
  // Drawdown Warning (Heuristic: if DD is > 50% of Total Profit, it's risky)
  if (stats.netProfit > 0 && stats.maxDrawdown > stats.netProfit * 0.5) {
      flags.push({
          type: 'drawdown',
          level: 'high',
          message: `Max Drawdown is ${((stats.maxDrawdown/stats.netProfit)*100).toFixed(0)}% of Total Profit. Risk is high relative to return.`
      });
  }

  return flags;
};

export const analyzeSessions = (trades: Trade[]): SessionStats[] => {
    // 0-8 Asia, 8-16 London, 16-24 NY
    const sessions = {
        Asia: { count: 0, profit: 0, wins: 0 },
        London: { count: 0, profit: 0, wins: 0 },
        NY: { count: 0, profit: 0, wins: 0 }
    };

    trades.forEach(t => {
        // Simple heuristic for session based on Hour (0-23)
        // Adjust logic if timestamps are UTC and user wants local, 
        // but typically EA servers are GMT+2/3. We treat raw hour.
        const d = new Date(t.time);
        if (isNaN(d.getTime())) return;
        const hour = d.getHours();
        
        let sessionKey: keyof typeof sessions = 'NY';
        if (hour >= 0 && hour < 8) sessionKey = 'Asia';
        else if (hour >= 8 && hour < 16) sessionKey = 'London';
        
        sessions[sessionKey].count++;
        sessions[sessionKey].profit += t.profit;
        if (t.profit > 0) sessions[sessionKey].wins++;
    });

    return Object.entries(sessions).map(([name, data]) => ({
        session: name,
        count: data.count,
        totalProfit: data.profit,
        avgProfit: data.count > 0 ? data.profit / data.count : 0,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0
    })).sort((a,b) => b.totalProfit - a.totalProfit);
};
