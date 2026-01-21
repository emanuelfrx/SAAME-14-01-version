
import { FontState, MethodType, TracySettings, SousaSettings, OpenTypeFont, OpenTypeGlyph } from '../types';
// Importing directly from unpkg for browser environment compatibility in this setup
import opentype from 'https://unpkg.com/opentype.js@1.3.4/dist/opentype.module.js';

// --- DIACRITICS MAPPING ---
// Maps base characters to their accented variations.
// Used to propagate spacing rules from parent to children automatically.
const DIACRITICS_MAP: Record<string, string[]> = {
    'A': ['Á','À','Â','Ä','Ã','Å','Ā','Ă','Ą', 'Ǎ', 'Ǻ'],
    'B': ['Ḃ','Ḅ'],
    'C': ['Ç','Ć','Ĉ','Ċ','Č'],
    'D': ['Ď','Đ','Ḍ','Ḋ','Ḑ'],
    'E': ['É','È','Ê','Ë','Ē','Ĕ','Ė','Ę','Ě'],
    'F': ['Ḟ'],
    'G': ['Ĝ','Ğ','Ġ','Ģ','Ǧ'],
    'H': ['Ĥ','Ħ','Ḣ','Ḥ'],
    'I': ['Í','Ì','Î','Ï','Ĩ','Ī','Ĭ','Į','İ'],
    'J': ['Ĵ'],
    'K': ['Ķ','Ǩ','Ḱ','Ḳ'],
    'L': ['Ĺ','Ļ','Ľ','Ŀ','Ł','Ḷ','Ḹ'],
    'M': ['Ḿ','Ṁ','Ṃ'],
    'N': ['Ñ','Ń','Ņ','Ň','Ṅ','Ṇ'],
    'O': ['Ó','Ò','Ô','Ö','Õ','Ø','Ō','Ŏ','Ő','Ǒ','Ǿ'],
    'P': ['Ṕ','Ṗ'],
    'Q': [],
    'R': ['Ŕ','Ŗ','Ř','Ṙ','Ṛ'],
    'S': ['Ś','Ŝ','Ş','Š','Ș','Ṡ','Ṣ'],
    'T': ['Ţ','Ť','Ŧ','Ț','Ṫ','Ṭ'],
    'U': ['Ú','Ù','Û','Ü','Ũ','Ū','Ŭ','Ů','Ű','Ų','Ǔ','Ǖ','Ǘ','Ǚ','Ǜ'],
    'V': ['Ṽ','Ṿ'],
    'W': ['Ŵ','Ẁ','Ẃ','Ẅ'],
    'X': ['Ẋ','Ẍ'],
    'Y': ['Ý','Ŷ','Ÿ','Ȳ','Ẏ','Ỳ'],
    'Z': ['Ź','Ż','Ž','Ẓ'],
    
    'a': ['á','à','â','ä','ã','å','ā','ă','ą','ǎ','ǻ'],
    'b': ['ḃ','ḅ'],
    'c': ['ç','ć','ĉ','ċ','č'],
    'd': ['ď','đ','ḍ','ḋ','ḑ'],
    'e': ['é','è','ê','ë','ē','ĕ','ė','ę','ě'],
    'f': ['ḟ'],
    'g': ['ĝ','ğ','ġ','ģ','ǧ'],
    'h': ['ĥ','ħ','ḣ','ḥ'],
    'i': ['í','ì','î','ï','ĩ','ī','ĭ','į','ı'],
    'j': ['ĵ'],
    'k': ['ķ','ǩ','ḱ','ḳ'],
    'l': ['ĺ','ļ','ľ','ŀ','ł','ḷ','ḹ'],
    'm': ['ḿ','ṁ','ṃ'],
    'n': ['ñ','ń','ņ','ň','ṅ','ṇ'],
    'o': ['ó','ò','ô','ö','õ','ø','ō','ŏ','ő','ǒ','ǿ'],
    'p': ['ṕ','ṗ'],
    'q': [],
    'r': ['ŕ','ŗ','ř','ṙ','ṛ'],
    's': ['ś','ŝ','ş','š','ș','ṡ','ṣ'],
    't': ['ţ','ť','ŧ','ț','ṫ','ṭ'],
    'u': ['ú','ù','û','ü','ũ','ū','ŭ','ů','ű','ų','ǔ','ǖ','ǘ','ǚ','ǜ'],
    'v': ['ṽ','ṿ'],
    'w': ['ŵ','ẁ','ẃ','ẅ'],
    'x': ['ẋ','ẍ'],
    'y': ['ý','ÿ','ŷ','ȳ','ẏ','ỳ'],
    'z': ['ź','ż','ž','ẓ']
};

