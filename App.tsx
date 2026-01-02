import React, { useState, useEffect, useRef } from 'react';
import { analyzeEa } from './lib/aiClient';
import { AnalysisResult } from './types';
import Dashboard from './components/Dashboard';
import AdvancedEaAnalysis from './components/AdvancedEaAnalysis';
import DashboardOverview from './components/DashboardOverview';
import CyberBackground from './components/CyberBackground';
import ChatBot from './components/ChatBot';
import { parseCSV, calculateStats, Trade, TradeStats, convertMyfxbookHistory } from './utils/analytics';

const EXAMPLE_DATA = `Time,Type,Lot,Symbol,OpenPrice,ClosePrice,Profit
2023-10-01 08:00,BUY,0.10,EURUSD,1.0500,1.0550,50.00
2023-10-01 12:00,SELL,0.10,EURUSD,1.0560,1.0540,20.00
2023-10-02 09:30,BUY,0.20,EURUSD,1.0520,1.0480,-80.00
2023-10-02 10:00,BUY,0.40,EURUSD,1.0470,1.0490,80.00
2023-10-03 14:00,SELL,0.10,GBPUSD,1.2100,1.2150,-50.00
2023-10-03 16:00,BUY,0.20,GBPUSD,1.2120,1.2140,40.00
2023-10-04 09:00,SELL,0.10,EURUSD,1.0500,1.0450,50.00
2023-10-04 11:00,BUY,0.50,EURUSD,1.0460,1.0440,-100.00
2023-10-05 08:00,BUY,0.10,EURUSD,1.0450,1.0480,30.00`;

const MT4_TEMPLATE = `Ticket,Open Time,Type,Size,Item,Open Price,S / L,T / P,Close Time,Close Price,Commission,Taxes,Swap,Profit`;

type ThemeType = 'cyberpunk' | 'neon-3d' | 'iridescent' | 'crystal';

/** --------------------------
 *  Myfxbook Proxy Types
 *  -------------------------- */
type MyfxbookAccount = {
  id: number; // ✅ ใช้ id นี้ยิง get-history.json
  name?: string;
  accountId?: number;
  currency?: string;
  gain?: number;
  profit?: number;
  broker?: string;
  server?: { name?: string } | any;
};

type MyfxbookLoginResponse = {
  error: boolean;
  message: string;
  session: string;
};

type MyfxbookAccountsResponse = {
  error: boolean;
  message: string;
  accounts: MyfxbookAccount[];
};

type MyfxbookHistoryRow = {
  openTime: string;
  closeTime: string;
  symbol: string;
  action: string;
  sizing?: { type?: string; value?: string };
  openPrice: number;
  closePrice: number;
  tp: number;
  sl: number;
  pips: number;
  profit: number;
  comment?: string;
  interest?: number;
  commission?: number;
};

type MyfxbookHistoryResponse = {
  error: boolean;
  message: string;
  history: MyfxbookHistoryRow[];
};

const normalizeSession = (s: string) => {
  // Myfxbook session ที่ backend ส่งมาอาจถูก percent-encode (%2F, %3D ฯลฯ)
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isBuySell = (action: string) => {
  const a = String(action || '').toLowerCase();
  return a === 'buy' || a === 'sell';
};

const defaultAiServiceUrl = () => {
  // ✅ ให้ทำงานได้ทั้งบน PC และเปิดจากมือถือใน LAN (ใช้ hostname ของหน้าเว็บ)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://127.0.0.1:8000';
};

const getAiServiceUrl = () => {
  const vite = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_AI_SERVICE_URL : undefined) as string | undefined;
  const next = (typeof process !== 'undefined' ? (process as any).env?.NEXT_PUBLIC_AI_SERVICE_URL : undefined) as string | undefined;
  const cra = (typeof process !== 'undefined' ? (process as any).env?.REACT_APP_AI_SERVICE_URL : undefined) as string | undefined;
  return vite || next || cra || defaultAiServiceUrl();
};

const AI_SERVICE_URL = getAiServiceUrl();

