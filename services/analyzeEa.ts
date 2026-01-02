// src/services/aiService.ts
// ✅ Vite แนะนำใช้ import.meta.env (ตั้งค่าใน .env เป็น VITE_AI_SERVICE_URL=...)
// ✅ รองรับทั้ง analyze-ea และ myfxbook proxy (POST เท่านั้น ปลอดภัยกว่า)

const AI_SERVICE_URL =
  (import.meta as any).env?.VITE_AI_SERVICE_URL ??
  "http://127.0.0.1:8000";

// -----------------------------
// EA Analyze types
// -----------------------------
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

// -----------------------------
// Myfxbook proxy types
// -----------------------------
export interface MyfxbookLoginResponse {
  error: boolean;
  message: string;
  session?: string;         // raw (มี + / ==)
  sessionEncoded?: string;  // urlencoded (%2B %3D)
}

export interface MyfxbookAccount {
  id: number;
  name: string;
  accountId: number;
  gain?: number;
  absGain?: number;
  daily?: number;
  monthly?: number;
  deposits?: number;
  withdrawals?: number;
  interest?: number;
  profit?: number;
  balance?: number;
  drawdown?: number;
  equity?: number;
  currency?: string;
  demo?: boolean;
  lastUpdateDate?: string;
  server?: { name?: string };
  [k: string]: any;
}

export interface MyfxbookAccountsResponse {
  error: boolean;
  message: string;
  accounts: MyfxbookAccount[];
}

// -----------------------------
// helpers
// -----------------------------
async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error (${res.status}): ${text || "Unknown error"}`);
  }

  return (await res.json()) as T;
}

// -----------------------------
// API functions
// -----------------------------
export async function analyzeEa(payload: AnalyzeEaPayload) {
  return postJson<AnalyzeEaResponse>("/analyze-ea", payload);
}

export async function myfxbookLogin(email: string, password: string) {
  // ✅ POST เท่านั้น (อย่าใช้ GET ใส่รหัสผ่านใน URL)
  return postJson<MyfxbookLoginResponse>("/myfxbook-proxy/login.json", {
    email,
    password,
  });
}

export async function myfxbookGetMyAccounts(session: string) {
  // ✅ ส่ง raw session (ที่มี + และ ==) ได้เลย
  return postJson<MyfxbookAccountsResponse>(
    "/myfxbook-proxy/get-my-accounts.json",
    { session }
  );
}
