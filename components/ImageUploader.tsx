
import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CameraIcon } from './icons/CameraIcon';
import { UploadIcon } from './icons/UploadIcon';
import { CameraCapture } from './CameraCapture';

interface ImageUploaderProps {
  onImageSelect: (base64Image: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Helper to downscale image before processing
  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024; // Sufficient for analysis but small for storage
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Reduce quality to 0.7 to save massive space in LocalStorage
        const resized = canvas.toDataURL('image/jpeg', 0.7);
        resolve(resized.split(',')[1]);
      };
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resizedBase64 = await resizeImage(reader.result as string);
        setPreview(`data:image/jpeg;base64,${resizedBase64}`);
        onImageSelect(resizedBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = async (base64: string) => {
    const resizedBase64 = await resizeImage(`data:image/jpeg;base64,${base64}`);
    setPreview(`data:image/jpeg;base64,${resizedBase64}`);
    onImageSelect(resizedBase64);
    setIsCapturing(false);
  };

  const handleUploadFromGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  if (isCapturing) {
    return <CameraCapture onCapture={handleCapture} onCancel={() => setIsCapturing(false)} />;
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      <div className="w-full h-72 border-2 border-dashed border-emerald-200 dark:border-slate-700 rounded-[2rem] flex items-center justify-center bg-emerald-50/30 dark:bg-slate-800/20 mb-6 overflow-hidden relative shadow-inner">
        {preview ? (
          <img src={preview} alt="Selected leaf" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center p-6">
            <div className="bg-emerald-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <CameraIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-emerald-800 dark:text-slate-200 font-bold text-lg mb-1">{t('scanLeaf')}</p>
            <p className="text-emerald-600/70 dark:text-slate-400 text-sm">{t('uploadInstruction')}</p>
          </div>
        )}
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setIsCapturing(true)}
          className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
        >
          <CameraIcon className="w-6 h-6" />
          <span className="text-sm uppercase tracking-wider">{t('takePhoto')}</span>
        </button>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          ref={galleryInputRef}
        />
        <button 
          onClick={handleUploadFromGalleryClick}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700 font-black py-4 px-6 rounded-2xl hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all shadow-md active:scale-95">
          <UploadIcon className="w-6 h-6" />
          <span className="text-sm uppercase tracking-wider">{t('uploadFromGallery')}</span>
        </button>
      </div>
    </div>
  );
};
