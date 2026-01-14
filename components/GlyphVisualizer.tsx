
import React, { useMemo } from 'react';
import { FontState } from '../types';
import { getGlyphData } from '../services/fontService';

interface GlyphVisualizerProps {
  char: string;
  font: FontState | null;
  lsb: number; // Proposed LSB from slider
  rsb: number; // Proposed RSB from slider
}

export const GlyphVisualizer: React.FC<GlyphVisualizerProps> = ({ char, font, lsb, rsb }) => {
  const glyphData = useMemo(() => {
    if (!font || !font.fontObj) return null;
    return getGlyphData(font.fontObj, char);
  }, [font, char]);

  if (!glyphData) return <div className="bg-gray-900 rounded h-full flex items-center justify-center text-gray-600 text-xs">No Glyph Data</div>;

  const { xMin, xMax, yMax, yMin, pathData } = glyphData;
  const upm = font?.metrics?.unitsPerEm || 1000;
  
  // Ink Width (Bounding Box Width)
  const inkWidth = xMax - xMin;

  // Typographic Coordinates Calculation
  const originX = xMin - lsb;
  const awX = xMax + rsb;
  const calculatedAdvanceWidth = lsb + inkWidth + rsb;

  // --- ViewBox Calculation: Static Scale Strategy ---
  // To prevent "zooming" (scaling) when sliders move, we must keep the viewBox width constant 
  // relative to the font's UPM, rather than fitting it tightly to the current metrics.
  // We maintain the centering logic (glyph center is viewport center).

  const glyphCenterX = xMin + (inkWidth / 2);

  // Define a fixed canvas width multiplier based on UPM. 
  // 3x UPM is usually sufficient to show the glyph + large sidebearings without clipping.
  // We add a check for very wide glyphs to ensure they don't get clipped if they exceed expected norms.
  const baseWidth = upm * 3;
  const minRequiredWidth = inkWidth * 1.5 + (Math.abs(lsb) + Math.abs(rsb)) * 1.2; // minimal fallback if metrics get crazy
  
  // We use the larger of the fixed base width or what's absolutely needed, 
  // but prioritizing the fixed width to keep scale stable during normal interaction.
  const vbWidth = Math.max(baseWidth, minRequiredWidth); 
  const vbMinX = glyphCenterX - (vbWidth / 2);

  // Y-axis padding (Fixed relative to vertical metrics)
  // We use fixed padding ratio to keep vertical scale stable
  const metricHeight = yMax - yMin;
  const paddingY = metricHeight; // 20% padding top/bottom
  const vbHeight = metricHeight + (paddingY * 2);
  const viewBoxYStart = -yMax - paddingY;

  // Helper for shading rects height
  const shadingHeight = vbHeight; 

  return (
    <div className="bg-gray-900/50 rounded border border-gray-700 overflow-hidden flex flex-col items-center justify-center py-4 relative select-none h-full group">
       {/* Labels */}
       <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-mono z-10 pointer-events-none bg-gray-900/80 px-1 rounded transition-opacity group-hover:opacity-100 opacity-70">
           <span className="text-blue-400 font-bold">LSB: {lsb}</span>
       </div>
       <div className="absolute top-2 right-2 text-[10px] text-gray-500 font-mono z-10 pointer-events-none bg-gray-900/80 px-1 rounded transition-opacity group-hover:opacity-100 opacity-70">
           <span className="text-green-400 font-bold">RSB: {rsb}</span> | <span className="text-gray-400">AW: {calculatedAdvanceWidth}</span>
       </div>

       <svg 
         width="100%" 
         height="100%"
         viewBox={`${vbMinX} ${viewBoxYStart} ${vbWidth} ${vbHeight}`}
         className="w-full h-full"
         preserveAspectRatio="xMidYMid meet"
       >
         {/* Typographic Coordinate System: Y-Up */}
         <g>
            
            {/* Baseline (y=0) */}
            <line x1={vbMinX} y1="0" x2={vbMinX + vbWidth} y2="0" stroke="#374151" strokeWidth="4" vectorEffect="non-scaling-stroke" />
            
            {/* --- LSB Visualization --- */}
            {/* Origin Line (x=0 relative to glyph position) */}
            <line
                x1={originX}
                x2={originX}
                y1={yMax + paddingY} 
                y2={yMin - paddingY}
                stroke="#3B82F6"
                strokeWidth="2"
                opacity="0.8"
                vectorEffect="non-scaling-stroke"
            />
            {/* LSB Shaded Area: Between Origin and xMin */}
            <rect 
                x={Math.min(originX, xMin)}
                y={yMin - paddingY} 
                width={Math.abs(originX - xMin)} 
                height={shadingHeight} 
                fill={lsb >= 0 ? "rgba(59, 130, 246, 0.15)" : "rgba(239, 68, 68, 0.15)"} 
            />

            {/* --- Glyph --- */}
            {/* Rendered at raw coordinates. Static. */}
            <path d={pathData} fill="white" fillOpacity="0.9" />
            
            {/* Bounding Box Outline (Optional, helps see ink bounds) */}
            <rect
                x={xMin}
                y={yMin} 
                width={inkWidth}
                height={yMax - yMin}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
                strokeDasharray="1,1"
                vectorEffect="non-scaling-stroke"
            />

            {/* --- RSB Visualization --- */}
            {/* Advance Width Line */}
            <line
                x1={awX}
                x2={awX}
                y1={yMax + paddingY}
                y2={yMin - paddingY}
                stroke="#10B981"
                strokeWidth="2"
                opacity="0.8"
                vectorEffect="non-scaling-stroke"
            />
            {/* RSB Shaded Area: Between xMax and Advance Width Line */}
            <rect 
                x={Math.min(xMax, awX)}
                y={yMin - paddingY} 
                width={Math.abs(awX - xMax)} 
                height={shadingHeight} 
                fill={rsb >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"} 
            />
         </g>
       </svg>
    </div>
  );
};
