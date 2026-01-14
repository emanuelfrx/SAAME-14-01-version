
import React from 'react';
import { FontState, MethodType } from '../types';
import { AnalysisCanvas } from './AnalysisCanvas';

interface LabStyleComparisonGridProps {
  fontRef: FontState | null;
  fontExp: FontState | null;
  refName?: string;
  expName?: string;
}

export const LabStyleComparisonGrid: React.FC<LabStyleComparisonGridProps> = ({
  fontRef,
  fontExp,
  refName,
  expName
}) => {
  // Mapeamento de fontes para o AnalysisCanvas:
  // MethodType.ORIGINAL -> Original Reference
  // MethodType.TRACY -> Adjusted Specimen (Experimental)
  // MethodType.SOUSA -> Ignorado no modo Compare
  const fontsMap = {
    [MethodType.ORIGINAL]: fontRef,
    [MethodType.TRACY]: fontExp,
    [MethodType.SOUSA]: null,
  };

  return (
    <div className="h-full bg-[#0d1117] border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
        <AnalysisCanvas 
            fonts={fontsMap} 
            isCompareMode={true} 
            customLabels={{
                original: refName || 'Reference',
                tracy: expName || 'Experimental'
            }}
        />
    </div>
  );
};
