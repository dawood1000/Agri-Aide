
import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(Language.EN);

  useEffect(() => {
    const isRtl = language === Language.UR || language === Language.SI;
    if (isRtl) {
      document.documentElement.dir = 'rtl';
      document.body.classList.add('font-urdu');
    } else {
      document.documentElement.dir = 'ltr';
      document.body.classList.remove('font-urdu');
    }
    
    // Cleanup on component unmount
    return () => {
        document.body.classList.remove('font-urdu');
        document.documentElement.dir = 'ltr';
    }
  }, [language]);

  const t = useMemo(() => (key: string): string => {
    return TRANSLATIONS[language][key] || key;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};