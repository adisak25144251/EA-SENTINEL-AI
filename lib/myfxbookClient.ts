// lib/myfxbookClient.ts
// ✅ ใช้เรียกผ่าน FastAPI proxy ของคุณเท่านั้น (POST ไม่ใส่รหัสผ่านใน URL)

export type LoginResponse = {
  error: boolean;
  message: string;
  session?: string;         // decoded session (มีเครื่องหมาย + / =)
  sessionEncoded?: string;  // url-encoded
};

export type MyfxbookAccount = {
  id: number;          // Myfxbook internal id (ใช้เป็น parameter id ในหลาย method)
  name: string;
  accountId?: number;  // account number (บางทีใช้เพื่อแสดง)
  gain: number;
  absGain: number;
  daily: number;
  monthly: number;
  withdrawals: number;
  deposits: number;
  interest: number;
  profit: number;
  balance: number;
  drawdown: number;
  equity: number;
  equityPercent?: number;
  demo: boolean;
  lastUpdateDate: string;
  creationDate: string;
  firstTradeDate: string;
  tracking: number;
  views: number;
  commission: number;
  currency: string;
  profitFactor: number;
  pips: number;
  portfolio?: string;
  invitationUrl?: string;
  server?: { name?: string };

  // ✅ convenience field for UI
  broker?: string;
};

export type HistoryTx = {
  openTime: string;
  closeTime: string;
  symbol: string;
  action: string;
  sizing: { type: string; value: string | number };
  openPrice: number;
  closePrice: number;
  tp?: number;
  sl?: number;
  comment?: string;
  pips: number;
  profit: number;
  interest?: number;
  commission?: number;

  // ⚠️ เอกสาร API history ไม่ได้การันตี magic (แต่เผื่อไว้)
  magic?: number;
};

export type GetHistoryResponse = {
  error: boolean;
  message: string;
  history: HistoryTx[];
};

export type OpenTrade = {
  openTime: string;
  symbol: string;
  action: string;
  sizing: { type: string; value: string | number };
  openPrice: number;
  tp?: number;
  sl?: number;
  comment?: string;
  profit: number;
  pips: number;
  swap?: number;

  // ✅ เอกสาร API ระบุว่ามี magic ใน open-trades :contentReference[oaicite:1]{index=1}
  magic?: number;
};

export type GetOpenTradesResponse = {
  error: boolean;
  message: string;
  openTrades: OpenTrade[];
};

const AI_SERVICE_URL =
  (import.meta as any).env?.VITE_AI_SERVICE_URL?.toString() || "http://127.0.0.1:8000";

const PROXY_BASE = `${AI_SERVICE_URL}/myfxbook-proxy`;

async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Proxy response is not JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  // FastAPI validation errors
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d?.msg).filter(Boolean).join(", ")
          : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

// ✅ App ต้องการ "string session" ไม่ใช่ LoginResponse (แก้ TS 2345)
export async function loginMyfxbook(email: string, password: string): Promise<string> {
  const r = await postJson<LoginResponse>("/login.json", { email, password });
  if (r.error) throw new Error(r.message || "Myfxbook login failed");
  const session = r.session || "";
  if (!session) throw new Error("Login ok but session is empty");
  return session;
}

export async function getMyAccounts(session: string): Promise<MyfxbookAccount[]> {
  const r = await postJson<{ error: boolean; message: string; accounts: MyfxbookAccount[] }>(
    "/get-my-accounts.json",
    { session }
  );
  if (r.error) throw new Error(r.message || "get-my-accounts failed");

  // เติม broker ให้ UI ใช้ acc.broker ได้
  return (r.accounts || []).map((a) => ({
    ...a,
    broker: a?.broker || a?.server?.name || "",
  }));
}

// ✅ App ต้องการ history เป็น array (แก้ TS 2345 ของ convertMyfxbookHistory)
export async function getAccountHistory(session: string, accountId: number): Promise<HistoryTx[]> {
  const r = await postJson<GetHistoryResponse>("/get-history.json", { session, id: accountId });
  if (r.error) throw new Error(r.message || "get-history failed");
  return r.history || [];
}

// (เสริม) ใช้โชว์ magic ที่กำลังเปิดอยู่
export async function getOpenTrades(session: string, accountId: number): Promise<OpenTrade[]> {
  const r = await postJson<GetOpenTradesResponse>("/get-open-trades.json", { session, id: accountId });
  if (r.error) throw new Error(r.message || "get-open-trades failed");
  return r.openTrades || [];
}
