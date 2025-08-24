
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
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">{t('selectCrop')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
          {CROPS.map((crop) => (
            <button
              key={crop.id}
              onClick={() => setSelectedCrop(crop)}
              className={`flex flex-col items-center p-3 border-2 rounded-lg transition-all duration-200 ${
                selectedCrop?.id === crop.id
                  ? 'border-green-500 bg-green-50 scale-105 shadow-md'
                  : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
              }`}
            >
              {crop.icon}
              <span className="mt-2 text-sm font-medium text-gray-700">{crop.name}</span>
            </button>
          ))}
        </div>

        {selectedCrop && (
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold text-center text-gray-700 mb-4">{t('uploadInstruction')}</h3>
            <ImageUploader onImageSelect={handleImageSelect} />
            {error && <p className="text-red-500 text-center mt-2">{error}</p>}
            <div className="mt-6 text-center">
              <button
                onClick={handleAnalyzeClick}
                disabled={!selectedImage}
                className="w-full max-w-md bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {t('scanNewLeaf')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
