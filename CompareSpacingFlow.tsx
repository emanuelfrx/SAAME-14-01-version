
import React, { useState, useEffect } from 'react';
import { AppStep, FontState, MethodType } from './types';
import { createFontState } from './services/fontService';
import { FileUpload } from './components/FileUpload';
import { LabStyleComparisonGrid } from './components/LabStyleComparisonGrid';
import { Loader2, Activity, Home, ArrowRight, CheckCircle2 } from 'lucide-react';

export const CompareSpacingFlow: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [refFile, setRefFile] = useState<{ buffer: ArrayBuffer | null, name: string }>({ buffer: null, name: '' });
  const [expFile, setExpFile] = useState<{ buffer: ArrayBuffer | null, name: string }>({ buffer: null, name: '' });
  
  const [refFont, setRefFont] = useState<FontState | null>(null);
  const [expFont, setExpFont] = useState<FontState | null>(null);

  // Efeito para injetar as fontes no CSS (Pipeline Independente)
  useEffect(() => {
    if (refFont || expFont) {
      const styleId = 'compare-fonts-css';
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      let css = '';
      if (refFont) css += `@font-face { font-family: '${refFont.fullFontFamily}'; src: url('${refFont.url}'); }\n`;
      if (expFont) css += `@font-face { font-family: '${expFont.fullFontFamily}'; src: url('${expFont.url}'); }\n`;
      styleTag.textContent = css;
    }
  }, [refFont, expFont]);

  const handleProcess = async () => {
    if (!refFile.buffer || !expFile.buffer) return;
    setIsProcessing(true);
    setProgress(10);

    try {
      // Passo 1: Parse Referência
      setProgress(30);
      const rFont = await createFontState(refFile.buffer.slice(0), MethodType.ORIGINAL);
      rFont.fullFontFamily = `Ref-${Date.now()}`;
      
      // Passo 2: Parse Experimental
      setProgress(60);
      const eFont = await createFontState(expFile.buffer.slice(0), MethodType.TRACY);
      eFont.fullFontFamily = `Exp-${Date.now()}`;

      setProgress(90);
      setRefFont(rFont);
      setExpFont(eFont);
      
      setTimeout(() => {
        setStep(AppStep.ANALYSIS);
        setIsProcessing(false);
        setProgress(100);
      }, 500);
    } catch (err) {
      console.error("Pipeline Error:", err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-gray-200 overflow-hidden">
      {/* INDICADOR DE PROGRESSO / OVERLAY */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-[#0d1117]/95 backdrop-blur-md flex items-center justify-center flex-col">
          <div className="relative w-24 h-24 mb-8">
            <Loader2 className="w-full h-full text-blue-500 animate-spin opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-mono font-bold text-blue-400">{progress}%</span>
            </div>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Synchronizing Specimen Pair</h2>
          <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest animate-pulse">Metrological alignment in progress</p>
        </div>
      )}

      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#161b22] border-b border-gray-800 shrink-0 z-10 shadow-xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-white">
            <Home className="w-5 h-5" />
          </button>
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">SAAME <span className="text-blue-500 font-light">Compare</span></h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-mono mt-0.5">Dual-Stream Metrology</p>
          </div>
        </div>
        
        {step === AppStep.ANALYSIS && (
          <button 
            onClick={() => setStep(AppStep.UPLOAD)}
            className="text-[10px] font-bold uppercase bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full border border-gray-700 transition-all text-gray-300"
          >
            New Comparison
          </button>
        )}
      </header>

      {/* MAIN CONTENT */}
      {/* Changed justify-center to justify-start and overflow-hidden to overflow-y-auto to allow scrolling on small screens */}
      <main className="flex-1 overflow-y-auto relative flex flex-col items-center justify-start p-6 custom-scrollbar">
        {step === AppStep.UPLOAD && (
          <div className="w-full max-w-5xl space-y-6 animate-in fade-in duration-500 my-auto">
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">Specimen Selection</h2>
              <p className="text-gray-500 text-sm">Upload exactly one pair of fonts for simultaneous rhythmic comparison.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SLOT REFERÊNCIA */}
              <div className={`p-6 rounded-3xl border-2 transition-all ${refFile.buffer ? 'bg-blue-500/5 border-blue-500/20' : 'bg-[#161b22] border-dashed border-gray-800'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">01. Reference</span>
                  {refFile.buffer && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                </div>
                <FileUpload onFileLoaded={(b, n) => setRefFile({ buffer: b, name: n })} compact={true} />
                {refFile.name && <p className="mt-2 text-center text-xs text-blue-400 font-mono truncate">{refFile.name}</p>}
              </div>

              {/* SLOT EXPERIMENTAL */}
              <div className={`p-6 rounded-3xl border-2 transition-all ${expFile.buffer ? 'bg-green-500/5 border-green-500/20' : 'bg-[#161b22] border-dashed border-gray-800'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">02. Experimental</span>
                  {expFile.buffer && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                <FileUpload onFileLoaded={(b, n) => setExpFile({ buffer: b, name: n })} compact={true} />
                {expFile.name && <p className="mt-2 text-center text-xs text-green-400 font-mono truncate">{expFile.name}</p>}
              </div>
            </div>

            <div className="flex justify-center pt-4 pb-8">
              <button 
                disabled={!refFile.buffer || !expFile.buffer}
                onClick={handleProcess}
                className={`flex items-center gap-3 px-10 py-4 rounded-full font-black text-lg uppercase tracking-tighter transition-all
                  ${(refFile.buffer && expFile.buffer) 
                    ? 'bg-white text-black hover:scale-105 shadow-2xl' 
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'}`}
              >
                Initialize Pipeline <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === AppStep.ANALYSIS && (
          <div className="w-full h-full p-0 md:p-6 animate-in zoom-in-95 duration-500">
            <LabStyleComparisonGrid 
              fontRef={refFont}
              fontExp={expFont}
              refName={refFile.name}
              expName={expFile.name}
            />
          </div>
        )}
      </main>
    </div>
  );
};
