
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const AnalysisScreen: React.FC = () => {
  const { t } = useLanguage();
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    t('analysisMessage1'),
    t('analysisMessage2'),
    t('analysisMessage3'),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-green-50">
      <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      <h2 className="text-2xl font-bold text-green-800 mt-6">{t('analyzing')}</h2>
      <p className="text-gray-600 mt-2">{messages[messageIndex]}</p>
    </div>
  );
};
