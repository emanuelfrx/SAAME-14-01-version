
import React, { useState, useMemo, useEffect } from 'react';
import { SousaSettings, SousaGroups, FontState } from '../types';
import { generateAdhesionText } from '../services/fontService';
import { Settings2, RotateCcw, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { GlyphVisualizer } from './GlyphVisualizer';

interface SousaTunerProps {
  settings: SousaSettings;
  onSettingsChange: (newSettings: SousaSettings) => void;
  fontFamily: string;
  font: FontState | null;
}

// Reusable Block Component similar to MetricTuner's TunerBlock
interface SousaBlockProps {
    char: 'n' | 'o' | 'H' | 'O';
    title: string;
    contextWords: string[];
    settings: SousaSettings;
    onUpdate: (char: 'n' | 'o' | 'H' | 'O', side: 'lsb' | 'rsb', val: number) => void;
    font: FontState | null;
    fontFamily: string;
}

const SousaMasterBlock: React.FC<SousaBlockProps> = ({ char, title, contextWords, settings, onUpdate, font, fontFamily }) => (
    <section className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
           <h3 className="font-semibold text-green-300 text-sm md:text-base">{title}</h3>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6 order-2 xl:order-1">
              <div className="space-y-4">
                  {/* Left SB Control */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-gray-400">Left SB (Stem/Straight)</label>
                        <input 
                            type="number"
                            value={settings[char].lsb}
                            onChange={(e) => onUpdate(char, 'lsb', Number(e.target.value))}
                            className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-right text-xs text-green-300"
                        />
                    </div>
                    <input 
                      type="range" min="-50" max="300" value={settings[char].lsb} 
                      onChange={(e) => onUpdate(char, 'lsb', Number(e.target.value))}
                      className="w-full accent-green-500 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Right SB Control */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-gray-400">Right SB</label>
                        <input 
                            type="number"
                            value={settings[char].rsb}
                            onChange={(e) => onUpdate(char, 'rsb', Number(e.target.value))}
                            className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-right text-xs text-green-300"
                        />
                    </div>
                    <input 
                      type="range" min="-50" max="300" value={settings[char].rsb} 
                      onChange={(e) => onUpdate(char, 'rsb', Number(e.target.value))}
                      className="w-full accent-green-500 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
              </div>
              
              {/* Text Preview */}
              <div className="bg-gray-900 p-3 rounded mt-2 overflow-hidden border border-gray-800 text-center">
                  {contextWords.map(w => (
                      <div key={w} className="text-2xl md:text-3xl tracking-normal text-white break-all mb-1" style={{ fontFamily: `'${fontFamily}'` }}>
                          {w}
                      </div>
                  ))}
              </div>
          </div>

          {/* Visualizer */}
          <div className="h-48 md:h-auto order-1 xl:order-2 min-h-[200px]">
              <GlyphVisualizer 
                  char={char} 
                  font={font} 
                  lsb={settings[char].lsb} 
                  rsb={settings[char].rsb} 
              />
          </div>
        </div>
    </section>
);

export const SousaTuner: React.FC<SousaTunerProps> = ({ settings, onSettingsChange, fontFamily, font }) => {
  const [showGroups, setShowGroups] = useState(false);
  
  // Detailed Tuning State
  const [overrideChar, setOverrideChar] = useState<string>('a');

  // --- Handlers ---

  const handleGroupChange = (groupKey: keyof SousaGroups, value: string) => {
    const chars = value.split('').filter(c => c.trim() !== '');
    const uniqueChars = Array.from(new Set(chars));
    onSettingsChange({
        ...settings,
        groups: {
            ...settings.groups,
            [groupKey]: uniqueChars
        }
    });
  };

  const handleMasterChange = (char: 'n'|'o'|'H'|'O', side: 'lsb'|'rsb', val: number) => {
      onSettingsChange({
          ...settings,
          [char]: { ...settings[char], [side]: val }
      });
  };

  // --- Dynamic Character List Generation ---
  const availableChars = useMemo(() => {
    if (!font || !font.fontObj) {
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
    }
    const uniqueChars = new Set<string>();
    // Priority chars
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split('').forEach(c => uniqueChars.add(c));
    
    // Scan font
    const numGlyphs = font.fontObj.glyphs.length;
    for (let i = 0; i < numGlyphs; i++) {
        const glyph = font.fontObj.glyphs.get(i);
        if (glyph.unicode) {
            try {
                const char = String.fromCodePoint(glyph.unicode);
                if (char && char.trim() !== '') uniqueChars.add(char);
            } catch (e) {}
        }
    }
    return Array.from(uniqueChars);
  }, [font]);

  // --- Detailed Tuning Logic ---

  const getCharGroupStatus = (char: string) => {
      const g = settings.groups;
      if (g.group1.includes(char)) return "Group 1 (Relational)";
      if (g.group2.includes(char)) return "Group 2 (Semi)";
      if (g.group3.includes(char)) return "Group 3 (Visual)";
      if (g.upperGroup1.includes(char)) return "Upper G1 (Relational)";
      if (g.upperGroup2.includes(char)) return "Upper G2 (Semi)";
      if (g.upperGroup3.includes(char)) return "Upper G3 (Visual)";
      return "Ungrouped (Visual Fallback)";
  };

  const getCurrentMetric = (side: 'lsb' | 'rsb') => {
     // 1. Explicit Override?
     if (settings.overrides[overrideChar] && settings.overrides[overrideChar][side] !== undefined && settings.overrides[overrideChar][side] !== null) {
         return settings.overrides[overrideChar][side]!;
     }
     
     // 2. Fallback: Read actual metric from processed font
     if (font && font.fontObj) {
         const glyph = font.fontObj.charToGlyph(overrideChar);
         if (glyph) {
             const box = glyph.getBoundingBox();
             if (side === 'lsb') return Math.round(box.x1);
             if (side === 'rsb') return Math.round(glyph.advanceWidth - box.x2);
         }
     }
     return 0;
  };

  const hasOverride = useMemo(() => {
      return !!settings.overrides[overrideChar];
  }, [settings.overrides, overrideChar]);

  const updateOverride = (side: 'lsb' | 'rsb', val: number) => {
      const current = settings.overrides[overrideChar] || { lsb: null, rsb: null };
      
      // If setting one side, ensure the other side preserves its current state (derived or overridden)
      // For simplicity in this UI, if we touch one, we instantiate the override object.
      // We need to fetch current derived value for the *other* side if it's currently null.
      let otherSideVal = side === 'lsb' ? current.rsb : current.lsb;
      if (otherSideVal === null) {
          otherSideVal = getCurrentMetric(side === 'lsb' ? 'rsb' : 'lsb');
      }

      const newOverride = {
          lsb: side === 'lsb' ? val : otherSideVal,
          rsb: side === 'rsb' ? val : otherSideVal
      };

      onSettingsChange({
          ...settings,
          overrides: {
              ...settings.overrides,
              [overrideChar]: newOverride
          }
      });
  };

  const resetOverride = () => {
      const newOverrides = { ...settings.overrides };
      delete newOverrides[overrideChar];
      onSettingsChange({ ...settings, overrides: newOverrides });
  };

  // Generate test context based on char case and group
  const overrideContext = useMemo(() => {
     const isUpper = overrideChar.toUpperCase() === overrideChar && overrideChar.toLowerCase() !== overrideChar;
     const group = isUpper ? settings.groups.upperGroup1 : settings.groups.group1;
     return [generateAdhesionText(overrideChar, group)];
  }, [overrideChar, settings.groups]);

  const currentLsb = getCurrentMetric('lsb');
  const currentRsb = getCurrentMetric('rsb');

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 h-full overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-700 pb-4 sticky top-0 bg-gray-800 z-10">
        <Settings2 className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-bold text-white">Sousa Logic Setup</h2>
      </div>

      <div className="space-y-6 pb-8">

        {/* --- 1. Topology Configuration (Collapsible) --- */}
        <div className="bg-gray-900/30 border border-gray-700 rounded-lg overflow-hidden">
            <button 
                onClick={() => setShowGroups(!showGroups)}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-gray-200 text-sm">Topology Groups Configuration</span>
                </div>
                {showGroups ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
            </button>
            
            {showGroups && (
                <div className="p-4 space-y-6 border-t border-gray-700 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Lowercase Groups */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1">Lowercase</h4>
                            <div>
                                <label className="block text-[10px] font-semibold text-blue-400 mb-1">Group 1 (Relational)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={settings.groups.group1.join('')}
                                    onChange={(e) => handleGroupChange('group1', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-green-400 mb-1">Group 2 (Semi-Relational)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={settings.groups.group2.join('')}
                                    onChange={(e) => handleGroupChange('group2', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Group 3 (Visual)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={settings.groups.group3.join('')}
                                    onChange={(e) => handleGroupChange('group3', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Uppercase Groups */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1">Uppercase</h4>
                             <div>
                                <label className="block text-[10px] font-semibold text-blue-400 mb-1">Group 1 (Relational)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={settings.groups.upperGroup1.join('')}
                                    onChange={(e) => handleGroupChange('upperGroup1', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-green-400 mb-1">Group 2 (Semi-Relational)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={settings.groups.upperGroup2.join('')}
                                    onChange={(e) => handleGroupChange('upperGroup2', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Group 3 (Visual)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-xs h-16"
                                    value={settings.groups.upperGroup3.join('')}
                                    onChange={(e) => handleGroupChange('upperGroup3', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- 2. Master Tuning --- */}
        <div className="space-y-6">
            <SousaMasterBlock 
                char="n" title="n (Lower Stem Master)" 
                contextWords={['nnnn', 'nonn']}
                settings={settings} onUpdate={handleMasterChange} font={font} fontFamily={fontFamily}
            />
            <SousaMasterBlock 
                char="o" title="o (Lower Round Master)" 
                contextWords={['nnonn', 'oooo']}
                settings={settings} onUpdate={handleMasterChange} font={font} fontFamily={fontFamily}
            />
            <SousaMasterBlock 
                char="H" title="H (Upper Straight Master)" 
                contextWords={['HHHH', 'HHOHH']}
                settings={settings} onUpdate={handleMasterChange} font={font} fontFamily={fontFamily}
            />
            <SousaMasterBlock 
                char="O" title="O (Upper Round Master)" 
                contextWords={['HHOHH', 'OOOO']}
                settings={settings} onUpdate={handleMasterChange} font={font} fontFamily={fontFamily}
            />
        </div>

        {/* --- 3. Detailed Tuning --- */}
        <div className="mt-8 border-t border-gray-700 pt-6">
            <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                Detailed Propagation & Tuning
                <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-400 font-normal">Check specific letters in context</span>
            </h3>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                 {/* Selector */}
                 <div className="flex items-center gap-4 mb-6">
                     <div className="flex-1">
                         <label className="text-xs text-gray-500 mb-1 block">Select Glyph</label>
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
                     
                     <div className="text-sm text-gray-400 flex flex-col justify-end pb-2 text-right">
                         <div className="flex items-center gap-2 justify-end">
                             <span className="text-xs text-gray-500">Source:</span>
                             {hasOverride ? (
                                 <span className="text-yellow-400 font-bold px-2 py-0.5 bg-yellow-900/20 rounded border border-yellow-800 text-xs">Manual Override</span>
                             ) : (
                                 <span className="text-green-400 font-bold px-2 py-0.5 bg-green-900/20 rounded border border-green-800 text-xs">
                                     {getCharGroupStatus(overrideChar)}
                                 </span>
                             )}
                         </div>

                         {hasOverride && (
                             <button onClick={resetOverride} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 justify-end">
                                 <RotateCcw className="w-3 h-3" /> Reset to Topology
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
                                        value={currentLsb}
                                        onChange={(e) => updateOverride('lsb', Number(e.target.value))}
                                        className={`w-16 bg-gray-900 border rounded px-1 py-0.5 text-right text-xs ${hasOverride ? 'border-yellow-600 text-yellow-300' : 'border-gray-600 text-green-300'}`}
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={currentLsb}
                                    onChange={(e) => updateOverride('lsb', Number(e.target.value))}
                                    className="w-full accent-green-500 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                             {/* Override RSB */}
                             <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-gray-400">Right SB</label>
                                    <input 
                                        type="number"
                                        value={currentRsb}
                                        onChange={(e) => updateOverride('rsb', Number(e.target.value))}
                                        className={`w-16 bg-gray-900 border rounded px-1 py-0.5 text-right text-xs ${hasOverride ? 'border-yellow-600 text-yellow-300' : 'border-gray-600 text-green-300'}`}
                                    />
                                </div>
                                <input 
                                    type="range" min="-50" max="300" value={currentRsb}
                                    onChange={(e) => updateOverride('rsb', Number(e.target.value))}
                                    className="w-full accent-green-500 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                         {/* Text Preview */}
                        <div className="bg-gray-900 p-3 rounded mt-2 overflow-hidden border border-gray-800 text-center">
                            {overrideContext.map(w => (
                                <div key={w} className="text-2xl md:text-3xl text-white tracking-normal break-all" style={{ fontFamily: `'${fontFamily}'` }}>
                                    {w}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Visualizer */}
                    <div className="h-48 md:h-auto order-1 xl:order-2 min-h-[200px]">
                        <GlyphVisualizer 
                            char={overrideChar} 
                            font={font} 
                            lsb={currentLsb} 
                            rsb={currentRsb} 
                        />
                    </div>
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
};
