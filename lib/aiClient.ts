
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

export interface AnalyzeEaTradePayload {
  open_time: string;
  close_time: string;
  symbol: string;
  direction: string;
  lot: number;
  open_price: number;
  close_price: number;
  pips: number;
  profit: number;
}

export interface AnalyzeEaPayload {
  ea_name: string;
  account_id: number;
  symbol: string;
  timeframe: string;
  trades: AnalyzeEaTradePayload[];
}

export interface SummaryMetrics {
  total_trades: number;
  win_rate: number;
  loss_rate: number;
  expectancy: number;
  profit_factor: number | null;
  max_drawdown: number;
  max_drawdown_pct: number | null;
}

export interface AnalyzeEaResponse {
  summaryMetrics: SummaryMetrics;
  riskFlags: { type: string; level: string; message: string }[];
  regimeStats: Record<string, any>;
  anomalies: { index: number; type: string; message: string }[];
  suggestions: { type: string; priority: string; text: string }[];
  regime_breakdown?: Record<string, number>;
}

export async function analyzeEa(
  payload: AnalyzeEaPayload
): Promise<AnalyzeEaResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/analyze-ea`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `AI service error (${res.status}): ${text || "Unknown error"}`
    );
  }

  const data = (await res.json()) as AnalyzeEaResponse;
  return data;
}
