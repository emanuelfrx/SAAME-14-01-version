
import React from 'react';
import { FontState } from '../types';
import { getCharMetrics, TOPOLOGY } from '../services/fontService';

interface SousaAnalysisViewProps {
  font: FontState | null;
  category: 'Uppercase' | 'Lowercase';
}

const DEFAULT_GROUPS = {
    Lowercase: {
        Group1: ['b', 'd', 'h', 'i', 'l', 'm', 'n', 'o', 'p', 'q', 'u'],
        Group2: ['a', 'c', 'e', 'f', 'j', 'k', 'r', 't'],
        Group3: ['g', 's', 'v', 'w', 'x', 'y', 'z']
    },
    Uppercase: {
        Group1: ['B', 'D', 'E', 'F', 'H', 'I', 'N', 'O', 'Q'],
        Group2: ['C', 'G', 'J', 'K', 'L', 'P', 'R'],
        Group3: ['A', 'M', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
    }
};

const getColorForType = (type: 'S'|'A'|'R'|'V') => {
    switch(type) {
        case 'S': return 'text-blue-400';
        case 'A': return 'text-green-400';
        case 'R': return 'text-red-400';
        case 'V': return 'text-gray-400';
        default: return 'text-gray-500';
    }
};

export const SousaAnalysisView: React.FC<SousaAnalysisViewProps> = ({ font, category }) => {
  const groups = category === 'Lowercase' ? DEFAULT_GROUPS.Lowercase : DEFAULT_GROUPS.Uppercase;

  if (!font || !font.fontObj) {
      return <div className="p-4 text-gray-500 text-sm">Font data not available for Sousa Analysis</div>;
  }

  const fontFamily = font.fullFontFamily || 'Sousa';

  const renderGroup = (title: string, chars: string[]) => (
    <div className="mb-6">
        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{title}</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-4">
            {chars.map(char => {
                const { lsb, rsb } = getCharMetrics(font.fontObj, char);
                const topo = TOPOLOGY[char] || { l: 'V', r: 'V' };
                const lColor = getColorForType(topo.l);
                const rColor = getColorForType(topo.r);

                return (
                    <div key={char} className="bg-gray-800/50 rounded h-16 p-1 flex items-center border border-cyan-500/20 hover:bg-gray-800 transition-colors">
                        <div className="min-w-[30px] flex-1 flex flex-col items-center justify-center h-full border-r border-gray-700/30">
                            <span className="mb-0.5 opacity-30 text-gray-400 text-[9px] leading-none">L</span>
                            <span className={`${lColor} font-bold text-[11px] font-mono leading-none`}>{lsb}</span>
                        </div>
                        <div 
                            className="w-12 text-2xl md:text-3xl text-white text-center flex items-center justify-center leading-none pb-1"
                            style={{ fontFamily: fontFamily }}
                        >
                            {char}
                        </div>
                        <div className="min-w-[30px] flex-1 flex flex-col items-center justify-center h-full border-l border-gray-700/30">
                            <span className="mb-0.5 opacity-30 text-gray-400 text-[9px] leading-none">R</span>
                            <span className={`${rColor} font-bold text-[11px] font-mono leading-none`}>{rsb}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );

  return (
    <div className="mb-8">
        <h4 className="text-sm font-bold uppercase mb-6 tracking-wider flex items-center gap-2 text-cyan-400">
             <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
             Sousa Method — {category} Analysis
        </h4>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-xs bg-gray-900/50 p-3 rounded border border-gray-700 items-center justify-between lg:justify-start lg:gap-8">
             <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-blue-400"></div> Stem/Straight</span>
             {category === 'Lowercase' && <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-green-400"></div> Arch</span>}
             <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-red-400"></div> Round</span>
             <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-gray-400"></div> Visual</span>
        </div>
        
        {renderGroup("1st Group (Relational)", groups.Group1)}
        {renderGroup("2nd Group (Semi-Relational)", groups.Group2)}
        {renderGroup("3rd Group (Visual)", groups.Group3)}
    </div>
  );
};
