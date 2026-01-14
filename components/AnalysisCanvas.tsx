
import React, { useState, useMemo } from 'react';
import { FontState, MethodType } from '../types';
import { Layers, Type, AlignJustify, Download, BarChart2, Columns } from 'lucide-react';
import { calculateAverageSB, downloadFont, getCharMetrics, generateFontFaceCSS } from '../services/fontService';
import { SpacingDiagram } from './SpacingDiagram';
import { SousaAnalysisView } from './SousaAnalysisView';

interface AnalysisCanvasProps {
  fonts: Record<string, FontState | null>;
  isCompareMode?: boolean;
  customLabels?: {
      original: string;
      tracy: string;
  };
}

const PARAGRAPH_TEXT = "Hook, a do. Joe, succor asclepias cod efferent. Fans rolls, oceania leets boise sentimentalisation, geologian pedicels, plowtail, dip em kinins tetracerous, non a revisal, at. Clamer goon, downstrokes imputative blip ballonne, yakin ouenite, he. Em arapunga, oat, a feud. Palaeoclimatologist, a ten noncrucial a to, rauli, a sirky, coy, if, pour my xmas. Hew, wisher seventy. Conducts, ya note, algic. Iricism, mil, swob groundling, koruny, hi lode, overwoman, shrive. Educate am fractocumulus, they tempt. Us goloe, offic, wammus, luminescing. Wow, relighted. Veracious glacon, seed, dram bat oral sgabellos noviceship, age neo cant bethorn, cirri nondepressed laserdisks, mom owl, fall. Multicordate, is, splint chremzel a he, kodak, acre, yokel, pope kong. A mojarra, savant, dredges, squattest ye. Plonked algologist, sip citrin. us gimp, woke, congressing.";