// Helper to manipulate font binary to avoid opentype.js parsing errors with complex tables
const stripLayoutTables = (buffer: ArrayBuffer): ArrayBuffer => {
    try {
        const data = new DataView(buffer);
        // Check for SFNT header (OTTO or true or 0x00010000)
        // We just read numTables at offset 4.
        const numTables = data.getUint16(4);
        
        // Clone buffer to avoid mutating original source if needed
        const newBuffer = buffer.slice(0); 
        const newData = new DataView(newBuffer);
        
        let offset = 12; // Start of Table Directory
        for (let i = 0; i < numTables; i++) {
            const t1 = newData.getUint8(offset);
            const t2 = newData.getUint8(offset + 1);
            const t3 = newData.getUint8(offset + 2);
            const t4 = newData.getUint8(offset + 3);
            
            const tag = String.fromCharCode(t1, t2, t3, t4);
            
            // If it's a layout table that might cause parsing errors or is not needed
            // "lookup type 6 format 2" errors usually come from GPOS/GSUB contexts
            if (['GPOS', 'GSUB', 'GDEF', 'JSTF', 'BASE', 'kern'].includes(tag)) {
                // Rename tag to 'void' so opentype.js skips its specific parsers
                // 'void' in ascii: 118, 111, 105, 100
                newData.setUint8(offset, 118); 
                newData.setUint8(offset + 1, 111);
                newData.setUint8(offset + 2, 105);
                newData.setUint8(offset + 3, 100);
            }
            offset += 16;
        }
        return newBuffer;
    } catch (e) {
        console.warn("Failed to strip layout tables, attempting to parse original buffer", e);
        return buffer;
    }
};

export const parseFont = async (buffer: ArrayBuffer): Promise<OpenTypeFont> => {
  const cleanBuffer = stripLayoutTables(buffer);
  return opentype.parse(cleanBuffer);
};

export const createFontState = async (buffer: ArrayBuffer, type: MethodType): Promise<FontState> => {
  // 1. Sanitize for Parsing: Remove complex tables that crash opentype.js
  const cleanBuffer = stripLayoutTables(buffer);
  const font = opentype.parse(cleanBuffer);
  
  // Helper to measure visual extrema from a set of characters
  // This ensures the grid lines in the UI align with the actual visual height of letters, 
  // rather than theoretical metrics which might be loose.
  const measureMetric = (chars: string[], type: 'max' | 'min', fallback: number) => {
      let best = fallback;
      let found = false;
      
      chars.forEach(char => {
          const glyph = font.charToGlyph(char);
          if (glyph && glyph.path.commands.length > 0) {
              const box = glyph.getBoundingBox();
              if (type === 'max') {
                  if (!found || box.y2 > best) {
                      best = box.y2;
                      found = true;
                  }
              } else {
                   if (!found || box.y1 < best) {
                      best = box.y1;
                      found = true;
                  }
              }
          }
      });
      return Math.round(best);
  };

  // Calculate strict visual metrics
  // Ascender: Based on tall flat letters (h, l, k, d, b) or H
  // Descender: Based on deep descenders (p, q, y, g)
  const visAscender = measureMetric(['d', 'h', 'l', 'b', 'k', 'H'], 'max', font.ascender);
  const visDescender = measureMetric(['p', 'q', 'y', 'g'], 'min', font.descender);

  const metrics = {
    ascender: visAscender,
    descender: visDescender,
    unitsPerEm: font.unitsPerEm,
    xHeight: 0,
    capHeight: 0
  };

  // Estimate xHeight and capHeight
  const xGlyph = font.charToGlyph('x');
  const hGlyph = font.charToGlyph('H');
  
  if (xGlyph && xGlyph.unicode) {
    const box = xGlyph.getBoundingBox();
    metrics.xHeight = box.y2 - box.y1; 
  }
  if (hGlyph && hGlyph.unicode) {
    const box = hGlyph.getBoundingBox();
    metrics.capHeight = box.y2 - box.y1;
  }
  
  // 2. Create URL for Display
  const blob = new Blob([buffer], { type: 'font/opentype' });
  const url = URL.createObjectURL(blob);

  // Set default family name
  const family = type === MethodType.ORIGINAL ? 'Original' : type === MethodType.TRACY ? 'Tracy' : 'Sousa';

  return {
    type,
    fontObj: font,
    url,
    fullFontFamily: family,
    metrics
  };
};