async function postProxy<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Proxy error ${res.status}: ${txt || res.statusText}`);
  }
  return (await res.json()) as T;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'csv' | 'myfxbook' | 'ai_analysis'>('ai_analysis');
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('cyberpunk');

  // CSV State - Initialized from LocalStorage if available
  const [tradeDataText, setTradeDataText] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ea_sentinel_trade_data');
      return saved || EXAMPLE_DATA;
    }
    return EXAMPLE_DATA;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Myfxbook State
  const [mfbEmail, setMfbEmail] = useState('');
  const [mfbPass, setMfbPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfbSession, setMfbSession] = useState('');
  const [mfbAccounts, setMfbAccounts] = useState<MyfxbookAccount[]>([]);
  const [mfbSelectedAccount, setMfbSelectedAccount] = useState<MyfxbookAccount | null>(null);

  // ✅ NEW: Filters
  const [mfbMagic, setMfbMagic] = useState(''); // optional (match inside comment)
  const [mfbCommentFilter, setMfbCommentFilter] = useState(''); // recommended

  const [mfbLoading, setMfbLoading] = useState(false);
  const [mfbError, setMfbError] = useState<string | null>(null);
  const [mfbInfo, setMfbInfo] = useState<string>(''); // small status line

  // Analysis State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>(''); // For AI Bot Status
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat Bot State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Auto-parse CSV when text changes AND Persist to LocalStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && tradeDataText) {
        localStorage.setItem('ea_sentinel_trade_data', tradeDataText);
      }

      const parsedTrades = parseCSV(tradeDataText);
      setTrades(parsedTrades);
      setStats(calculateStats(parsedTrades));
    } catch {
      // Silent fail
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeDataText]);

  // --- Handlers ---

  const handleDownloadTemplate = () => {
    const blob = new Blob([MT4_TEMPLATE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EA_Sentinel_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple text file reading for Demo.
    if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setTradeDataText(text);
      };
      reader.readAsText(file);
    } else {
      alert("In this demo version, please use CSV or Text formats. For Excel/PDF/Word, please Convert to CSV first or use the 'Download Template'.");
    }
  };

  const handleMfbLogin = async () => {
    setMfbLoading(true);
    setMfbError(null);
    setMfbInfo('');
    setMfbSelectedAccount(null);

    try {
      const loginResp = await postProxy<MyfxbookLoginResponse>('/myfxbook-proxy/login.json', {
        email: mfbEmail,
        password: mfbPass,
      });

      if (loginResp.error) throw new Error(loginResp.message || 'Login failed');

      const session = normalizeSession(loginResp.session);
      setMfbSession(session);

      const accountsResp = await postProxy<MyfxbookAccountsResponse>('/myfxbook-proxy/get-my-accounts.json', { session });
      if (accountsResp.error) throw new Error(accountsResp.message || 'Failed to load accounts');

      setMfbAccounts(accountsResp.accounts || []);
      setMfbInfo(`Loaded ${accountsResp.accounts?.length || 0} account(s). Select one to download trade history.`);
    } catch (e: any) {
      setMfbError(e?.message || 'Myfxbook connection error');
    } finally {
      setMfbLoading(false);
    }
  };

  const handleMfbRefreshAccounts = async () => {
    if (!mfbSession) return;
    setMfbLoading(true);
    setMfbError(null);
    setMfbInfo('');

    try {
      const accountsResp = await postProxy<MyfxbookAccountsResponse>('/myfxbook-proxy/get-my-accounts.json', { session: mfbSession });
      if (accountsResp.error) throw new Error(accountsResp.message || 'Failed to load accounts');
      setMfbAccounts(accountsResp.accounts || []);
      setMfbInfo(`Refreshed. Loaded ${accountsResp.accounts?.length || 0} account(s).`);
    } catch (e: any) {
      setMfbError(e?.message || 'Failed to refresh accounts');
    } finally {
      setMfbLoading(false);
    }
  };

  const applyMyfxbookFilters = (rows: MyfxbookHistoryRow[]) => {
    const commentNeedle = mfbCommentFilter.trim().toLowerCase();
    const magicNeedle = mfbMagic.trim();

    return rows.filter((r) => {
      if (!isBuySell(r.action)) return false;

      const comment = String(r.comment || '');
      const commentLower = comment.toLowerCase();

      // Comment filter (recommended)
      if (commentNeedle && !commentLower.includes(commentNeedle)) return false;

      // Magic filter (optional): match as substring OR word-boundary number
      if (magicNeedle) {
        const re = new RegExp(`\\b${escapeRegExp(magicNeedle)}\\b`);
        if (!(comment.includes(magicNeedle) || re.test(comment))) return false;
      }

      return true;
    });
  };

  const handleMfbSelectAccount = async (accountId: number) => {
    if (!mfbSession) return;

    setMfbLoading(true);
    setMfbError(null);
    setMfbInfo('');
    const selected = mfbAccounts.find((a) => a.id === accountId) || null;
    setMfbSelectedAccount(selected);

    try {
      const histResp = await postProxy<MyfxbookHistoryResponse>('/myfxbook-proxy/get-history.json', {
        session: mfbSession,
        id: accountId,
      });

      if (histResp.error) throw new Error(histResp.message || 'Failed to load history');

      const raw = histResp.history || [];
      const filtered = applyMyfxbookFilters(raw);

      if (filtered.length === 0) {
        throw new Error(
          `No BUY/SELL trades found after filters. Try clearing Magic/Comment filters, or check if the account has trade history.`
        );
      }

      const mfbTrades = convertMyfxbookHistory(filtered);

      setTrades(mfbTrades);
      setStats(calculateStats(mfbTrades));

      // update CSV text (for reuse in CSV tab + persist)
      const csvText =
        `Time,Type,Lot,Symbol,OpenPrice,ClosePrice,Profit\n` +
        mfbTrades
          .map(
            (t) =>
              `${t.time},${t.type},${t.lot},${t.symbol},${t.openPrice},${t.closePrice},${t.profit}`
          )
          .join('\n');
      setTradeDataText(csvText);

      const used = [
        mfbCommentFilter.trim() ? `Comment="${mfbCommentFilter.trim()}"` : null,
        mfbMagic.trim() ? `Magic="${mfbMagic.trim()}"` : null,
      ].filter(Boolean);

      setMfbInfo(
        `Downloaded ${filtered.length} trade(s) from account #${accountId}` +
          (used.length ? ` | Filters: ${used.join(' + ')}` : '')
      );
    } catch (e: any) {
      setMfbError(e?.message || 'Failed to download trade history');
    } finally {
      setMfbLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!tradeDataText.trim() || trades.length === 0) {
      setError('Please load valid trade data first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Step 1: Simulated "Bot" Progress
      setAnalysisStep('INITIALIZING GLOBAL QUANT AUDITOR...');
      await new Promise((r) => setTimeout(r, 800));

      setAnalysisStep('PARSING & NORMALIZING TRADE DATA...');
      await new Promise((r) => setTimeout(r, 800));

      setAnalysisStep('DETECTING REGIMES & ANOMALIES (AI LAYER)...');

      // Use Python Backend AI Service
      const response = await analyzeEa({
        ea_name: 'Manual_Input_EA',
        account_id: 0,
        symbol: trades[0].symbol,
        timeframe: 'D1',
        trades: trades.map((t) => ({
          open_time: t.time,
          close_time: t.time,
          symbol: t.symbol,
          direction: t.type,
          lot: t.lot,
          open_price: t.openPrice,
          close_price: t.closePrice,
          pips: Math.abs(t.closePrice - t.openPrice) * (t.symbol.includes('JPY') ? 100 : 10000),
          profit: t.profit,
        })),
      });

      setAnalysisStep('GENERATING TACTICAL RECOMMENDATIONS...');
      await new Promise((r) => setTimeout(r, 500));

      // Map backend response
      const dominantRegimeEntry = Object.entries(response.regime_breakdown || {}).sort((a, b) => (b[1] as any) - (a[1] as any))[0];
      const dominantRegime = (dominantRegimeEntry ? dominantRegimeEntry[0] : 'Unknown') as any;

      const result: AnalysisResult = {
        regime: {
          type: dominantRegime,
          description: `Analysis based on ${response.summaryMetrics.total_trades} trades. Dominant behavior detected as ${dominantRegime}.`,
          confidence: 0.85,
          breakdown: response.regime_breakdown,
        },
        features: {
          volatility: `Factor: ${response.summaryMetrics.max_drawdown.toFixed(2)}`,
          sequenceAnalysis: `WinRate: ${(response.summaryMetrics.win_rate * 100).toFixed(1)}%`,
          equitySlope: `Expectancy: ${response.summaryMetrics.expectancy.toFixed(2)}`,
        },
        anomalies: (response.anomalies || []).map((a: any) => ({
          index: a.index,
          type: a.type,
          message: a.message,
        })),
        suggestions: (response.suggestions || []).map((s: any) => s.text),
        pythonTemplates: {
          trainClassifier: '# Code is running live in ai-service/analysis_regime.py',
          detectAnomalies: '# Code is running live in ai-service/analysis_regime.py',
          generateSuggestions: '# Code is running live in ai-service/analysis_regime.py',
        },
      };

      setAnalysisResult(result);
      setAnalysisStep('AUDIT COMPLETE.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze data. Ensure ai-service is running on port 8000.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  return (
    <div className={`min-h-screen font-sans bg-cyber-bg text-slate-300 relative overflow-hidden transition-colors duration-500 theme-${currentTheme}`}>
      <CyberBackground theme={currentTheme} />

      {/* Header */}
      <header className="border-b border-cyber-neonBlue/20 bg-cyber-bg/80 sticky top-0 z-50 backdrop-blur-md shadow-neon-blue transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded bg-black/50 border border-cyber-neonBlue flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.4)] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyber-neonBlue animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-widest font-mono">
                EA <span className="text-cyber-neonBlue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">SENTINEL</span> AI
              </h1>
              <p className="text-xs text-cyber-neonPurple font-mono tracking-widest">CYBERPUNK ANALYTICS v2.0</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Selector */}
            <div className="relative group">
              <button className="flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded border border-white/10 hover:border-cyber-neonBlue text-xs font-mono transition-all">
                <span className="w-2 h-2 rounded-full bg-cyber-neonBlue"></span>
                <span className="uppercase">{currentTheme.replace('-', ' ')}</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-black/90 border border-cyber-neonBlue/30 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2 space-y-1">
                  {[
                    { id: 'cyberpunk', label: 'Cyberpunk' },
                    { id: 'neon-3d', label: 'Cyberpunk Neon 3D' },
                    { id: 'iridescent', label: 'Iridescent Waves' },
                    { id: 'crystal', label: 'Crystal & Iridescent 3D' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setCurrentTheme(t.id as ThemeType)}
                      className={`w-full text-left px-3 py-2 text-xs rounded uppercase tracking-wider hover:bg-cyber-neonBlue/20 hover:text-white transition-colors ${
                        currentTheme === t.id ? 'text-cyber-neonBlue bg-cyber-neonBlue/10' : 'text-gray-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-2 bg-black/40 p-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'csv', label: 'CSV Data' },
                { id: 'myfxbook', label: 'Myfxbook' },
                { id: 'ai_analysis', label: 'EA Analysis AI' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all tracking-wider ${
                    activeTab === tab.id
                      ? 'bg-cyber-neonBlue/10 text-cyber-neonBlue border border-cyber-neonBlue/50 shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'csv' && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`
                  px-6 py-2 rounded font-bold text-xs tracking-widest transform transition-all
                  flex items-center space-x-2 border
                  ${
                    isAnalyzing
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700'
                      : 'bg-cyber-neonPurple/20 text-cyber-neonPurple border-cyber-neonPurple hover:bg-cyber-neonPurple hover:text-white hover:shadow-neon-pink'
                  }
                `}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="ml-2 animate-pulse">PROCESSING...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="ml-2">RUN AI CORE</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && <DashboardOverview stats={stats} trades={trades} analysis={analysisResult} />}

          {activeTab === 'ai_analysis' && <AdvancedEaAnalysis trades={trades} stats={stats} />}

          {activeTab === 'csv' && (
            <>
              {/* Intelligent File Import Section */}
              <div className="glass-panel p-6 mb-8 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyber-neonBlue/5 blur-[50px] rounded-full pointer-events-none"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 z-10 relative">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center tracking-wider">
                      <svg className="w-6 h-6 mr-3 text-cyber-neonBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      SMART DATA INJECTION
                    </h2>
                    <p className="text-xs text-gray-500 font-mono mt-1">SUPPORTED: CSV, TXT, EXCEL*, PDF*, WORD* (VIA PARSER)</p>
                  </div>
                  <div className="flex space-x-3 mt-4 md:mt-0">
                    <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded text-xs font-mono text-gray-300 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      DOWNLOAD TEMPLATE
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 bg-cyber-neonBlue/10 hover:bg-cyber-neonBlue hover:text-black border border-cyber-neonBlue rounded text-xs font-bold tracking-widest text-cyber-neonBlue transition-all shadow-[0_0_10px_rgba(0,243,255,0.2)]"
                    >
                      <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      IMPORT FILE
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.txt,.xlsx,.pdf,.doc,.docx" />
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    className="w-full h-48 bg-black/40 text-cyber-neonBlue font-mono text-xs p-4 outline-none resize-y rounded border border-white/10 focus:border-cyber-neonBlue focus:shadow-[0_0_15px_rgba(0,243,255,0.1)] transition-all placeholder-gray-700"
                    value={tradeDataText}
                    onChange={(e) => setTradeDataText(e.target.value)}
                    placeholder="PASTE CSV DATA OR UPLOAD FILE..."
                  />
                  {/* AI Bot Status Overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center border border-cyber-neonPurple/30 rounded z-20">
                      <div className="flex space-x-1 mb-4">
                        <div className="w-2 h-12 bg-cyber-neonPink animate-wave"></div>
                        <div className="w-2 h-12 bg-cyber-neonPurple animate-wave delay-75"></div>
                        <div className="w-2 h-12 bg-cyber-neonBlue animate-wave delay-150"></div>
                        <div className="w-2 h-12 bg-cyber-neonGreen animate-wave delay-300"></div>
                      </div>
                      <h3 className="text-white font-bold tracking-widest animate-pulse">{analysisStep}</h3>
                      <p className="text-xs text-cyber-neonBlue/60 font-mono mt-2">SENTINEL AI IS ANALYZING TRADE VECTORS...</p>
                    </div>
                  )}
                </div>
              </div>

              {stats && <Dashboard stats={stats} trades={trades} analysis={analysisResult} isAnalyzing={isAnalyzing} />}
            </>
          )}

          {activeTab === 'myfxbook' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-xl p-6">
                {!mfbSession ? (
                  <div className="max-w-md mx-auto space-y-6 py-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-white tracking-widest">MYFXBOOK LINK</h2>
                      <p className="text-sm text-cyber-neonBlue/60 font-mono">SECURE CONNECTION REQUIRED</p>
                    </div>

                    <input
                      type="email"
                      placeholder="Myfxbook Email"
                      className="w-full bg-black/40 border border-white/10 rounded p-4 text-white focus:border-cyber-neonBlue outline-none font-mono focus:shadow-neon-blue transition-all"
                      value={mfbEmail}
                      onChange={(e) => setMfbEmail(e.target.value)}
                    />

                    <div className="relative w-full">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="w-full bg-black/40 border border-white/10 rounded p-4 text-white focus:border-cyber-neonBlue outline-none font-mono focus:shadow-neon-blue transition-all pr-12"
                        value={mfbPass}
                        onChange={(e) => setMfbPass(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-cyber-neonBlue transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={handleMfbLogin}
                      disabled={mfbLoading}
                      className="w-full bg-cyber-neonBlue/10 hover:bg-cyber-neonBlue hover:text-black border border-cyber-neonBlue text-cyber-neonBlue font-bold py-4 rounded tracking-widest transition-all shadow-neon-blue disabled:opacity-50 disabled:shadow-none"
                    >
                      {mfbLoading ? 'ESTABLISHING CONNECTION...' : 'INITIATE LOGIN'}
                    </button>

                    {mfbError && (
                      <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 border border-red-500/30 rounded">{mfbError}</p>
                    )}

                    <p className="text-[10px] text-gray-500 text-center pt-4">
                      * PROXY GATEWAY: {AI_SERVICE_URL.replace(/^https?:\/\//, '')}
                      <br />
                      Ensure AI Service is running to bypass API IP-binding restrictions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
                      <div className="space-y-1">
                        <h3 className="text-white font-bold tracking-widest">AVAILABLE ACCOUNTS</h3>
                        <p className="text-xs text-gray-500 font-mono">
                          Session active. Select an account to download trades (BUY/SELL only).
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleMfbRefreshAccounts}
                          disabled={mfbLoading}
                          className="text-xs text-cyber-neonBlue border border-cyber-neonBlue/40 hover:bg-cyber-neonBlue/10 px-3 py-1 rounded disabled:opacity-50"
                        >
                          REFRESH
                        </button>
                        <button
                          onClick={() => {
                            setMfbSession('');
                            setMfbAccounts([]);
                            setMfbSelectedAccount(null);
                            setMfbError(null);
                            setMfbInfo('');
                          }}
                          className="text-xs text-red-400 border border-red-900 hover:bg-red-900/50 px-3 py-1 rounded"
                        >
                          TERMINATE SESSION
                        </button>
                      </div>
                    </div>

                    {/* ✅ Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-black/40 p-4 rounded border border-white/10">
                        <label className="text-[11px] text-gray-400 font-mono tracking-widest">MAGIC NUMBER (OPTIONAL)</label>
                        <input
                          value={mfbMagic}
                          onChange={(e) => setMfbMagic(e.target.value.replace(/[^\d]/g, ''))}
                          placeholder="e.g. 12345"
                          className="mt-2 w-full bg-black/40 border border-white/10 rounded p-3 text-white outline-none font-mono focus:border-cyber-neonBlue"
                        />
                        <p className="text-[10px] text-gray-500 font-mono mt-2">
                          Myfxbook history doesn’t always expose “magic” directly. We match this number inside <span className="text-gray-300">comment</span>.
                        </p>
                      </div>

                      <div className="bg-black/40 p-4 rounded border border-white/10 md:col-span-2">
                        <label className="text-[11px] text-gray-400 font-mono tracking-widest">COMMENT FILTER (RECOMMENDED)</label>
                        <input
                          value={mfbCommentFilter}
                          onChange={(e) => setMfbCommentFilter(e.target.value)}
                          placeholder='e.g. "EA_XAU_M5" or "[sl]"'
                          className="mt-2 w-full bg-black/40 border border-white/10 rounded p-3 text-white outline-none font-mono focus:border-cyber-neonGreen"
                        />
                        <p className="text-[10px] text-gray-500 font-mono mt-2">
                          Best practice: ตั้งค่า EA ให้ใส่ comment เฉพาะตัว (เช่น EA_NAME / SET_NAME) เพื่อกรองผลการเทรดให้แม่นยำ.
                        </p>
                      </div>
                    </div>

                    {mfbInfo && <div className="text-xs text-cyber-neonGreen font-mono bg-black/30 border border-cyber-neonGreen/20 p-3 rounded">{mfbInfo}</div>}
                    {mfbError && <p className="text-red-400 text-sm bg-red-900/20 p-2 border border-red-500/30 rounded">{mfbError}</p>}
                    {mfbLoading && <p className="text-cyber-neonBlue text-sm animate-pulse font-mono">DOWNLOADING / SYNCING...</p>}

                    {mfbAccounts.length === 0 ? (
                      <p className="text-gray-500 font-mono">SCANNING FOR ACCOUNTS...</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mfbAccounts.map((acc) => {
                          const brokerName = acc.broker || acc.server?.name || 'Unknown Broker';
                          const currency = acc.currency && acc.currency.trim() ? acc.currency : 'USD';
                          const gain = typeof acc.gain === 'number' ? acc.gain : 0;
                          const profit = typeof acc.profit === 'number' ? acc.profit : 0;
                          const isSelected = mfbSelectedAccount?.id === acc.id;

                          return (
                            <div
                              key={acc.id}
                              onClick={() => handleMfbSelectAccount(acc.id)}
                              className={`bg-black/40 p-5 rounded border cursor-pointer transition-all group ${
                                isSelected
                                  ? 'border-cyber-neonGreen shadow-[0_0_18px_rgba(0,255,159,0.18)]'
                                  : 'border-white/10 hover:border-cyber-neonGreen hover:shadow-[0_0_15px_rgba(0,255,159,0.2)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-bold text-white group-hover:text-cyber-neonGreen text-lg">
                                    {acc.name || `Account #${acc.id}`}
                                  </div>
                                  <div className="text-xs text-gray-500 font-mono mb-1">{brokerName}</div>
                                  <div className="text-[10px] text-gray-600 font-mono">myfxbook id: {acc.id}</div>
                                </div>
                                <div className="text-[10px] font-mono px-2 py-1 rounded border border-white/10 text-gray-400 bg-black/30">
                                  LOAD
                                </div>
                              </div>

                              <div className="mt-4 flex justify-between text-sm font-mono bg-white/5 p-2 rounded">
                                <span className={gain >= 0 ? 'text-cyber-neonGreen' : 'text-red-400'}>
                                  {gain > 0 ? '+' : ''}
                                  {gain}%
                                </span>
                                <span className="text-gray-300">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(profit)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="text-[10px] text-gray-500 font-mono pt-2">
                      Proxy base: <span className="text-gray-300">{AI_SERVICE_URL}</span> | Filters apply when you click an account.
                    </div>
                  </div>
                )}
              </div>

              {stats && activeTab === 'myfxbook' && <Dashboard stats={stats} trades={trades} analysis={analysisResult} isAnalyzing={isAnalyzing} />}
            </div>
          )}
        </div>
      </main>

      {/* EA Sentinel Bot (FAB) */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-cyber-neonBlue/10 hover:bg-cyber-neonBlue/20 text-cyber-neonBlue border border-cyber-neonBlue rounded-full shadow-[0_0_20px_rgba(0,243,255,0.3)] z-[100] flex items-center justify-center transition-all hover:scale-110 backdrop-blur-md group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {!isChatOpen && stats && <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-ping border border-black"></span>}
      </button>

      {/* Bot Window */}
      {isChatOpen && <ChatBot trades={trades} stats={stats} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default App;
