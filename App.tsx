
import React, { useState, useEffect, useRef } from 'react';
import { 
  AppStep, 
  FontState, 
  MethodType, 
  DEFAULT_TRACY_SETTINGS, 
  TracySettings,
  DEFAULT_SOUSA_SETTINGS,
  SousaSettings 
} from './types';
import { 
  createFontState, 
  cleanMetrics, 
  applyTracyMethod, 
  applySousaMethod, 
  createFontUrl, 
  parseFont
} from './services/fontService';
import { FileUpload } from './components/FileUpload';
import { MetricTuner } from './components/MetricTuner';
import { SousaTuner } from './components/SousaTuner';
import { AnalysisCanvas } from './components/AnalysisCanvas';
// Added 'Home' to the imports from lucide-react
import { ArrowRight, Activity, Type, MousePointerClick, RefreshCcw, Loader2, PlayCircle, Columns, Home } from 'lucide-react';
import { CompareSpacingFlow } from './CompareSpacingFlow';

const App: React.FC = () => {
  // Novo estado de navegação de alto nível para suportar o novo modo sem quebrar o antigo
  const [appMode, setAppMode] = useState<'START' | 'LAB' | 'COMPARE_SPACING'>('START');

  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fontBuffer, setFontBuffer] = useState<ArrayBuffer | null>(null);
  const [fontName, setFontName] = useState<string>('');
  
  // Font States
  const [fonts, setFonts] = useState<Record<string, FontState | null>>({
    [MethodType.ORIGINAL]: null,
    [MethodType.TRACY]: null,
    [MethodType.SOUSA]: null,
  });

  const [tracySettings, setTracySettings] = useState<TracySettings>(DEFAULT_TRACY_SETTINGS);
  const [sousaSettings, setSousaSettings] = useState<SousaSettings>(DEFAULT_SOUSA_SETTINGS);
  const [tuningTab, setTuningTab] = useState<'TRACY' | 'SOUSA'>('TRACY');

  // Load CSS for fonts
  useEffect(() => {
    // Inject @font-face rules dynamically
    const styleId = 'saame-font-faces';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    let css = '';
    // Use the dynamic fullFontFamily name for accurate rendering updates
    if (fonts[MethodType.ORIGINAL]) css += `@font-face { font-family: '${fonts[MethodType.ORIGINAL]!.fullFontFamily}'; src: url('${fonts[MethodType.ORIGINAL]!.url}'); }\n`;
    if (fonts[MethodType.TRACY]) css += `@font-face { font-family: '${fonts[MethodType.TRACY]!.fullFontFamily}'; src: url('${fonts[MethodType.TRACY]!.url}'); }\n`;
    if (fonts[MethodType.SOUSA]) css += `@font-face { font-family: '${fonts[MethodType.SOUSA]!.fullFontFamily}'; src: url('${fonts[MethodType.SOUSA]!.url}'); }\n`;
    
    styleTag.textContent = css;
  }, [fonts]);

  const handleFileLoaded = async (buffer: ArrayBuffer, name: string) => {
    setIsProcessing(true);
    setTimeout(async () => {
        setFontBuffer(buffer);
        setFontName(name);

        // 1. Store Original
        const originalState = await createFontState(buffer.slice(0), MethodType.ORIGINAL);
        
        // 2. Prepare Work Copies (Cleaned)
        const tBuff = buffer.slice(0);
        const sBuff = buffer.slice(0);
        
        const tFont = await parseFont(tBuff);
        const sFont = await parseFont(sBuff);
        
        // Clean metrics first
        cleanMetrics(tFont);
        cleanMetrics(sFont);
        
        // Apply default methods immediately to ensure valid initial state
        applyTracyMethod(tFont, DEFAULT_TRACY_SETTINGS);
        applySousaMethod(sFont, DEFAULT_SOUSA_SETTINGS);
        
        const tracyState: FontState = {
            type: MethodType.TRACY,
            fontObj: tFont,
            url: createFontUrl(tFont),
            fullFontFamily: `Tracy-${Date.now()}`,
            metrics: originalState.metrics
        };

        const sousaState: FontState = {
            type: MethodType.SOUSA,
            fontObj: sFont,
            url: createFontUrl(sFont),
            fullFontFamily: `Sousa-${Date.now()}`,
            metrics: originalState.metrics
        };

        setFonts({
            [MethodType.ORIGINAL]: originalState,
            [MethodType.TRACY]: tracyState,
            [MethodType.SOUSA]: sousaState
        });

        setStep(AppStep.PREPARATION);
        setIsProcessing(false);
    }, 100);
  };

  const handleProcess = async () => {
    if (!fontBuffer) return;
    setIsProcessing(true);
    
    // Give UI time to render loading state
    setTimeout(async () => {
        // 1. Create fresh copies from original buffer
        const tracyFont = await parseFont(fontBuffer.slice(0));
        const sousaFont = await parseFont(fontBuffer.slice(0));

        // 2. Clean
        cleanMetrics(tracyFont);
        cleanMetrics(sousaFont);

        // 3. Apply Methods
        applyTracyMethod(tracyFont, tracySettings);
        applySousaMethod(sousaFont, sousaSettings);

        // 4. Update State with new URLS
        // Fixed duplicate xHeight property in the fallback metrics object
        const originalMetrics = fonts[MethodType.ORIGINAL]?.metrics || { 
            ascender: 800, descender: -200, xHeight: 500, capHeight: 700, unitsPerEm: 1000 
        };

        const newTracyState: FontState = {
            type: MethodType.TRACY,
            fontObj: tracyFont,
            url: createFontUrl(tracyFont),
            fullFontFamily: `Tracy-Final-${Date.now()}`,
            metrics: originalMetrics
        };

        const newSousaState: FontState = {
            type: MethodType.SOUSA,
            fontObj: sousaFont,
            url: createFontUrl(sousaFont),
            fullFontFamily: `Sousa-Final-${Date.now()}`,
            metrics: originalMetrics
        };

        setFonts(prev => ({
            ...prev,
            [MethodType.TRACY]: newTracyState,
            [MethodType.SOUSA]: newSousaState
        }));

        setStep(AppStep.ANALYSIS);
        setIsProcessing(false);
    }, 100);
  };

  // Debounced Tuner Update for Tracy
  useEffect(() => {
    let active = true;
    if (step === AppStep.PREPARATION && fontBuffer && tuningTab === 'TRACY') {
        const updateTuner = async () => {
            if (!active) return;
            const tempFont = await parseFont(fontBuffer.slice(0));
            if (!active) return; // check again after await
            
            cleanMetrics(tempFont);
            applyTracyMethod(tempFont, tracySettings);
            const url = createFontUrl(tempFont);
            
            // Unique family name forces browser repaint
            const familyName = `Tracy-${Date.now()}`;

            setFonts(prev => {
                if (!active) return prev;
                // Revoke old URL to avoid memory leaks
                if (prev[MethodType.TRACY]?.url) {
                    URL.revokeObjectURL(prev[MethodType.TRACY]!.url);
                }
                return { 
                  ...prev, 
                  [MethodType.TRACY]: { 
                      ...prev[MethodType.TRACY]!, 
                      fontObj: tempFont, 
                      url,
                      fullFontFamily: familyName
                  } 
                };
            });
        };
        const timer = setTimeout(updateTuner, 100); // Fast debounce
        return () => { active = false; clearTimeout(timer); };
    }
  }, [tracySettings, step, tuningTab, fontBuffer]);

  // Debounced Tuner Update for Sousa
  useEffect(() => {
    let active = true;
    if (step === AppStep.PREPARATION && fontBuffer && tuningTab === 'SOUSA') {
        const updateTuner = async () => {
            if (!active) return;
            const tempFont = await parseFont(fontBuffer.slice(0));
            if (!active) return;

            cleanMetrics(tempFont);
            applySousaMethod(tempFont, sousaSettings);
            const url = createFontUrl(tempFont);
            
            const familyName = `Sousa-${Date.now()}`;

            setFonts(prev => {
                if (!active) return prev;
                if (prev[MethodType.SOUSA]?.url) {
                    URL.revokeObjectURL(prev[MethodType.SOUSA]!.url);
                }
                return { 
                  ...prev, 
                  [MethodType.SOUSA]: { 
                      ...prev[MethodType.SOUSA]!, 
                      fontObj: tempFont, 
                      url,
                      fullFontFamily: familyName
                  } 
                };
            });
        };
        const timer = setTimeout(updateTuner, 100); 
        return () => { active = false; clearTimeout(timer); };
    }
  }, [sousaSettings, step, tuningTab, fontBuffer]);

  // NOVO: Renderização condicional da Tela Inicial
  if (appMode === 'START') {
    return (
      <div className="flex flex-col h-screen bg-gray-950 text-gray-200 items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-gray-950 to-gray-950">
        <div className="text-center mb-12">
          <div className="bg-blue-600 p-4 rounded-2xl inline-block mb-6 shadow-2xl shadow-blue-500/20">
            <Activity className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">SAAME <span className="text-blue-500 font-light">Laboratory</span></h1>
          <p className="text-gray-400 max-w-md mx-auto text-lg">Ambiente profissional para experimentação e processamento rítmico tipográfico.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <button 
            onClick={() => setAppMode('LAB')}
            className="flex flex-col items-center p-8 bg-gray-900 border border-gray-800 rounded-2xl hover:border-blue-500/50 hover:bg-gray-800 transition-all group shadow-xl"
          >
            <PlayCircle className="w-12 h-12 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-2">SAAME Lab (Testar)</h3>
            <p className="text-gray-500 text-sm text-center">Fluxo ajuste fino e processamento de uma única fonte.</p>
          </button>

          <button 
            onClick={() => setAppMode('COMPARE_SPACING')}
            className="flex flex-col items-center p-8 bg-gray-900 border border-gray-800 rounded-2xl hover:border-green-500/50 hover:bg-gray-800 transition-all group shadow-xl"
          >
            <Columns className="w-12 h-12 text-green-500 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-2">Comparar Espaçamento</h3>
            <p className="text-gray-500 text-sm text-center">Analise entre duas fontes independentes simultaneamente.</p>
          </button>
        </div>
        <p className="mt-12 text-[10px] uppercase tracking-[0.2em] text-gray-600 font-mono">Powered by SAAME Typography Framework</p>
      </div>
    );
  }

  // NOVO: Renderização do novo fluxo COMPARE_SPACING
  if (appMode === 'COMPARE_SPACING') {
    return <CompareSpacingFlow onBack={() => setAppMode('START')} />;
  }

  // O RESTO DO COMPONENTE PERMANECE ABSOLUTAMENTE IGUAL (Fluxo LAB original)
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 font-sans relative">
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center flex-col">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-white font-medium animate-pulse">Processing Font Data...</p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Adicionado botão Home para o fluxo Lab */}
          <button onClick={() => setAppMode('START')} className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white transition-colors">
            <Home className="w-5 h-5" />
          </button>
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">SAAME <span className="text-blue-500 font-light">Lab</span></h1>
            <p className="hidden md:block text-xs text-gray-500 uppercase tracking-widest">Type Experimentation Environment</p>
          </div>
        </div>
        
        {/* Progress Stepper */}
        <div className="flex items-center gap-2 md:gap-4 text-sm font-medium w-full md:w-auto justify-center md:justify-end">
            <div className={`flex items-center gap-2 ${step === AppStep.UPLOAD ? 'text-blue-400' : 'text-gray-600'}`}>
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">1</span>
                <span className="hidden sm:inline">Upload</span>
            </div>
            <div className="w-4 md:w-8 h-px bg-gray-800" />
            <div className={`flex items-center gap-2 ${step === AppStep.PREPARATION ? 'text-blue-400' : 'text-gray-600'}`}>
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">2</span>
                <span className="hidden sm:inline">Tune</span>
            </div>
            <div className="w-4 md:w-8 h-px bg-gray-800" />
             <div className={`flex items-center gap-2 ${step === AppStep.ANALYSIS ? 'text-blue-400' : 'text-gray-600'}`}>
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">3</span>
                <span className="hidden sm:inline">Analysis</span>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-2 md:p-6">
        
        {step === AppStep.UPLOAD && (
            <div className="max-w-2xl mx-auto pt-12 px-4">
                <FileUpload onFileLoaded={handleFileLoaded} />
                <div className="mt-8 text-center text-gray-500 text-sm max-w-lg mx-auto">
                    Upload an .otf or .ttf file. The system will automatically generate a clean copy (zero metrics) and an Original reference copy.
                </div>
            </div>
        )}

        {step === AppStep.PREPARATION && (
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-full">
                {/* Tuning Panel */}
                <div className="lg:col-span-5 h-full flex flex-col order-2 lg:order-1 min-h-[400px]">
                    <div className="flex gap-2 mb-2 bg-gray-900 p-1 rounded-lg border border-gray-800 w-full sm:w-fit self-center lg:self-start">
                        <button 
                            onClick={() => setTuningTab('TRACY')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm font-medium transition-colors ${tuningTab === 'TRACY' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Tracy Method
                        </button>
                        <button 
                            onClick={() => setTuningTab('SOUSA')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm font-medium transition-colors ${tuningTab === 'SOUSA' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Sousa Method
                        </button>
                    </div>

                    {tuningTab === 'TRACY' ? (
                        <MetricTuner 
                            settings={tracySettings} 
                            onSettingsChange={setTracySettings}
                            fontFamily={fonts[MethodType.TRACY]?.fullFontFamily || 'sans-serif'}
                            font={fonts[MethodType.TRACY]}
                        />
                    ) : (
                        <SousaTuner 
                            settings={sousaSettings}
                            onSettingsChange={setSousaSettings}
                            fontFamily={fonts[MethodType.SOUSA]?.fullFontFamily || 'sans-serif'}
                            font={fonts[MethodType.SOUSA]}
                        />
                    )}
                </div>

                {/* Info Panel */}
                <div className="lg:col-span-7 flex flex-col h-full order-1 lg:order-2 shrink-0 lg:shrink">
                    <div className="bg-gray-800/50 flex-1 rounded-lg border border-gray-700 p-6 md:p-8 flex items-center justify-center flex-col text-center shadow-lg">
                        <div className="bg-gray-900/50 p-6 rounded-full mb-6">
                            <Type className="w-12 h-12 text-blue-500" />
                        </div>
                        <h3 className="text-xl md:text-3xl font-light text-white mb-2">{fontName}</h3>
                        <div className="w-12 h-1 bg-gray-700 rounded mb-4"></div>
                        <p className="text-gray-400 max-w-md mb-8 text-sm md:text-base leading-relaxed">
                            {tuningTab === 'TRACY' 
                                ? "Adjust the master glyphs using Tracy's strict propagation rules. Use the visualizer to see the Sidebearings in real-time."
                                : "Define groups and sequentially tune specific glyphs using adhesion strings. Adjust overrides visually."
                            }
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button 
                                onClick={() => setStep(AppStep.UPLOAD)}
                                className="px-6 py-3 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors w-full sm:w-auto"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleProcess}
                                className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 hover:opacity-90 text-white font-semibold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 w-full sm:w-auto transform hover:scale-105 transition-all"
                            >
                                Process Both & Compare <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {step === AppStep.ANALYSIS && (
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        <MousePointerClick className="w-5 h-5 text-green-400" />
                        Comparative Analysis
                    </h2>
                    <button 
                        onClick={() => setStep(AppStep.PREPARATION)}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <RefreshCcw className="w-3 h-3" /> <span className="hidden sm:inline">Adjust Settings</span>
                    </button>
                </div>
                <div className="flex-1 min-h-0">
                    <AnalysisCanvas fonts={fonts} />
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
