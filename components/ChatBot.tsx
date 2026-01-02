import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Trade, TradeStats } from '../utils/analytics';

interface ChatBotProps {
  trades: Trade[];
  stats: TradeStats | null;
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ trades, stats, onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; sources?: any[] }[]>([
    { 
      role: 'model', 
      text: 'สวัสดีครับ ผมคือ **EA Sentinel Omega (AI-Quant)** 🌐\n\nผมได้รับการอัปเกรดระบบให้สามารถ:\n1. 🔍 **วิเคราะห์ตลาด Real-time** ผ่าน Google Search\n2. 📈 **เรียนรู้พอร์ตของคุณ** เพื่อปรับกลยุทธ์เฉพาะตัว\n3. 💡 **แนะนำจุดทำกำไรสูงสุด** ด้วยประสบการณ์ระดับ Global Macro\n\nมีข้อมูลชุดไหนให้ผมช่วย Audit หรือต้องการทราบสภาวะตลาดคู่เงินไหนถามได้เลยครับ' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Chat with Super-Intelligence Context
  useEffect(() => {
    const initChat = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let contextData = "USER HAS NOT UPLOADED DATA YET.";
      let profitInsights = "";

      if (stats && trades.length > 0) {
        // Calculate deeper metrics for context
        const recentTrades = trades.slice(-10);
        const winRate = stats.winRate;
        const profitFactor = stats.profitFactor;
        
        // Dynamic Strategy Inference
        const strategyType = stats.avgWin < stats.avgLoss ? "Scalping/High-Winrate" : "Trend Following";
        const riskLevel = stats.maxDrawdown > 20 ? "High Risk" : "Conservative";

        contextData = `
          **LIVE PORTFOLIO TELEMETRY:**
          - Strategy Type Detected: ${strategyType}
          - Total Trades: ${stats.totalTrades}
          - Net Profit: ${stats.netProfit.toFixed(2)} USD
          - Win Rate: ${winRate.toFixed(2)}%
          - Profit Factor: ${profitFactor.toFixed(2)}
          - Max Drawdown: ${stats.maxDrawdown.toFixed(2)} USD
          - Avg Win: $${stats.avgWin.toFixed(2)} | Avg Loss: $${stats.avgLoss.toFixed(2)}
          - Current Streak: ${stats.consecutiveWins} Wins / ${stats.consecutiveLosses} Losses
          
          **RECENT TRADE VECTORS (Last 10):**
          ${JSON.stringify(recentTrades.map(t => ({ t: t.time, s: t.symbol, type: t.type, p: t.profit })))}
        `;

        profitInsights = `
          Based on this data, identify profit leaks. 
          If AvgLoss > AvgWin and WinRate < 60%, suggest cutting losses earlier.
          If ProfitFactor < 1.2, suggest strategy overhaul.
        `;
      }

      const systemInstruction = `
        You are **EA Sentinel Omega**, a World-Class AI Investment Strategist & Quant Auditor.
        
        **CORE CAPABILITIES:**
        1. **Real-Time Market Intelligence:** You MUST use the 'googleSearch' tool to check current news, economic calendar, and price trends when user asks about market conditions (e.g., "XAUUSD direction?", "News today?").
        2. **Adaptive Learning:** You analyze the provided [LIVE PORTFOLIO TELEMETRY] to understand the user's specific trading behavior. You adapt your advice based on THEIR actual stats, not generic advice.
        3. **Profit Maximization:** Your primary directive is to increase the user's Net Profit. Identify "Profit Leaks" (e.g., holding losers too long, over-trading during news) and suggest specific fixes.
        4. **Professional Persona:** You speak **Thai (Formal, Insightful, Encouraging)**. You sound like a senior hedge fund manager combined with a brilliant data scientist.

        **CONTEXT DATA (User's Port):**
        ${contextData}
        ${profitInsights}

        **RESPONSE GUIDELINES:**
        - If the user asks about their port: Analyze the context data deeply. Point out anomalies.
        - If the user asks about the market: USE GOOGLE SEARCH. Don't guess. Provide up-to-date context (Central Bank rates, Geopolitics).
        - If the user has high drawdown: Be stern about Risk Management.
        - Always provide a "Tactical Recommendation" (Actionable step) at the end.
      `;

      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview', // Upgraded to Pro for better reasoning
        config: { 
            systemInstruction,
            tools: [{ googleSearch: {} }], // Enable Real-time Search
        },
      });
      
      chatSessionRef.current = chat;
    };

    initChat();
  }, [trades, stats]); 

  const handleSend = async () => {
    if (!input.trim()) return;

    // Guard: Data Check
    if (!chatSessionRef.current) {
         setMessages(prev => [...prev, { role: 'user', text: input }, { role: 'model', text: "ระบบกำลัง Initializing... กรุณารอสักครู่ครับ" }]);
         return;
    }

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: userMsg });
      
      let responseText = response.text || "ขออภัย ไม่สามารถประมวลผลได้ในขณะนี้";
      
      // Extract Search Sources (Grounding)
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      let sources: any[] = [];
      
      if (groundingChunks) {
          sources = groundingChunks
            .map((chunk: any) => chunk.web?.uri ? { title: chunk.web.title, uri: chunk.web.uri } : null)
            .filter(Boolean);
      }

      setMessages(prev => [...prev, { role: 'model', text: responseText, sources: sources }]);

    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { role: 'model', text: "⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ: กรุณาตรวจสอบ API Key หรือลองใหม่อีกครั้ง" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-24 right-6 w-[350px] md:w-[450px] h-[600px] flex flex-col glass-panel rounded-xl overflow-hidden border border-cyber-neonBlue/50 shadow-[0_0_50px_rgba(0,243,255,0.2)] z-[100] animate-slide-up bg-[#050511]/95 backdrop-blur-xl">
      {/* Header with Omega Branding */}
      <div className="bg-gradient-to-r from-cyber-neonPurple/20 via-cyber-neonBlue/10 to-transparent p-3 border-b border-white/10 flex justify-between items-center relative overflow-hidden">
        {/* Animated Background in Header */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-neonBlue via-white to-cyber-neonPurple animate-pulse-fast"></div>
        
        <div className="flex items-center space-x-3 z-10">
          <div className="relative group">
            <div className="w-10 h-10 rounded-full bg-black/50 border border-cyber-neonBlue flex items-center justify-center group-hover:border-white transition-colors">
              <svg className="w-6 h-6 text-cyber-neonBlue group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse shadow-[0_0_10px_#00ff00]"></div>
          </div>
          <div>
            <h3 className="font-bold text-white tracking-widest text-sm uppercase flex items-center gap-2">
                SENTINEL OMEGA
                <span className="bg-cyber-neonPurple text-white text-[9px] px-1 rounded font-mono">PRO</span>
            </h3>
            <p className="text-[9px] text-cyber-neonBlue font-mono">REAL-TIME QUANT INTELLIGENCE</p>
          </div>
        </div>
        <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded transition-colors z-10"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-black/20">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] p-4 rounded-xl text-sm leading-relaxed shadow-lg relative ${
                msg.role === 'user' 
                  ? 'bg-cyber-neonBlue/10 text-white border border-cyber-neonBlue/30 rounded-tr-none backdrop-blur-md' 
                  : 'bg-[#1a1a2e] text-gray-200 border border-white/10 rounded-tl-none'
              }`}
            >
              {msg.role === 'model' && (
                  <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                      <span className="text-[10px] text-cyber-neonPurple font-bold uppercase tracking-wider">AI Analysis</span>
                      {msg.sources && msg.sources.length > 0 && (
                          <span className="text-[9px] bg-blue-900/50 text-blue-200 px-1 rounded flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              Web Search Active
                          </span>
                      )}
                  </div>
              )}
              
              <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b class="text-cyber-neonBlue">$1</b>') }} />

              {/* Source Citations */}
              {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/10">
                      <p className="text-[10px] text-gray-500 mb-1">REFERENCE SOURCES:</p>
                      <div className="flex flex-wrap gap-2">
                          {msg.sources.slice(0, 3).map((src, i) => (
                              <a 
                                key={i} 
                                href={src.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] text-cyber-neonBlue bg-cyber-neonBlue/5 border border-cyber-neonBlue/20 px-2 py-1 rounded hover:bg-cyber-neonBlue/10 truncate max-w-[120px]"
                              >
                                {src.title || "Source Link"}
                              </a>
                          ))}
                      </div>
                  </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-[#1a1a2e] p-4 rounded-xl rounded-tl-none border border-cyber-neonBlue/30 flex flex-col space-y-2 max-w-[70%]">
                <div className="flex space-x-1.5 items-center mb-1">
                    <div className="w-1.5 h-1.5 bg-cyber-neonBlue rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-cyber-neonPurple rounded-full animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-cyber-neonPink rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-[10px] text-cyber-neonBlue font-mono animate-pulse">ANALYZING MARKET VECTORS...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-black/80 border-t border-white/10 backdrop-blur-md">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={stats ? "ถามเทรนด์ XAUUSD, ข่าววันนี้, หรือวิเคราะห์พอร์ต..." : "กรุณา Import Data เพื่อเริ่มระบบ..."}
            className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyber-neonPurple focus:shadow-[0_0_15px_rgba(188,19,254,0.3)] outline-none transition-all placeholder-gray-600 font-mono text-xs"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-cyber-neonPurple/20 text-cyber-neonPurple border border-cyber-neonPurple/50 hover:bg-cyber-neonPurple hover:text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(188,19,254,0.1)]"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