// Helper to silently convert font to buffer, suppressing opentype.js verbosity
const silentToArrayBuffer = (font: OpenTypeFont): ArrayBuffer => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    const suppress = [
        "Adding CMAP format 12",
        "No character map found" 
    ];

    try {
        console.log = (...args: any[]) => {
            const msg = args.join(' ');
            if (suppress.some(s => msg.includes(s))) return;
            originalLog.apply(console, args);
        };
        console.warn = (...args: any[]) => {
             const msg = args.join(' ');
             if (suppress.some(s => msg.includes(s))) return;
             originalWarn.apply(console, args);
        }

        return font.toArrayBuffer();
    } finally {
        console.log = originalLog;
        console.warn = originalWarn;
    }
};

export const createFontUrl = (font: OpenTypeFont): string => {
  // Used only for processed fonts where we MUST rebuild the binary
  try {
      const buffer = silentToArrayBuffer(font);
      const blob = new Blob([buffer], { type: 'font/opentype' });
      return URL.createObjectURL(blob);
  } catch (e) {
      console.error("Error creating font URL, fallback to default buffer", e);
      return "";
  }
};

export const downloadFont = (font: OpenTypeFont, suffix: string) => {
    const buffer = silentToArrayBuffer(font);
    const blob = new Blob([buffer], { type: 'font/opentype' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Get original name if possible, or default
    const familyName = font.names.fontFamily?.en || 'SAAME_Font';
    link.href = url;
    link.download = `${familyName}_${suffix}.otf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const calculateAverageSB = (font: OpenTypeFont): number => {
    let total = 0;
    let count = 0;
    for (let i = 0; i < font.glyphs.length; i++) {
        const glyph = font.glyphs.get(i);
        if(glyph.unicode && glyph.name !== 'space') {
            const box = glyph.getBoundingBox();
            const lsb = box.x1;
            const rsb = glyph.advanceWidth - box.x2;
            total += (lsb + rsb);
            count++;
        }
    }
    return count > 0 ? Math.round(total / (count * 2)) : 0;
}

export const getCharMetrics = (font: OpenTypeFont, char: string): { lsb: number, rsb: number } => {
    const glyph = font.charToGlyph(char);
    if (!glyph) return { lsb: 0, rsb: 0 };
    
    const box = glyph.getBoundingBox();
    // Handle empty glyphs
    if (box.x1 === 0 && box.x2 === 0 && box.y1 === 0 && box.y2 === 0 && glyph.path.commands.length === 0) {
        return { lsb: 0, rsb: glyph.advanceWidth };
    }

    const lsb = box.x1;
    const rsb = glyph.advanceWidth - box.x2;
    return { lsb: Math.round(lsb), rsb: Math.round(rsb) };
};

// Helper to get glyph data for Visualization
export const getGlyphData = (font: OpenTypeFont, char: string) => {
    const glyph = font.charToGlyph(char);
    if (!glyph) return null;
    
    const box = glyph.getBoundingBox();
    
    // Handle empty glyphs
    if ((box.x1 === 0 && box.x2 === 0 && box.y1 === 0 && box.y2 === 0) || glyph.path.commands.length === 0) {
         return {
            xMin: 0,
            xMax: 0,
            yMin: font.descender,
            yMax: font.ascender,
            advanceWidth: glyph.advanceWidth,
            pathData: ''
        };
    }

    // Get path exactly as it exists in the font's coordinate system
    const units = font.unitsPerEm || 1000;
    const path = glyph.getPath(0, 0, units); 
    const pathData = path.toPathData(2);

    return {
        xMin: box.x1,
        xMax: box.x2,
        yMin: font.descender,
        yMax: font.ascender, // Use font metrics for vertical consistency
        glyphYMin: box.y1,
        glyphYMax: box.y2,
        advanceWidth: glyph.advanceWidth,
        pathData
    };
};

/**
 * Advanced Auto Spacing Algorithm (Harmony & Legibility Focus)
 */
export const calculateHarmonicSpacing = (font: OpenTypeFont, char: string): number => {
    const glyph = font.charToGlyph(char);
    if (!glyph) return 40; 

    const box = glyph.getBoundingBox();
    const width = box.x2 - box.x1;
    const height = box.y2 - box.y1;
    
    const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
    const rounds = ['O', 'o', 'Q', 'C', 'G', 'e', 'c', '0'];
    const isRound = rounds.includes(char);

    const weightClass = font.tables.os2?.usWeightClass || 400;
    
    const baseStemRatio = 0.16; 
    const weightFactor = (weightClass / 400); 
    const estimatedStem = height * (baseStemRatio * Math.pow(weightFactor, 0.7)); 

    const internalCounter = Math.max(width * 0.15, width - (2 * estimatedStem));

    let rhythmRatio = isUpper ? 0.40 : 0.32;
    
    let targetSB = internalCounter * rhythmRatio;

    if (isRound) {
        targetSB = targetSB * 0.65;
    }

    return Math.max(10, Math.round(targetSB));
};

export const calculateSousaDefaults = (font: OpenTypeFont) => {
    const n = calculateHarmonicSpacing(font, 'n');
    const o = calculateHarmonicSpacing(font, 'o');
    const H = calculateHarmonicSpacing(font, 'H');
    const O = calculateHarmonicSpacing(font, 'O');

    return {
        n: { lsb: n, rsb: n }, 
        o: { lsb: o, rsb: o }, 
        H: { lsb: H, rsb: H }, 
        O: { lsb: O, rsb: O }  
    };
};

export const cleanMetrics = (font: OpenTypeFont): void => {
  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i);
    if (glyph.name === 'space') continue;
    
    if (glyph.unicode || glyph.name) {
       const bounds = glyph.getBoundingBox();
       const width = bounds.x2 - bounds.x1;
       
       if (width >= 0) {
         const shiftX = -bounds.x1;
         if(shiftX !== 0) {
            glyph.path.commands.forEach((cmd: any) => {
                if (cmd.x !== undefined) cmd.x += shiftX;
                if (cmd.x1 !== undefined) cmd.x1 += shiftX;
                if (cmd.x2 !== undefined) cmd.x2 += shiftX;
            });
            
            // Invalidate cached bounding box values to force recalculation on next access
            delete (glyph as any).xMin;
            delete (glyph as any).xMax;
            delete (glyph as any).yMin;
            delete (glyph as any).yMax;
         }
         glyph.advanceWidth = width;
         if(glyph.leftSideBearing !== undefined) glyph.leftSideBearing = 0;
       }
    }
  }
  if (font.tables.kern) delete font.tables.kern;
  if (font.tables.gpos) delete font.tables.gpos;
};

const setGlyphSB = (font: OpenTypeFont, glyphName: string, lsb: number | null, rsb: number | null) => {
    const glyph = font.charToGlyph(glyphName);
    if (!glyph || !glyph.path) return;

    let bounds = glyph.getBoundingBox();
    
    if (lsb !== null) {
        const currentLsb = bounds.x1;
        const shift = lsb - currentLsb;
        if (Math.abs(shift) > 0.001) {
            glyph.path.commands.forEach((cmd: any) => {
                if (cmd.x !== undefined) cmd.x += shift;
                if (cmd.x1 !== undefined) cmd.x1 += shift;
                if (cmd.x2 !== undefined) cmd.x2 += shift;
            });
            glyph.leftSideBearing = lsb; 
            
            // Invalidate cache
            delete (glyph as any).xMin;
            delete (glyph as any).xMax;
            delete (glyph as any).yMin;
            delete (glyph as any).yMax;
            
            bounds = glyph.getBoundingBox();
        }
    }

    if (rsb !== null) {
        glyph.advanceWidth = bounds.x2 + rsb;
    }
};

export const applyTracyMethod = (font: OpenTypeFont, settings: TracySettings): void => {
    const { H, O, n, o, overrides } = settings;

    const applyRule = (char: string, ruleLsb: number | null, ruleRsb: number | null) => {
        // Base Application
        setGlyphSB(font, char, ruleLsb, ruleRsb);

        // Propagate to Diacritics/Accents immediately
        // This ensures children (e.g., 'Á') inherit from parent ('A')
        const related = DIACRITICS_MAP[char];
        if (related && related.length > 0) {
            related.forEach(childChar => {
                setGlyphSB(font, childChar, ruleLsb, ruleRsb);
            });
        }
    };

    applyRule('H', H.lsb, H.rsb);
    applyRule('O', O.lsb, O.rsb);
    applyRule('n', n.lsb, n.rsb);
    applyRule('o', o.lsb, o.rsb);

    const valH = H.lsb;        
    const valO = O.lsb;        
    const valMoreH = Math.round(valH * 1.15); // Used for M, N, W (Wide)
    const valLessH = Math.round(valH * 0.85); // Used for Open/Curved based on H (B, E, F)
    const valMin = Math.max(5, Math.round(valH * 0.25)); // Minimum Space (*)
    
    const valVisual = Math.round((valH + valO) / 2);

    // --- UPPERCASE LOGIC (Revised) ---

    applyRule('A', valMin, valMin);        // Min Space (*)
    applyRule('B', valH, valLessH);        // LSB=H, RSB=<H (Open/Curved)
    applyRule('C', valO, valLessH);        // LSB=O, RSB=<H (Open/Curved)
    applyRule('D', valH, valO);            // LSB=H, RSB=O
    applyRule('E', valH, valLessH);        // LSB=H, RSB=<H (Open/Curved)
    applyRule('F', valH, valLessH);        // LSB=H, RSB=<H (Open/Curved)
    applyRule('G', valO, valMoreH);        // LSB=O, RSB=<H (Similar to C)
    applyRule('H', valH, valH);            // Equal H
    applyRule('I', valH, valH);            // LSB=H, RSB=H (Rule)
    applyRule('J', valMin, valH);          // LSB=Min, RSB=H (Rule)
    applyRule('K', valH, valMin);          // LSB=H, RSB=Min (Rule)
    applyRule('L', valH, valMin);          // LSB=H, RSB=Min (Rule)
    applyRule('M', valMoreH, valMoreH);    // Special Adjustment: > H
    applyRule('N', valMoreH, valMoreH);    // Special Adjustment: > H
    applyRule('O', valO, valO);            // Equal O
    applyRule('P', valH, valO);            // LSB=H, RSB=O (Rule)
    applyRule('Q', valO, valO);            // LSB=O, RSB=O (Rule)
    applyRule('R', valH, valMin);          // LSB=H, RSB=Min (Rule)
    applyRule('S', valVisual, valVisual);  // Visual
    applyRule('T', valMin, valMin);        // Min Space
    applyRule('U', valH, valMoreH);            // LSB=H. Symmetry -> RSB=H.
    applyRule('V', valMin, valMin);        // Min Space
    applyRule('W', valMin, valMin);        // Min Space
    applyRule('X', valMin, valMin);        // Min Space
    applyRule('Y', valMin, valMin);        // Min Space
    applyRule('Z', valLessH, valLessH);    // < H (Open/Curved)

    // --- LOWERCASE LOGIC (Standard Tracy) ---
    const nStem = n.lsb;      
    const nArch = n.rsb;      
    const oRound = o.lsb;     
    
    const valMoreN = Math.round(nStem * 1.15); 
    const valLessO = Math.round(oRound * 0.9);
    const valMoreO = Math.round(oRound * 1.10);
    const valLowMin = Math.max(5, Math.round(nStem * 0.25));
    const valLowVisual = Math.round((nStem + oRound) / 2);

    applyRule('b', nStem, oRound);        
    applyRule('c', oRound, valLessO);     
    applyRule('d', oRound, nStem);        
    applyRule('e', oRound, valLessO);     
    applyRule('f', valLowMin, valLowMin);     
    applyRule('g', oRound, nStem); 

    applyRule('h', valMoreN, nArch);      
    applyRule('i', valMoreN, nStem);      
    applyRule('j', nStem, nStem);         
    applyRule('k', nStem, valLowMin);     
    applyRule('l', valMoreN, nStem);      
    applyRule('m', nStem, nArch);         
    applyRule('n', nStem, nArch);         
    applyRule('n', nStem, nArch);         
    applyRule('o', oRound, oRound);       
    applyRule('p', valMoreN, oRound);     
    applyRule('q', oRound, nStem);        
    applyRule('r', nStem, valLowMin);     
    applyRule('s', valLessO, valLessO);   
    applyRule('t', nStem, valLowMin);     
    applyRule('u', nStem, nStem);         
    applyRule('v', valLowMin, valLowMin); 
    applyRule('w', valLowMin, valLowMin); 
    applyRule('x', valLowVisual, valLowVisual); 
    applyRule('y', valLowMin, valLowMin); 
    applyRule('z', valLowVisual, valLowVisual); 
    applyRule('a', oRound, nStem);

    // Iterating over explicit OVERRIDES
    // These take precedence over standard rules AND the propagation above.
    // If a user manually tunes 'É', it will overwrite the value inherited from 'E'.
    Object.keys(overrides).forEach(char => {
         const { lsb, rsb } = overrides[char];
         setGlyphSB(font, char, lsb, rsb);
    });
};

export const TOPOLOGY: Record<string, { l: 'S'|'R'|'A'|'V', r: 'S'|'R'|'A'|'V' }> = {
    // Uppercase
    'A': { l: 'V', r: 'V' },
    'B': { l: 'S', r: 'R' },
    'C': { l: 'R', r: 'S' },
    'D': { l: 'S', r: 'R' },
    'E': { l: 'S', r: 'S' },
    'F': { l: 'S', r: 'S' },
    'G': { l: 'R', r: 'S' }, 
    'H': { l: 'S', r: 'S' },
    'I': { l: 'S', r: 'S' },
    'J': { l: 'V', r: 'S' }, 
    'K': { l: 'S', r: 'V' },
    'L': { l: 'S', r: 'V' },
    'M': { l: 'S', r: 'S' }, 
    'N': { l: 'S', r: 'S' }, 
    'O': { l: 'R', r: 'R' },
    'P': { l: 'S', r: 'R' },
    'Q': { l: 'R', r: 'R' },
    'R': { l: 'S', r: 'V' },
    'S': { l: 'V', r: 'V' },
    'T': { l: 'V', r: 'V' },
    'U': { l: 'S', r: 'S' }, 
    'V': { l: 'V', r: 'V' },
    'W': { l: 'V', r: 'V' },
    'X': { l: 'V', r: 'V' },
    'Y': { l: 'V', r: 'V' },
    'Z': { l: 'V', r: 'V' },
    // Lowercase
    'a': { l: 'R', r: 'S' }, 
    'b': { l: 'S', r: 'R' },
    'c': { l: 'R', r: 'R' },
    'd': { l: 'R', r: 'S' },
    'e': { l: 'R', r: 'R' },
    'f': { l: 'V', r: 'V' }, 
    'g': { l: 'R', r: 'S' },
    'h': { l: 'S', r: 'A' }, 
    'i': { l: 'S', r: 'S' },
    'j': { l: 'S', r: 'S' }, 
    'k': { l: 'S', r: 'V' },
    'l': { l: 'S', r: 'S' },
    'm': { l: 'S', r: 'A' },
    'n': { l: 'S', r: 'A' },
    'o': { l: 'R', r: 'R' },
    'p': { l: 'S', r: 'R' },
    'q': { l: 'R', r: 'S' },
    'r': { l: 'S', r: 'V' },
    's': { l: 'V', r: 'V' },
    't': { l: 'S', r: 'V' },
    'u': { l: 'S', r: 'S' }, 
    'v': { l: 'V', r: 'V' },
    'w': { l: 'V', r: 'V' },
    'x': { l: 'V', r: 'V' },
    'y': { l: 'V', r: 'V' },
    'z': { l: 'V', r: 'V' },
};

export const applySousaMethod = (font: OpenTypeFont, settings: SousaSettings): void => {
    const { n, o, H, O, overrides } = settings;

    // Helper to get value based on topology and case
    const getValue = (char: string, side: 'l'|'r', topoType: 'S'|'R'|'A'|'V'): number => {
        const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
        
        // Masters
        if (isUpper) {
            if (topoType === 'S') return H.lsb; 
            if (topoType === 'R') return O.lsb;
            if (topoType === 'V') return Math.round(H.lsb * 0.5); // Fallback for uppercase visual
        } else {
            if (topoType === 'S') return n.lsb; 
            if (topoType === 'A') return n.rsb; 
            if (topoType === 'R') return o.lsb; 
            if (topoType === 'V') return Math.round(n.lsb * 0.5); // Fallback for lowercase visual
        }
        return 20; // Safe fallback
    };

    // 1. Iterate over all characters in topology (A-Z, a-z) and apply rules
    Object.keys(TOPOLOGY).forEach(char => {
        const topo = TOPOLOGY[char];
        
        // Calculate based on Topology
        const lsb = getValue(char, 'l', topo.l);
        const rsb = getValue(char, 'r', topo.r);

        setGlyphSB(font, char, lsb, rsb);

        // PROPAGATE TO DIACRITICS
        const related = DIACRITICS_MAP[char];
        if (related && related.length > 0) {
            related.forEach(childChar => {
                setGlyphSB(font, childChar, lsb, rsb);
            });
        }
    });

    // 2. Iterate over explicit OVERRIDES 
    // This allows users to tune numbers, punctuation, OR specific accents (e.g. override 'É' specifically)
    Object.keys(overrides).forEach(char => {
         const { lsb, rsb } = overrides[char];
         setGlyphSB(font, char, lsb, rsb);
    });
    
    // 3. Ensure masters are explicitly precise BUT only if they haven't been manually overridden by the user.
    // If user overrides 'n', that override (applied in step 2) should stay.
    const setMasterSafe = (char: string, val: { lsb: number, rsb: number }) => {
        if (!overrides[char]) {
             setGlyphSB(font, char, val.lsb, val.rsb);
        }
    };

    setMasterSafe('n', n);
    setMasterSafe('o', o);
    setMasterSafe('H', H);
    setMasterSafe('O', O);
};

export const generateAdhesionText = (targetChar: string, contextGroup: string[]): string => {
    const isUpper = targetChar === targetChar.toUpperCase() && targetChar !== targetChar.toLowerCase();
    
    if (isUpper) {
        const ctx = (!contextGroup || contextGroup.length === 0) ? ['H', 'O'] : contextGroup;
        const r = () => ctx[Math.floor(Math.random() * ctx.length)];
        return `HH${targetChar}HH OO${targetChar}OO ${r()}${targetChar}${r()}`;
    } else {
        const ctx = (!contextGroup || contextGroup.length === 0) ? ['n', 'o'] : contextGroup;
        const r = () => ctx[Math.floor(Math.random() * ctx.length)];
        return `nn${targetChar}nn oo${targetChar}oo ${r()}${targetChar}${r()}`;
    }
};

export const generateFontFaceCSS = (fontState: FontState): string => {
    if (!fontState.url) return '';
    const { ascender, descender, unitsPerEm } = fontState.metrics;
    const safeUPM = unitsPerEm || 1000;
    
    // Calculate overrides percentages
    // ascent-override: Height above baseline
    // descent-override: Height below baseline (must be positive magnitude)
    // line-gap-override: Force to 0 to remove variable leading
    const ascentPct = (ascender / safeUPM) * 100;
    const descentPct = (Math.abs(descender) / safeUPM) * 100;

    return `
@font-face {
    font-family: '${fontState.fullFontFamily}';
    src: url('${fontState.url}');
    ascent-override: ${ascentPct}%;
    descent-override: ${descentPct}%;
    line-gap-override: 0%;
}`;
};
