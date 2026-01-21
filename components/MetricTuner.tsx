
import React, { useEffect, useState, useMemo } from 'react';
import { TracySettings, FontState } from '../types';
import { Settings2, RotateCcw, Sparkles } from 'lucide-react';
import { GlyphVisualizer } from './GlyphVisualizer';
import { calculateHarmonicSpacing } from '../services/fontService';

interface TestWordProps {
  word: string;
  fontFamily: string;
}

const TestWord: React.FC<TestWordProps> = ({ word, fontFamily }) => (
  <div 
      className="text-2xl md:text-3xl text-center mb-1 tracking-normal text-white break-all" 
      style={{ fontFamily: `'${fontFamily}'` }}
  >
    {word}
  </div>
);

interface TunerBlockProps {
  char: keyof TracySettings;
  title: string;
  testWords: string[];
  settings: TracySettings;
  onUpdate: (char: keyof TracySettings, side: 'lsb' | 'rsb', val: number) => void;
  font: FontState | null;
  fontFamily: string;
  onAuto?: (char: string) => void;
}

const TunerBlock: React.FC<TunerBlockProps> = ({ char, title, testWords, settings, onUpdate, font, fontFamily, onAuto }) => (
      <section className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-semibold text-blue-300 text-sm md:text-base">{title}</h3>
             {onAuto && (
                 <button 
                    onClick={() => onAuto(char as string)} 
                    className="text-[10px] bg-blue-900/50 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded flex items-center gap-1 border border-blue-800"
                    title="Harmonize based on weight and shape"
                 >
                     <Sparkles className="w-3 h-3" /> Auto
                 </button>
             )}
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6 order-2 xl:order-1">
                <div className="space-y-4">
                    {/* Left SB Control */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                          <label className="text-xs text-gray-400">Left SB</label>
                          <input 
                              type="number"
                              value={(settings[char] as any).lsb}
                              onChange={(e) => onUpdate(char, 'lsb', Number(e.target.value))}
                              className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-right text-xs text-blue-300"
                          />
                      </div>
                      <input 
                        type="range" min="-50" max="300" value={(settings[char] as any).lsb} 
                        onChange={(e) => onUpdate(char, 'lsb', Number(e.target.value))}
                        className="w-full accent-blue-500 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Right SB Control */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                          <label className="text-xs text-gray-400">Right SB</label>
                          <input 
                              type="number"
                              value={(settings[char] as any).rsb}
                              onChange={(e) => onUpdate(char, 'rsb', Number(e.target.value))}
                              className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-right text-xs text-green-300"
                          />
                      </div>
                      <input 
                        type="range" min="-50" max="300" value={(settings[char] as any).rsb} 
                        onChange={(e) => onUpdate(char, 'rsb', Number(e.target.value))}
                        className="w-full accent-blue-500 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                </div>
                
                {/* Text Preview */}
                <div className="bg-gray-900 p-3 rounded mt-2 overflow-hidden border border-gray-800">
                    {testWords.map(w => <TestWord key={w} word={w} fontFamily={fontFamily} />)}
                </div>
            </div>

            {/* Visualizer */}
            <div className="h-48 md:h-auto order-1 xl:order-2 min-h-[200px]">
                <GlyphVisualizer 
                    char={char as string} 
                    font={font} 
                    lsb={(settings[char] as any).lsb} 
                    rsb={(settings[char] as any).rsb} 
                />
            </div>
          </div>
      </section>
);

interface MetricTunerProps {
  settings: TracySettings;
  onSettingsChange: (newSettings: TracySettings) => void;
  fontFamily: string;
  font: FontState | null;
}

export const MetricTuner: React.FC<MetricTunerProps> = ({ settings, onSettingsChange, fontFamily, font }) => {
  const [localSettings, setLocalSettings] = useState<TracySettings>(settings);
  const [overrideChar, setOverrideChar] = useState<string>('B');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (char: keyof TracySettings, side: 'lsb' | 'rsb', val: number) => {
    const newSettings = {
      ...localSettings,
      [char]: {
        ...localSettings[char],
        [side]: val
      }
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleAutoCalc = (char: string) => {
      if (!font || !font.fontObj) return;
      
      const harmonicSpacing = calculateHarmonicSpacing(font.fontObj, char);
      
      const newSettings = {
          ...localSettings,
          [char]: {
              lsb: harmonicSpacing,
              rsb: harmonicSpacing 
          }
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
  };

  // --- Dynamic Character List Generation ---
  // Extracts all available unicode glyphs from the font to populate the selector
  const availableChars = useMemo(() => {
    if (!font || !font.fontObj) {
        // Fallback default list
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
    }

    const uniqueChars = new Set<string>();
    
    // 1. Add Priority Characters (ASCII)
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('').forEach(c => uniqueChars.add(c));

    // 2. Scan font for all other unicodes
    const numGlyphs = font.fontObj.glyphs.length;
    for (let i = 0; i < numGlyphs; i++) {
        const glyph = font.fontObj.glyphs.get(i);
        if (glyph.unicode) {
            try {
                const char = String.fromCodePoint(glyph.unicode);
                // Exclude control characters and empty strings
                if (char && char.trim() !== '') {
                    uniqueChars.add(char);
                }
            } catch (e) {
                // Ignore invalid codepoints
            }
        }
    }

    return Array.from(uniqueChars);
  }, [font]);

  // --- Override Logic ---
  
  // Get the CURRENT metrics for the override char from the font object itself.
  // This represents the "Rule" result OR the "Override" result, whatever is currently applied.
  const currentOverrideMetrics = useMemo(() => {
      if (!font || !font.fontObj) return { lsb: 0, rsb: 0 };
      const glyph = font.fontObj.charToGlyph(overrideChar);
      if (!glyph) return { lsb: 0, rsb: 0 };
      
      const box = glyph.getBoundingBox();
      const lsb = box.x1;
      const rsb = glyph.advanceWidth - box.x2;
      return { lsb: Math.round(lsb), rsb: Math.round(rsb) };
  }, [font, overrideChar]);

  const hasOverride = useMemo(() => {
      return !!localSettings.overrides[overrideChar];
  }, [localSettings.overrides, overrideChar]);

  const updateOverride = (side: 'lsb' | 'rsb', val: number) => {
      const current = localSettings.overrides[overrideChar] || { lsb: null, rsb: null }; // Null means use rule
      
      const safeLsb = current.lsb !== null ? current.lsb : currentOverrideMetrics.lsb;
      const safeRsb = current.rsb !== null ? current.rsb : currentOverrideMetrics.rsb;

      const newOverride = {
          lsb: side === 'lsb' ? val : safeLsb,
          rsb: side === 'rsb' ? val : safeRsb
      };

      const newSettings = {
          ...localSettings,
          overrides: {
              ...localSettings.overrides,
              [overrideChar]: newOverride
          }
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
  };

  const resetOverride = () => {
      const newOverrides = { ...localSettings.overrides };
      delete newOverrides[overrideChar];
      const newSettings = {
          ...localSettings,
          overrides: newOverrides
      };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
  };

  // Generate test context for overrides
  const overrideContext = useMemo(() => {
     // Check if char is generally uppercase or lowercase to decide context
     const isUpper = overrideChar.toUpperCase() === overrideChar && overrideChar.toLowerCase() !== overrideChar;
     // Numbers and Symbols default to uppercase context (HHO..) usually looks better for alignment check
     if (isUpper || !overrideChar.match(/[a-z]/)) {
         return [`HH${overrideChar}HH`, `OO${overrideChar}OO`];
     } else {
         return [`nn${overrideChar}nn`, `oo${overrideChar}oo`];
     }
  }, [overrideChar]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-700 pb-4 sticky top-0 bg-gray-800 z-10">
        <Settings2 className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-white">Rule Setup (Tracy)</h2>
      </div>

      <div className="space-y-6 pb-8">
        <div className="space-y-6">
            <TunerBlock 
                char="H" 
                title="H Setup (Upper Straight)" 
                testWords={['HHHH']} 
                settings={localSettings} 
                onUpdate={handleChange} 
                font={font} 
                fontFamily={fontFamily}
                onAuto={handleAutoCalc}
            />
            <TunerBlock 
                char="O" 
                title="O Setup (Upper Round)" 
                testWords={['HHOHH', 'HHOOHH']} 
                settings={localSettings} 
                onUpdate={handleChange} 
                font={font} 
                fontFamily={fontFamily}
                onAuto={handleAutoCalc}
            />
            <TunerBlock 
                char="n" 
                title="n Setup (Lower Straight)" 
                testWords={['nnnn']} 
                settings={localSettings} 
                onUpdate={handleChange} 
                font={font} 
                fontFamily={fontFamily}
                onAuto={handleAutoCalc}
            />
            <TunerBlock 
                char="o" 
                title="o Setup (Lower Round)" 
                testWords={['nnonn', 'nnonon', 'nnoonn']} 
                settings={localSettings} 
                onUpdate={handleChange} 
                font={font} 
                fontFamily={fontFamily}
                onAuto={handleAutoCalc}
            />
        </div>

        {/* Detailed Propagation Tuning */}
        <div className="mt-8 border-t border-gray-700 pt-6">
            <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                Detailed Propagation & Tuning
                <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-400 font-normal">Check and override specific letters</span>
            </h3>
            
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                 {/* Selector */}
                 <div className="flex items-center gap-4 mb-6">
                     <div className="flex-1">
                         <label className="text-xs text-gray-500 mb-1 block">Select Glyph from Font</label>
                         <select 
                            value={overrideChar}
                            onChange={(e) => setOverrideChar(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm"
                         >
                             {availableChars.map(c => (
                                 <option key={c} value={c}>
                                     {c} (U+{c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')})
                                 </option>
                             ))}
                         </select>
                     </div>
                     
                     <div className="text-sm text-gray-400 flex flex-col justify-end pb-2">
                         <div className="flex items-center gap-2">
                             Status: 
                             {hasOverride ? (
                                 <span className="text-yellow-400 font-bold px-2 py-0.5 bg-yellow-900/20 rounded border border-yellow-800 text-xs">Manual Override</span>
                             ) : (
                                 <span className="text-blue-400 font-bold px-2 py-0.5 bg-blue-900/20 rounded border border-blue-800 text-xs">Rule Derived</span>
                             )}
                         </div>

                         {hasOverride && (
                             <button onClick={resetOverride} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 justify-end">
                                 <RotateCcw className="w-3 h-3" /> Reset to Rule
                             </button>
                         )}
                     </div>
                 </div>

                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="space-y-6 order-2 xl:order-1">
                        <div className="space-y-4">
                            {/* Override LSB */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-gray-400">Left SB</label>
                                    <input 
                                        type="number"
                                        value={currentOverrideMetrics.lsb}
                                        onChange={(e) => updateOverride('lsb', Number(e.target.value))}
                                        className={`w-16 bg-gray-900 border rounded px-1 py-0.5 text-right text-xs ${hasOverride ? 'border-yellow-600 text-yellow-300' : 'border-gray-600 text-blue-300'}`}
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={currentOverrideMetrics.lsb}
                                    onChange={(e) => updateOverride('lsb', Number(e.target.value))}
                                    className="w-full accent-blue-500 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                             {/* Override RSB */}
                             <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-gray-400">Right SB</label>
                                    <input 
                                        type="number"
                                        value={currentOverrideMetrics.rsb}
                                        onChange={(e) => updateOverride('rsb', Number(e.target.value))}
                                        className={`w-16 bg-gray-900 border rounded px-1 py-0.5 text-right text-xs ${hasOverride ? 'border-yellow-600 text-yellow-300' : 'border-gray-600 text-green-300'}`}
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={currentOverrideMetrics.rsb}
                                    onChange={(e) => updateOverride('rsb', Number(e.target.value))}
                                    className="w-full accent-blue-500 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                         {/* Text Preview */}
                        <div className="bg-gray-900 p-3 rounded mt-2 overflow-hidden border border-gray-800">
                            {overrideContext.map(w => <TestWord key={w} word={w} fontFamily={fontFamily} />)}
                        </div>
                    </div>
                    
                    {/* Visualizer */}
                    <div className="h-48 md:h-auto order-1 xl:order-2 min-h-[200px]">
                        <GlyphVisualizer 
                            char={overrideChar} 
                            font={font} 
                            lsb={currentOverrideMetrics.lsb} 
                            rsb={currentOverrideMetrics.rsb} 
                        />
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};
