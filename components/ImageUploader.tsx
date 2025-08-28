import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CameraIcon } from './icons/CameraIcon';
import { UploadIcon } from './icons/UploadIcon';

interface ImageUploaderProps {
  onImageSelect: (base64Image: string) => void;
}

// Simple check for mobile devices to select the appropriate camera
const isMobile = /Mobi/i.test(window.navigator.userAgent);

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<string | null>(null);
  
  // Create separate refs for each input type
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setPreview(reader.result as string);
        onImageSelect(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTakePhotoClick = () => {
    cameraInputRef.current?.click();
  };
  
  const handleUploadFromGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center">
      <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 mb-4 overflow-hidden">
        {preview ? (
          <img src={preview} alt="Selected leaf" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-500">
            <p>{t('uploadInstruction')}</p>
          </div>
        )}
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hidden input for taking a photo with the camera */}
        <input
          type="file"
          accept="image/*"
          capture={isMobile ? 'environment' : 'user'} // This is key for opening the correct camera
          onChange={handleFileChange}
          className="hidden"
          ref={cameraInputRef}
        />
        <button
          onClick={handleTakePhotoClick}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105"
        >
          <CameraIcon className="w-6 h-6" />
          <span>{t('takePhoto')}</span>
        </button>
        
        {/* Hidden input for uploading from the gallery */}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          ref={galleryInputRef}
        />
        <button 
          onClick={handleUploadFromGalleryClick}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
          <UploadIcon className="w-6 h-6" />
          <span>{t('uploadFromGallery')}</span>
        </button>
      </div>
    </div>
  );
};