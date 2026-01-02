
export interface AnalysisResult {
  regime: {
    type: 'Stable' | 'Choppy' | 'Trend' | 'News-Spike' | 'Unknown';
    description: string;
    confidence: number;
    breakdown?: Record<string, number>;
  };
  features: {
    volatility: string;
    sequenceAnalysis: string;
    equitySlope: string;
  };
  anomalies: string[] | { index: number; type: string; message: string }[];
  suggestions: string[];
  pythonTemplates: {
    trainClassifier: string;
    detectAnomalies: string;
    generateSuggestions: string;
  };
}

export interface TradeData {
  rawText: string;
}
