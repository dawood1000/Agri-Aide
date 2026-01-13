
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
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 px-6">
      <div className="relative w-48 h-48 mb-10 group">
        {/* Decorative Ring */}
        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        
        {/* Inner Content with scanning line */}
        <div className="absolute inset-4 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden shadow-inner border border-emerald-200">
          <svg className="w-16 h-16 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3" /></svg>
          <div className="scan-line"></div>
        </div>
      </div>

      <div className="text-center space-y-3 animate-fade-in">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          {t('analyzing')}
        </h2>
        <div className="flex flex-col items-center">
           <p className="text-emerald-600 font-semibold bg-emerald-50 px-4 py-1.5 rounded-full text-sm">
             {messages[messageIndex]}
           </p>
           <div className="mt-4 flex gap-1.5">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></div>
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></div>
           </div>
        </div>
      </div>
    </div>
  );
};
