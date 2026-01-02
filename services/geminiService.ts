import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

// Schema for light-weight analysis (Dashboard widget)
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    regime: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ['Stable', 'Choppy', 'Trend', 'News-Spike', 'Unknown'] },
        description: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      }
    },
    features: {
      type: Type.OBJECT,
      properties: {
        volatility: { type: Type.STRING, description: "Analysis of volatility regime (low/med/high)" },
        sequenceAnalysis: { type: Type.STRING, description: "Analysis of win/loss streaks" },
        equitySlope: { type: Type.STRING, description: "Description of the equity curve slope and health" },
      }
    },
    anomalies: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of detected anomalies in the trading behavior"
    },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Actionable suggestions for the EA based on the regime"
    },
    pythonTemplates: {
      type: Type.OBJECT,
      properties: {
        trainClassifier: { type: Type.STRING, description: "Python code for train_regime_classifier" },
        detectAnomalies: { type: Type.STRING, description: "Python code for detect_anomalies" },
        generateSuggestions: { type: Type.STRING, description: "Python code for generate_ea_suggestions" },
      }
    }
  }
};

const MASTER_PROMPT_CORE = `
A) ROLE / IDENTITY
คุณคือ Global Quant & EA Performance Auditor (v1) ผู้เชี่ยวชาญระดับสถาบันใน:
Quant/Portfolio/Risk Management
Market microstructure, execution, slippage, spread effects
ML สำหรับ time-series, anomaly detection, regime detection, calibration
LLM สำหรับ data forensics + report automation + decision support
Backtest integrity & anti-overfitting (walk-forward, purged CV, leakage checks)
เป้าหมาย: วิเคราะห์ “ผลการเทรด EA” แบบ ถูกต้อง ตรวจสอบได้ ไม่เดา และสรุปให้ “ตัดสินใจได้จริง” ว่า EA ควร ใช้ต่อ / ปรับ / หยุด / จำกัดความเสี่ยง / แยกโหมด

D) REQUIRED ANALYSIS CHECKLIST
Step 1: Parse & Normalize (ระบุ schema, normalization, environment)
Step 2: Data Integrity (ตรวจ missing trades, net profit check)
Step 3: Core Metrics + Rolling Windows
Step 4: Risk Forensics (Identify worst DD, concentration risk, martingale detection)
Step 5: Robustness + Stress (Cost stress, parameter sensitivity plan)
Step 6: Deliver Decision (Verdict + rules + kill-switch)

E) “NO-HALLUCINATION” RULES
ห้ามสรุปเกินข้อมูล ทุกตัวเลขต้องอ้างจากข้อมูลที่ให้
ถ้าพบสัญญาณเสี่ยงสูง (martingale/grid/no SL/negative skew) ให้ “ขึ้นธงแดง” ทันที
`;

export const analyzeEAPerformance = async (tradeHistory: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      ${MASTER_PROMPT_CORE}
      
      TASK: Perform a quick initial scan for the dashboard widgets.
      Analyze the following trade data segment:
      ---
      ${tradeHistory.substring(0, 15000)}
      ---
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are the EA Sentinel AI Module. Return JSON only.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("Empty response from AI");

  } catch (error: any) {
    console.error("Analysis failed:", error);
    throw new Error(error.message || "Failed to analyze trade data");
  }
};

// The Deep Audit function implementing the 3-step prompt logic internally (consolidated for efficiency)
export const generateDeepStrategyReport = async (tradeHistory: string, stats: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // We combine the steps into a rigorous CoT (Chain of Thought) prompt due to single-turn nature here,
    // but structure it to force the 3-phase thinking.
    const prompt = `
      ${MASTER_PROMPT_CORE}

      **INPUT DATA**
      Stats Context: Win Rate ${stats.winRate.toFixed(1)}%, PF ${stats.profitFactor.toFixed(2)}, MaxDD ${stats.maxDrawdown.toFixed(2)}
      
      **Trade History (Raw Data):**
      ${tradeHistory.substring(0, 50000)}

      **INSTRUCTIONS: Execute the following 3-Phase Audit Process:**

      **PHASE 1: Data Intake & Audit**
      - สรุป schema ที่พบ + mapping คอลัมน์
      - ตรวจ data quality (missing/duplicate/outlier/timezone/net-vs-gross)
      - ให้คะแนนความเชื่อมั่นข้อมูล 0–100

      **PHASE 2: Performance + Risk Forensics**
      - คำนวณ metrics ครบชุด (return/risk/risk-adjusted/tail/stability)
      - แยกพฤติกรรมการเทรด (session, holding time, long/short, exposure)
      - หาเหตุ drawdown ใหญ่สุด 3 เหตุการณ์ + สมมติฐานเชิงหลักฐาน
      - ตรวจสัญญาณ martingale/grid/noSL และขึ้นธงแดงถ้ามี

      **PHASE 3: Robustness + AI/ML + Decision**
      - stress test ด้าน cost/slippage/spread widening
      - วางแผน walk-forward / purged CV
      - ให้ Verdict + โหมดใช้งานจริง + kill-switch thresholds + action plan

      **C) OUTPUT FORMAT (รายงานภาษาไทยแบบมืออาชีพ)**
      
      # 🛡️ SENTINEL AI: MASTER QUANT AUDIT

      ## 1. Executive Summary
      - **Verdict**: (✅ใช้ต่อ / ⚠️ใช้แบบจำกัด / ❌หยุด / 🛠ปรับก่อนใช้)
      - **Strengths / Weaknesses**: (Top 5)
      - **Risk Flags**: (Top 10)
      - **Quick Wins**: (3 ข้อ)

      ## 2. Data Quality & Audit
      - Confidence Score: [0-100]
      - Integrity Check: ...

      ## 3. Performance Metrics (Deep Dive)
      - Return/Risk Profile: ...
      - Tail Risk & Skewness: ...

      ## 4. Trade Behavior & Strategy Fingerprint
      - Style: ...
      - Exposure & Martingale Check: ...

      ## 5. Risk Management Audit
      - Position Sizing & SL: ...
      - Ruin Probability: ...

      ## 6. Execution & Cost Sensitivity
      - Spread/Slippage Impact: ...

      ## 7. AI/ML Layer (Advanced)
      - Regime Detection: ...
      - Anomaly Detection: ...

      ## 8. Recommendations & Action Plan
      - Configuration Tuning: ...
      - Kill-Switch Rules: ...
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
      config: {
        systemInstruction: "You are the 'Global Quant & EA Performance Auditor'. You are extremely strict. You use professional Thai language for the report.",
        thinkingConfig: { thinkingBudget: 8192 } // High thinking budget for deep audit
      },
    });

    return response.text || "Report generation failed.";
  } catch (error: any) {
    console.error("Deep analysis failed:", error);
    throw new Error(error.message || "Failed to generate deep analysis report");
  }
};

export const generateGreetingCard = async (prompt: string, referenceImageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const parts: any[] = [];
    
    if (referenceImageBase64) {
      const match = referenceImageBase64.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "2K"
        }
      }
    });

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      for (const part of content.parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated.");

  } catch (error: any) {
    console.error("Image generation failed:", error);
    throw new Error(error.message || "Failed to generate image");
  }
};