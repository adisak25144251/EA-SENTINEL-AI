import React, { useState } from 'react';
import { generateGreetingCard } from '../services/geminiService';

const DEFAULT_PROMPT = `สร้างการ์ดอวยพรปีใหม่แบบครอบครัว อัตราส่วนภาพ 1:1 โดยเน้นที่ตัวอักษร "2569" แบบ 3D สีพาสเทล ขนาดใหญ่อยู่ตรงกลางภาพ และมี 4 คนยืนอยู่ข้างๆ ตัวเลขแต่ละตัว ใช้ใบหน้าตามรูปที่แนบ 100% กำลังยิ้มอย่างมีความสุข ใส่ชุดแบบสุภาพตามอายุ มีพร้อพเกี่ยวกับปีใหม่ เช่น กล่องของขวัญ ลูกโป่ง ข้างบนมีข้อความ "สวัสดีปีใหม่ ขอให้มีความสุข สุขภาพแข็งแรง และโชคดี" รูปแบบสมจริงเหมือนถ่ายในสตูดิโอ พื้นหลังสีขาวแบบนวลตา`;

export const GreetingGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    // Check if user has selected an API key for the paid model (gemini-3-pro-image-preview)
    const aiStudio = (window as any).aistudio;
    if (aiStudio && aiStudio.hasSelectedApiKey && aiStudio.openSelectKey) {
      const hasKey = await aiStudio.hasSelectedApiKey();
      if (!hasKey) {
        try {
          await aiStudio.openSelectKey();
          // Assuming the user selected a key, proceed.
        } catch (e) {
           setError("API Key selection cancelled or failed.");
           return;
        }
      }
    }

    setLoading(true);
    setError(null);
    try {
      const result = await generateGreetingCard(prompt, refImage || undefined);
      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      {/* Input Section */}
      <div className="space-y-6">
        <div className="glass-panel p-8 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-neonPink/10 blur-2xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
          
          <h2 className="text-xl font-bold text-white mb-6 flex items-center tracking-wider">
             <span className="bg-cyber-neonPink text-black font-bold px-3 py-1 rounded-sm mr-3 text-xs shadow-neon-pink">AI</span>
             SAWASDEE 2569 GENERATOR
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-cyber-neonBlue uppercase tracking-widest mb-3 font-mono">Reference Identity (Required)</label>
              <div className="border border-dashed border-gray-600 bg-black/30 rounded-lg p-6 text-center hover:border-cyber-neonPink hover:shadow-[0_0_15px_rgba(255,0,255,0.2)] transition-all relative">
                {refImage ? (
                  <div className="relative h-48 w-full">
                    <img src={refImage} alt="Reference" className="h-full w-full object-contain mx-auto rounded border border-white/10" />
                    <button 
                      onClick={(e) => { e.preventDefault(); setRefImage(null); }}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full shadow-lg backdrop-blur-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-sm text-gray-400">DROP FAMILY PHOTO</p>
                    <p className="text-xs text-gray-600 mt-1 font-mono">AI WILL EXTRACT FACIAL FEATURES</p>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-cyber-neonBlue uppercase tracking-widest mb-3 font-mono">Prompt Matrix (Thai)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-40 bg-black/40 text-gray-300 text-sm p-4 rounded-lg border border-gray-700 focus:border-cyber-neonPink focus:shadow-neon-pink outline-none resize-none leading-relaxed transition-all"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full py-4 rounded font-bold uppercase tracking-widest shadow-lg flex items-center justify-center space-x-3 transition-all transform hover:scale-[1.02]
                ${loading 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                  : 'bg-transparent border border-cyber-neonPink text-cyber-neonPink hover:bg-cyber-neonPink hover:text-black shadow-neon-pink'
                }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  PROCESSING...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  <span>EXECUTE GENERATION</span>
                </>
              )}
            </button>
            {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]">{error}</p>}
          </div>
        </div>
      </div>

      {/* Result Section */}
      <div className="glass-panel rounded-xl p-1 flex items-center justify-center min-h-[500px] relative overflow-hidden">
         {/* Animated Grid Background */}
         <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none"></div>

         {!generatedImage && !loading && (
           <div className="text-center p-8 relative z-10">
             <div className="w-32 h-32 rounded-full border border-cyber-neonBlue/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,243,255,0.1)] bg-black/20">
               <svg className="w-12 h-12 text-cyber-neonBlue opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
             <h3 className="text-white text-lg font-bold tracking-widest mb-2">SYSTEM STANDBY</h3>
             <p className="text-cyber-neonBlue/50 text-sm font-mono">WAITING FOR INPUT STREAM...</p>
           </div>
         )}
         
         {loading && (
           <div className="text-center z-10">
             <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-t-2 border-cyber-neonPink rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-r-2 border-cyber-neonBlue rounded-full animate-spin direction-reverse"></div>
                <div className="absolute inset-4 border-b-2 border-cyber-neonGreen rounded-full animate-pulse"></div>
             </div>
             <p className="text-cyber-neonPink font-mono tracking-widest animate-pulse">RENDERING ASSETS...</p>
           </div>
         )}

         {generatedImage && (
           <div className="relative w-full h-full flex items-center justify-center p-4 z-10 group">
             <img src={generatedImage} alt="Generated Card" className="rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-full max-h-[600px] border border-white/20" />
             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-lg">
                <a 
                  href={generatedImage} 
                  download="Sawasdee-2569.png"
                  className="bg-cyber-neonGreen text-black font-bold px-8 py-4 rounded flex items-center text-sm shadow-[0_0_20px_rgba(0,255,159,0.5)] hover:scale-105 transition-transform"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  DOWNLOAD 2K RES
                </a>
             </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default GreetingGenerator;