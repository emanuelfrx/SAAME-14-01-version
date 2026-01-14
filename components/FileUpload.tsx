
import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (buffer: ArrayBuffer, fileName: string) => void;
  compact?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, compact = false }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onFileLoaded(e.target.result as ArrayBuffer, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, [onFileLoaded]);

  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'h-auto py-8' : 'h-[50vh]'} border-2 border-dashed border-gray-700 rounded-xl bg-gray-900/50 hover:bg-gray-900/80 transition-colors`}>
      <div className={`text-center ${compact ? 'p-4' : 'p-8'}`}>
        <div className={`bg-gray-800 ${compact ? 'p-2 mb-3' : 'p-4 mb-4'} rounded-full inline-flex`}>
          <Upload className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-blue-400`} />
        </div>
        <h3 className={`${compact ? 'text-base' : 'text-xl'} font-semibold text-white mb-2`}>Import Font File</h3>
        <p className={`text-gray-400 ${compact ? 'mb-4 text-xs' : 'mb-6'}`}>Supports .otf and .ttf formats</p>
        
        <label className={`cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-medium ${compact ? 'py-1.5 px-4 text-sm' : 'py-2 px-6'} rounded-lg transition-colors`}>
          <span>Select File</span>
          <input 
            type="file" 
            accept=".otf,.ttf" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
};
