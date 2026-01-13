
import React, { useState } from 'react';
import type { Crop } from '../types';
import { CROPS } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import { ImageUploader } from './ImageUploader';

interface HomeScreenProps {
  onAnalyze: (crop: Crop, image: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onAnalyze }) => {
  const { t } = useLanguage();
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeClick = () => {
    if (!selectedCrop) return;
    if (!selectedImage) {
      setError(t('errorNoImage'));
      return;
    }
    setError(null);
    onAnalyze(selectedCrop, selectedImage);
  };
  
  const handleImageSelect = (imageBase64: string) => {
    setSelectedImage(imageBase64);
    if(error){
      setError(null);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col items-center pb-20">
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-b from-emerald-600 to-green-500 dark:from-emerald-700 dark:to-green-600 pt-8 pb-16 px-4 text-center rounded-b-[40px] shadow-lg mb-8">
        <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">
          {t('appName')}: {t('scanNewLeaf')}
        </h2>
        <p className="text-emerald-50 max-w-md mx-auto text-sm opacity-90">
          Advanced AI detection to keep your crops healthy and productive.
        </p>
      </div>

      <div className="container mx-auto px-4 -mt-12">
        <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('selectCrop')}</h3>
            {selectedCrop && (
              <button 
                onClick={() => { setSelectedCrop(null); setSelectedImage(null); }}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                {t('dismiss')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {CROPS.map((crop) => (
              <button
                key={crop.id}
                onClick={() => setSelectedCrop(crop)}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all duration-300 ${
                  selectedCrop?.id === crop.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-4 ring-emerald-500/10'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${selectedCrop?.id === crop.id ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-transparent'}`}>
                  {crop.icon}
                </div>
                <span className={`mt-2 text-xs font-bold ${selectedCrop?.id === crop.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {crop.name}
                </span>
              </button>
            ))}
          </div>

          {selectedCrop && (
            <div className="animate-fade-in space-y-6 pt-4 border-t border-slate-50 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <ImageUploader onImageSelect={handleImageSelect} />
              </div>

              {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
              
              <div className="flex justify-center">
                <button
                  onClick={handleAnalyzeClick}
                  disabled={!selectedImage}
                  className={`w-full max-w-md flex items-center justify-center gap-3 py-4 px-8 rounded-2xl text-lg font-bold transition-all shadow-lg active:scale-95 ${
                    selectedImage 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 pulse-green' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                  }`}
                >
                  <svg className={`w-6 h-6 ${selectedImage ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  {selectedImage ? t('scanLeaf') : t('scanNewLeaf')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
