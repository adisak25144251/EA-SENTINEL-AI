
import { analyzeEa, AnalyzeEaPayload } from './aiClient';

export interface EaConfig {
  id: number;
  name: string;
  symbol: string;
  timeframe: string;
  strategy: string;
}

export interface EaAnalysisResult {
  eaConfig: EaConfig;
  insights: any; // Maps to AnalyzeEaResponse
}

export async function analyzeEaByConfigId(id: number): Promise<EaAnalysisResult> {
  // Mock fetching EA configuration and trades from a database
  // In a real app, this would query your DB (Postgres/Mongo)
  const mockSymbol = "EURUSD";
  const mockTrades = generateMockTrades(50); 

  const payload: AnalyzeEaPayload = {
    ea_name: `EA_Config_${id}`,
    account_id: 1000 + id,
    symbol: mockSymbol,
    timeframe: "H1",
    trades: mockTrades
  };

  try {
    // Call the Python AI Service
    const aiResponse = await analyzeEa(payload);

    return {
      eaConfig: {
        id,
        name: payload.ea_name,
        symbol: payload.symbol,
        timeframe: payload.timeframe,
        strategy: "Hybrid Momentum (Mock)"
      },
      insights: aiResponse
    };
  } catch (error) {
    console.error(`Failed to analyze EA ${id}`, error);
    throw new Error(`Analysis service failed for EA ${id}`);
  }
}

// Helper to generate dummy data for the simulation
function generateMockTrades(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const isWin = Math.random() > 0.45;
    const profit = isWin ? 20 + Math.random() * 50 : -20 - Math.random() * 30;
    const openPrice = 1.0800 + (Math.random() * 0.05);
    
    return {
      open_time: new Date(Date.now() - (count - i) * 3600000 * 4).toISOString(),
      close_time: new Date(Date.now() - (count - i) * 3600000 * 4 + 3600000).toISOString(),
      symbol: "EURUSD",
      direction: Math.random() > 0.5 ? "BUY" : "SELL",
      lot: 0.1,
      open_price: openPrice,
      close_price: openPrice + (profit / 1000), // rough approx
      pips: profit / 10, // rough approx for standard lot
      profit: profit
    };
  });
}