// --- NEW COMPONENT: Displays metrics for glyphs NOT in the standard topology (Numbers, Punctuation, etc.) ---
const RemainingGlyphsView = ({ font, method }: { font: FontState | null, method: MethodType }) => {
    const glyphs = useMemo(() => {
        if (!font || !font.fontObj) return [];
        
        const standardChars = new Set([
            ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''),
            ..."abcdefghijklmnopqrstuvwxyz".split('')
        ]);
        
        const found: Array<{ char: string, lsb: number, rsb: number, unicode: number }> = [];
        
        const numGlyphs = font.fontObj.glyphs.length;
        for (let i = 0; i < numGlyphs; i++) {
            const glyph = font.fontObj.glyphs.get(i);
            if (glyph.unicode) {
                try {
                    const char = String.fromCodePoint(glyph.unicode);
                    // Filter out standard chars (shown above), control chars, and invisible glyphs
                    if (!standardChars.has(char) && char.trim() !== '') {
                        const { lsb, rsb } = getCharMetrics(font.fontObj, char);
                        found.push({ char, lsb, rsb, unicode: glyph.unicode });
                    }
                } catch (e) {}
            }
        }
        return found.sort((a, b) => a.unicode - b.unicode);
    }, [font]);

    if (!font || !font.fontObj || glyphs.length === 0) return null;

    const methodColor = method === MethodType.TRACY ? 'text-pink-400' : 'text-cyan-400';
    const borderColor = method === MethodType.TRACY ? 'border-pink-500/20' : 'border-cyan-500/20';

    return (
        <div className="mt-8 pt-6 border-t border-gray-800">
             <h4 className={`text-sm font-bold uppercase mb-4 tracking-wider flex items-center gap-2 ${methodColor}`}>
                 Extended Character Set (Numbers, Punctuation & Symbols)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {glyphs.map(g => (
                    <div key={g.unicode} className={`bg-gray-800/30 rounded h-16 p-1 flex items-center border ${borderColor} hover:bg-gray-800 transition-colors`}>
                        <div className="flex-1 flex flex-col items-center justify-center h-full border-r border-gray-700/30">
                            <span className="text-[9px] text-gray-500 font-bold mb-0.5 leading-none">L</span>
                            <span className="text-[11px] text-gray-300 font-mono leading-none">{g.lsb}</span>
                        </div>
                        <div 
                            className="w-10 text-xl text-white text-center flex items-center justify-center leading-none pb-1"
                            style={{ fontFamily: font.fullFontFamily }}
                        >
                            {g.char}
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center h-full border-l border-gray-700/30">
                            <span className="text-[9px] text-gray-500 font-bold mb-0.5 leading-none">R</span>
                            <span className="text-[11px] text-gray-300 font-mono leading-none">{g.rsb}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AnalysisCanvas: React.FC<AnalysisCanvasProps> = ({ fonts, isCompareMode = false, customLabels }) => {
  const [testText, setTestText] = useState("HHOOHOH\nnnoonon\nminimum");
  const [fontSize, setFontSize] = useState(120);
  const [viewMode, setViewMode] = useState<'stack' | 'overlay' | 'metrics' | 'side-by-side'>('side-by-side');
  
  const originalFont = fonts[MethodType.ORIGINAL];
  const tracyFont = fonts[MethodType.TRACY];
  const sousaFont = fonts[MethodType.SOUSA];

  // Logic to determine labels based on mode and props
  const labelOriginal = isCompareMode 
    ? (customLabels?.original || 'Original Reference') 
    : (originalFont?.fullFontFamily || 'Original');
    
  const labelTracy = isCompareMode 
    ? (customLabels?.tracy || 'Adjusted Specimen') 
    : "Walter Tracy's Method";

  const handleExport = (type: MethodType) => {
      const fontState = fonts[type];
      if (fontState?.fontObj) {
          downloadFont(fontState.fontObj, type);
      }
  };

  const getAvgSB = (type: MethodType) => {
      const f = fonts[type];
      return f?.fontObj ? calculateAverageSB(f.fontObj) : 0;
  };

  const setPreset = (text: string, size: number) => {
      setTestText(text);
      setFontSize(size);
  };

  // --- PRECISE METRIC CALCULATIONS ---
  // Calculates the absolute Y positions for grid lines and text positioning
  const calculateMetrics = () => {
      // Default fallback
      const empty = { 
          grid: '', 
          lhPx: fontSize * 1.5, 
          refBaseline: 0, 
          expCorrectionY: 0 
      };

      if (!originalFont?.metrics) return empty;

      // 1. Constants
      const LH_RATIO = 1.5;
      const lhPx = fontSize * LH_RATIO;
      
      // 2. Reference Metrics (The Source of Truth for the Grid)
      const refM = originalFont.metrics;
      // Safeguard against invalid UPM
      const safeRefUPM = refM.unitsPerEm || 1000; 
      const refScale = fontSize / safeRefUPM;
      
      // Browser vertical alignment logic for CSS with metric overrides:
      // When ascent-override and descent-override are set, the content area height
      // is effectively calculated as (Ascent + |Descent|).
      const refContentH = (refM.ascender + Math.abs(refM.descender)) * refScale;
      
      // Leading = LineHeight - ContentHeight
      const refLeading = lhPx - refContentH;
      
      // TopOffset = Leading / 2
      // BaselineY = TopOffset + Ascender
      // This positions the baseline relative to the top of the line-box
      const refBaselineY = (refLeading / 2) + (refM.ascender * refScale);

      // Grid Coordinates (Aligned to Reference)
      const gridY = {
          asc: refBaselineY - (refM.ascender * refScale),
          cap: refBaselineY - (refM.capHeight * refScale),
          x: refBaselineY - (refM.xHeight * refScale),
          base: refBaselineY,
          desc: refBaselineY + (Math.abs(refM.descender) * refScale) // Positive direction downwards
      };

      // 3. Experimental Metrics (For alignment correction)
      let expCorrectionY = 0;
      if (tracyFont?.metrics) {
          const expM = tracyFont.metrics;
          const safeExpUPM = expM.unitsPerEm || 1000;
          const expScale = fontSize / safeExpUPM;
          
          const expContentH = (expM.ascender + Math.abs(expM.descender)) * expScale;
          const expLeading = lhPx - expContentH;
          const expNaturalBaselineY = (expLeading / 2) + (expM.ascender * expScale);
          
          // Calculate the delta needed to shift Experimental baseline to match Reference baseline
          expCorrectionY = refBaselineY - expNaturalBaselineY;
      }

      // 4. Generate SVG Grid
      let svgContent = '';

      if (isCompareMode) {
        // COMPARE MODE: Colored lines, NO TEXT LABELS
        // Colors: Asc(Yellow), Cap(Green), x(Blue), Base(White), Desc(Red)
        svgContent = `
            <svg width="100%" height="${lhPx}" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
                <style>
                    .line { stroke-width: 0.5px; vector-effect: non-scaling-stroke; stroke-dasharray: 4 2; opacity: 0.5; }
                    .base { stroke-width: 0.8px; stroke-dasharray: none; opacity: 0.7; }
                </style>
                <!-- Ascender (Yellow) -->
                <line x1="0" y1="${gridY.asc}" x2="100%" y2="${gridY.asc}" class="line" stroke="#EAB308" />

                <!-- Cap Height (Green) -->
                <line x1="0" y1="${gridY.cap}" x2="100%" y2="${gridY.cap}" class="line" stroke="#22C55E" />

                <!-- x-Height (Blue) -->
                <line x1="0" y1="${gridY.x}" x2="100%" y2="${gridY.x}" class="line" stroke="#3B82F6" />

                <!-- Baseline (White) -->
                <line x1="0" y1="${gridY.base}" x2="100%" y2="${gridY.base}" class="base" stroke="#FFFFFF" />

                <!-- Descender (Red) -->
                <line x1="0" y1="${gridY.desc}" x2="100%" y2="${gridY.desc}" class="line" stroke="#EF4444" />
            </svg>
        `;
      } else {
        // STANDARD LAB MODE: Gray dotted lines WITH TEXT LABELS
        svgContent = `
            <svg width="100%" height="${lhPx}" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
                <defs>
                    <style>
                        .txt { font-family: 'Fira Code', monospace; font-size: 8px; font-weight: 500; }
                        .line { stroke-width: 0.5px; vector-effect: non-scaling-stroke; }
                        .ref { stroke: rgba(255, 255, 255, 0.2); stroke-dasharray: 2 2; }
                        .lbl { fill: rgba(255, 255, 255, 0.4); }
                        .base { stroke: rgba(6, 182, 212, 0.7); stroke-width: 0.8px; } 
                    </style>
                </defs>

                <!-- Ascender -->
                <line x1="0" y1="${gridY.asc}" x2="100%" y2="${gridY.asc}" class="line ref" />
                <text x="4" y="${gridY.asc + 8}" class="txt lbl">ASC</text>

                <!-- Cap Height -->
                <line x1="0" y1="${gridY.cap}" x2="100%" y2="${gridY.cap}" class="line ref" />
                <text x="28" y="${gridY.cap + 8}" class="txt lbl">CAP</text>

                <!-- x-Height -->
                <line x1="0" y1="${gridY.x}" x2="100%" y2="${gridY.x}" class="line ref" />
                <text x="4" y="${gridY.x - 3}" class="txt lbl">x-H</text>

                <!-- Baseline (Highlighted) -->
                <line x1="0" y1="${gridY.base}" x2="100%" y2="${gridY.base}" class="line base" />
                <text x="4" y="${gridY.base - 3}" class="txt lbl" style="fill: rgba(6, 182, 212, 0.8)">BASE</text>

                <!-- Descender -->
                <line x1="0" y1="${gridY.desc}" x2="100%" y2="${gridY.desc}" class="line ref" />
                <text x="4" y="${gridY.desc - 3}" class="txt lbl">DESC</text>
            </svg>
        `;
      }

      return {
          grid: `url("data:image/svg+xml;utf8,${encodeURIComponent(svgContent.replace(/\s+/g, ' ').trim())}")`,
          lhPx,
          refBaseline: refBaselineY,
          expCorrectionY
      };
  };

  const { grid, lhPx, expCorrectionY } = calculateMetrics();

  const ComparativeMetricsView = ({ category }: { category: 'Uppercase' | 'Lowercase' }) => {
      const chars = category === 'Uppercase' ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('') : "abcdefghijklmnopqrstuvwxyz".split('');
      
      if (!originalFont?.fontObj || !tracyFont?.fontObj) return null;

      return (
          <div className="mb-8">
              <h4 className="text-sm font-bold uppercase mb-4 tracking-wider text-gray-400 border-b border-gray-800 pb-2">
                  {category} Comparison
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {chars.map(char => {
                      const m1 = getCharMetrics(originalFont.fontObj!, char);
                      const m2 = getCharMetrics(tracyFont.fontObj!, char);
                      
                      const diffL = m2.lsb - m1.lsb;
                      const diffR = m2.rsb - m1.rsb;
                      
                      const hasChange = diffL !== 0 || diffR !== 0;

                      return (
                          <div key={char} className={`bg-gray-800/40 rounded p-3 border ${hasChange ? 'border-cyan-500/30 bg-cyan-900/5' : 'border-gray-700/50'} flex flex-col gap-2 group hover:bg-gray-800 transition-colors`}>
                              {/* Header */}
                              <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                                  <span className="text-3xl leading-none text-white" style={{ fontFamily: tracyFont.fullFontFamily }}>{char}</span>
                                  <span className="text-[10px] text-gray-600 font-mono">{char.charCodeAt(0)}</span>
                              </div>

                              {/* LSB Block */}
                              <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 font-bold text-[10px] w-8">LSB</span>
                                  <div className="flex-1 flex justify-between items-center">
                                      <span className="text-gray-500 text-[10px]">{m1.lsb}</span>
                                      <span className="text-gray-600 text-[10px]">→</span>
                                      <span className={`font-mono font-medium ${diffL !== 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                                          {m2.lsb}
                                      </span>
                                  </div>
                              </div>

                              {/* RSB Block */}
                              <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 font-bold text-[10px] w-8">RSB</span>
                                  <div className="flex-1 flex justify-between items-center">
                                      <span className="text-gray-500 text-[10px]">{m1.rsb}</span>
                                      <span className="text-gray-600 text-[10px]">→</span>
                                      <span className={`font-mono font-medium ${diffR !== 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                                          {m2.rsb}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      )
                  })}
              </div>
          </div>
      );
  };

  const ExtendedComparativeView = () => {
        if (!originalFont?.fontObj || !tracyFont?.fontObj) return null;

        const glyphs = useMemo(() => {
            const standardChars = new Set([
                ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''),
                ..."abcdefghijklmnopqrstuvwxyz".split('')
            ]);
            
            const found: Array<{ char: string, unicode: number }> = [];
            const numGlyphs = tracyFont.fontObj.glyphs.length;
            
            for (let i = 0; i < numGlyphs; i++) {
                const glyph = tracyFont.fontObj.glyphs.get(i);
                if (glyph.unicode) {
                    try {
                        const char = String.fromCodePoint(glyph.unicode);
                        // Filter out standard chars, control chars, and invisible glyphs
                        if (!standardChars.has(char) && char.trim() !== '') {
                            found.push({ char, unicode: glyph.unicode });
                        }
                    } catch (e) {}
                }
            }
            return found.sort((a, b) => a.unicode - b.unicode);
        }, []);

        if (glyphs.length === 0) return null;

        return (
            <div className="mb-8 mt-12 pt-8 border-t border-gray-800">
                <h4 className="text-sm font-bold uppercase mb-4 tracking-wider text-gray-400 border-b border-gray-800 pb-2">
                    Extended Character Set Comparison
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {glyphs.map(g => {
                        const m1 = getCharMetrics(originalFont.fontObj!, g.char);
                        const m2 = getCharMetrics(tracyFont.fontObj!, g.char);
                        
                        const diffL = m2.lsb - m1.lsb;
                        const diffR = m2.rsb - m1.rsb;
                        const hasChange = diffL !== 0 || diffR !== 0;

                        return (
                            <div key={g.unicode} className={`bg-gray-800/40 rounded p-3 border ${hasChange ? 'border-cyan-500/30 bg-cyan-900/5' : 'border-gray-700/50'} flex flex-col gap-2 group hover:bg-gray-800 transition-colors`}>
                                {/* Header */}
                                <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                                    <span className="text-2xl leading-none text-white w-full text-center" style={{ fontFamily: tracyFont.fullFontFamily }}>{g.char}</span>
                                </div>
                                <div className="text-[9px] text-gray-600 font-mono text-center mb-1">{g.unicode} (U+{g.unicode.toString(16).toUpperCase()})</div>

                                {/* LSB Block */}
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold text-[10px] w-6">L</span>
                                    <div className="flex-1 flex justify-between items-center pl-2">
                                        <span className="text-gray-500 text-[10px]">{m1.lsb}</span>
                                        <span className="text-gray-600 text-[10px]">→</span>
                                        <span className={`font-mono font-medium ${diffL !== 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                                            {m2.lsb}
                                        </span>
                                    </div>
                                </div>

                                {/* RSB Block */}
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold text-[10px] w-6">R</span>
                                    <div className="flex-1 flex justify-between items-center pl-2">
                                        <span className="text-gray-500 text-[10px]">{m1.rsb}</span>
                                        <span className="text-gray-600 text-[10px]">→</span>
                                        <span className={`font-mono font-medium ${diffR !== 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                                            {m2.rsb}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-xl">
       {/* Inject Local Styles to enforce precision within this canvas context */}
       <style>
            {Object.values(fonts).filter((f): f is FontState => !!f).map(f => generateFontFaceCSS(f)).join('\n')}
       </style>

      {/* Toolbar */}
      <div className="bg-gray-800 p-3 flex flex-col xl:flex-row gap-4 border-b border-gray-700">
        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
            <div className="flex items-center gap-2 px-2 bg-gray-700/50 rounded p-1">
                <Type className="w-4 h-4 text-gray-400" />
                <input 
                    type="number" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-16 bg-gray-700 border border-gray-600 rounded px-1 text-sm text-center text-white"
                />
                <span className="text-xs text-gray-400">px</span>
            </div>
            
            <div className="flex gap-1 bg-gray-700/50 rounded p-1">
                 <button 
                    onClick={() => setViewMode('side-by-side')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'side-by-side' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-600'}`}
                    title="Side by Side Paragraphs"
                 >
                    <Columns className="w-4 h-4" />
                 </button>
                 {!isCompareMode && (
                 <button 
                    onClick={() => setViewMode('stack')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'stack' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-600'}`}
                    title="Stacked View"
                 >
                    <AlignJustify className="w-4 h-4" />
                 </button>
                 )}
                 <button 
                    onClick={() => setViewMode('overlay')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'overlay' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-600'}`}
                    title="Overlay View"
                 >
                    <Layers className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setViewMode('metrics')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'metrics' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-600'}`}
                    title="Metrics Data"
                 >
                    <BarChart2 className="w-4 h-4" />
                 </button>
            </div>
        </div>

        <div className="flex-1 flex gap-2">
            <textarea 
                value={testText} 
                onChange={(e) => setTestText(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 font-sans min-w-0 resize-none h-10 leading-tight"
                placeholder="Type test text here..."
            />
            <div className="flex flex-col gap-1 justify-center">
                 <div className="flex gap-1">
                    <button onClick={() => setPreset("HHOOHOH\nnnoonon\nminimum", 120)} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-gray-300 whitespace-nowrap flex-1">Analysis</button>
                    <button onClick={() => setPreset("Hamburgforeigns", 120)} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-gray-300 whitespace-nowrap flex-1">Word</button>
                 </div>
                 <button onClick={() => setPreset(PARAGRAPH_TEXT, 18)} className="text-[10px] bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800 px-2 py-0.5 rounded text-blue-200 whitespace-nowrap w-full">¶ Paragraph</button>
            </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-950 relative">
        
        {viewMode === 'side-by-side' && (
             <div className={`grid ${isCompareMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'} gap-0 h-full divide-y md:divide-y-0 md:divide-x divide-gray-800`}>
                {/* Original */}
                <div className="flex flex-col h-full bg-gray-900/30 order-1">
                     <div className="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center sticky top-0 z-10">
                         <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 truncate max-w-[200px]" title={labelOriginal}>
                             {labelOriginal}
                         </h4>
                         <button onClick={() => handleExport(MethodType.ORIGINAL)} className="opacity-50 hover:opacity-100"><Download className="w-3 h-3 text-gray-400" /></button>
                     </div>
                     <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                        {/* Added explicit line-height to match metrics logic even in paragraph view */}
                        <p style={{ fontFamily: originalFont?.fullFontFamily || 'serif', fontSize: `${fontSize}px`, lineHeight: 1.5 }} className="text-gray-300 whitespace-pre-wrap break-words">
                            {testText}
                        </p>
                     </div>
                </div>

                {/* Adjusted / Tracy */}
                <div className="flex flex-col h-full order-2">
                     <div className="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center sticky top-0 z-10">
                         <h4 className={`text-xs font-bold uppercase tracking-widest ${isCompareMode ? 'text-cyan-400' : 'text-pink-400'} truncate max-w-[200px]`} title={labelTracy}>
                            {labelTracy}
                         </h4>
                         <button onClick={() => handleExport(MethodType.TRACY)} className="opacity-50 hover:opacity-100"><Download className={`w-3 h-3 ${isCompareMode ? 'text-cyan-400' : 'text-pink-400'}`} /></button>
                     </div>
                     <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                        <p style={{ fontFamily: tracyFont?.fullFontFamily || 'serif', fontSize: `${fontSize}px`, lineHeight: 1.5 }} className="text-gray-200 whitespace-pre-wrap break-words">
                            {testText}
                        </p>
                     </div>
                </div>

                {/* Sousa Method - Hidden in Compare Mode */}
                {!isCompareMode && (
                    <div className="flex flex-col h-full order-3">
                         <div className="p-3 border-b border-gray-800 bg-gray-900 flex justify-between items-center sticky top-0 z-10">
                             <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Miguel Sousa's Method</h4>
                             <button onClick={() => handleExport(MethodType.SOUSA)} className="opacity-50 hover:opacity-100"><Download className="w-3 h-3 text-cyan-400" /></button>
                         </div>
                         <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                            <p style={{ fontFamily: sousaFont?.fullFontFamily || 'serif', fontSize: `${fontSize}px`, lineHeight: 1.5 }} className="text-gray-200 whitespace-pre-wrap break-words">
                                {testText}
                            </p>
                         </div>
                    </div>
                )}
             </div>
        )}

        {viewMode === 'stack' && (
            <div className="space-y-8 p-4 md:p-8">
                {originalFont?.url && (
                    <div className="border-l-4 border-gray-500 pl-4 bg-gray-900/40 p-4 rounded-r transition-all hover:bg-gray-900/60">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs uppercase text-gray-500 font-bold tracking-wider flex items-center gap-2">
                                <span className="w-3 h-3 bg-gray-500 rounded-sm"></span> {labelOriginal}
                             </h4>
                             <button onClick={() => handleExport(MethodType.ORIGINAL)} className="text-xs text-gray-400 hover:text-white flex gap-1 items-center bg-gray-800 px-2 py-1 rounded border border-gray-700"><Download className="w-3 h-3"/> OTF</button>
                        </div>
                        <p style={{ fontFamily: originalFont.fullFontFamily, fontSize: `${fontSize}px`, lineHeight: 1.5 }} className="text-white opacity-90 break-words whitespace-pre-wrap">
                            {testText}
                        </p>
                    </div>
                )}
                {tracyFont?.url && (
                    <div className={`border-l-4 ${isCompareMode ? 'border-cyan-500 bg-cyan-900/10 hover:bg-cyan-900/20' : 'border-pink-500 bg-pink-900/10 hover:bg-pink-900/20'} pl-4 p-4 rounded-r transition-all`}>
                        <div className="flex justify-between items-center mb-2">
                             <h4 className={`text-xs uppercase font-bold tracking-wider flex items-center gap-2 ${isCompareMode ? 'text-cyan-500' : 'text-pink-500'}`}>
                                <span className={`w-3 h-3 rounded-sm ${isCompareMode ? 'bg-cyan-500' : 'bg-pink-500'}`}></span> 
                                {labelTracy}
                             </h4>
                             <button onClick={() => handleExport(MethodType.TRACY)} className={`text-xs hover:text-white flex gap-1 items-center bg-gray-800 px-2 py-1 rounded border border-gray-700 ${isCompareMode ? 'text-cyan-400' : 'text-pink-400'}`}><Download className="w-3 h-3"/> OTF</button>
                        </div>
                        <p style={{ fontFamily: tracyFont.fullFontFamily, fontSize: `${fontSize}px`, lineHeight: 1.5 }} className="text-white break-words whitespace-pre-wrap">
                            {testText}
                        </p>
                    </div>
                )}
                {!isCompareMode && sousaFont?.url && (
                    <div className="border-l-4 border-cyan-500 pl-4 bg-cyan-900/10 p-4 rounded-r transition-all hover:bg-cyan-900/20">
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs uppercase text-cyan-500 font-bold tracking-wider flex items-center gap-2">
                                <span className="w-3 h-3 bg-cyan-500 rounded-sm"></span> Sousa Method
                             </h4>
                             <button onClick={() => handleExport(MethodType.SOUSA)} className="text-xs text-cyan-400 hover:text-white flex gap-1 items-center bg-gray-800 px-2 py-1 rounded border border-gray-700"><Download className="w-3 h-3"/> OTF</button>
                        </div>
                        <p style={{ fontFamily: sousaFont.fullFontFamily, fontSize: `${fontSize}px`, lineHeight: 1.5 }} className="text-white break-words whitespace-pre-wrap">
                            {testText}
                        </p>
                    </div>
                )}
            </div>
        )}

        {viewMode === 'overlay' && (
            <div className="relative pt-8 min-h-[500px] flex justify-center p-4">
                
                {/* Legend */}
                 <div className="fixed bottom-8 right-8 bg-gray-900/90 backdrop-blur p-4 rounded-lg border border-gray-700 z-50 text-xs shadow-2xl pointer-events-none min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-4 h-4 border border-gray-500 rounded bg-transparent"></span> 
                        <span className="text-gray-300 truncate max-w-[150px]">{labelOriginal}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-4 h-4 border rounded bg-transparent ${isCompareMode ? 'border-cyan-500' : 'border-pink-500'}`}></span> 
                        <span className={`${isCompareMode ? 'text-cyan-400' : 'text-pink-400'} truncate max-w-[150px]`}>
                            {labelTracy}
                        </span>
                    </div>
                    {/* Explicitly show Sousa legend in standard SAAME Lab mode */}
                    {!isCompareMode && (
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-4 h-4 border border-cyan-500 rounded bg-transparent"></span> 
                            <span className="text-cyan-400">Sousa (Cyan)</span>
                        </div>
                    )}
                    
                    {/* Grid Lines Legend (Compare Mode Only) */}
                    {isCompareMode && (
                        <div className="border-t border-gray-700 mt-2 pt-2">
                            <div className="text-[10px] text-gray-900 uppercase font-bold mb-1">Grid Lines</div>
                            <div className="grid grid-cols-2 gap-1">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-yellow-400"></div> <span className="text-gray-400">Ascender</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-green-400"></div> <span className="text-gray-400">Cap Height</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-blue-400"></div> <span className="text-gray-400">x-Height</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-white"></div> <span className="text-white">Baseline</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-red-400"></div> <span className="text-gray-400">Descender</span></div>
                            </div>
                        </div>
                    )}

                    {isCompareMode && (
                         <div className="mt-2 text-[9px] text-gray-500 italic border-t border-gray-700 pt-2">
                             Visuals rendered as wireframes. Baselines are forced to align mathematically.
                         </div>
                    )}
                </div>

                <div className="w-full text-center">
                    <div className="relative inline-block text-left">
                        
                         {/* Original (Reference) - Anchored at Top 0 */}
                        <div 
                            className="absolute top-0 left-0 z-10 select-none pointer-events-none w-full"
                            style={{ 
                                fontFamily: originalFont?.fullFontFamily || 'Original', 
                                fontSize: `${fontSize}px`,
                                color: 'transparent',
                                WebkitTextStroke: '0.8px rgba(156, 163, 175, 0.6)', 
                                whiteSpace: 'pre-wrap',
                                lineHeight: `${lhPx}px`,
                                height: '100%'
                            }}
                        >
                            {testText}
                        </div>

                        {/* Adjusted (Experimental) - Anchored at Calculated Correction Y */}
                        <div 
                            className={`absolute left-0 z-20 select-none pointer-events-none w-full ${isCompareMode ? 'select-text z-30' : ''}`}
                            style={{ 
                                top: `${expCorrectionY}px`, // Force alignment to Reference Baseline
                                fontFamily: tracyFont?.fullFontFamily || 'Tracy', 
                                fontSize: `${fontSize}px`,
                                color: 'transparent',
                                WebkitTextStroke: isCompareMode ? '0.8px rgba(6, 182, 212, 0.8)' : '1px rgba(236, 72, 153, 0.8)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: `${lhPx}px`,
                                height: '100%'
                            }}
                        >
                            {testText}
                        </div>

                        {/* Sousa - Hidden in Compare */}
                        {!isCompareMode && (
                            <div 
                                className="relative z-30 select-text w-full"
                                style={{ 
                                    fontFamily: sousaFont?.fullFontFamily || 'Sousa', 
                                    fontSize: `${fontSize}px`,
                                    WebkitTextStroke: '1px rgba(6, 182, 212, 0.9)', 
                                    color: 'transparent',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: `${lhPx}px`
                                }}
                            >
                                {testText}
                            </div>
                        )}
                        
                        {/* Independent SVG Grid Overlay Layer - Rendered ON TOP (z-50) */}
                        {isCompareMode && (
                            <div 
                                style={{
                                    backgroundImage: grid,
                                    backgroundSize: `100% ${lhPx}px`,
                                    backgroundRepeat: 'repeat-y',
                                    backgroundPosition: '0 0',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    pointerEvents: 'none',
                                    zIndex: 50
                                }}
                            />
                        )}

                        {/* Placeholder to give height/shape to container */}
                        {isCompareMode && (
                             <div style={{ fontSize: `${fontSize}px`, opacity: 0, pointerEvents: 'none', lineHeight: `${lhPx}px`, whiteSpace: 'pre-wrap' }}>{testText}</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'metrics' && (
             <div className="p-4 md:p-8 max-w-7xl mx-auto">
                 <h3 className="text-xl font-bold mb-6 flex gap-2 items-center text-white"><BarChart2 className="text-blue-400" /> Metrics Analysis</h3>
                 
                 {isCompareMode ? (
                     <>
                        {/* Comparative Stats Summary */}
                        <div className="space-y-8 bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-8">
                             <div className="flex flex-col md:flex-row gap-8 justify-between">
                                 <div className="flex-1">
                                     <h4 className="font-bold text-gray-300 mb-4">{labelOriginal}</h4>
                                     <div className="flex justify-between text-sm mb-2 text-gray-400">
                                         <span>Global Avg Spacing</span>
                                         <span>{getAvgSB(MethodType.ORIGINAL)} units</span>
                                     </div>
                                 </div>
                                 <div className="w-px bg-gray-700 hidden md:block"></div>
                                 <div className="flex-1">
                                     <h4 className="font-bold text-cyan-400 mb-4">{labelTracy}</h4>
                                     <div className="flex justify-between text-sm mb-2 text-cyan-300">
                                         <span>Global Avg Spacing</span>
                                         <span>{getAvgSB(MethodType.TRACY)} units</span>
                                     </div>
                                 </div>
                             </div>
                        </div>
                        
                        {/* Detailed Character Cards */}
                        <ComparativeMetricsView category="Lowercase" />
                        <ComparativeMetricsView category="Uppercase" />
                        
                        {/* NEW: Full Extended Character Set Comparison */}
                        <ExtendedComparativeView />
                     </>
                 ) : (
                     <>
                         <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
                             <div className="space-y-8">
                                 <SpacingDiagram font={tracyFont} method={MethodType.TRACY} category="Lowercase" />
                                 <SpacingDiagram font={tracyFont} method={MethodType.TRACY} category="Uppercase" />
                                 <RemainingGlyphsView font={tracyFont} method={MethodType.TRACY} />
                             </div>
                             <div className="space-y-8">
                                 <SousaAnalysisView font={sousaFont} category="Lowercase" />
                                 <SousaAnalysisView font={sousaFont} category="Uppercase" />
                                 <RemainingGlyphsView font={sousaFont} method={MethodType.SOUSA} />
                             </div>
                         </div>
                     </>
                 )}
             </div>
        )}

      </div>
    </div>
  );
};
