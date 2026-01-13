
import React, { useState, useCallback, useRef } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import useLocalStorage from './hooks/useLocalStorage';
import { analyzeCropImage } from './services/geminiService';
import type { Crop, ScanHistoryItem, AnalysisResult, Language } from './types';
import { AppScreen } from './types';

import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { AboutScreen } from './components/AboutScreen';
import { ChatScreen } from './components/ChatScreen';

type ResultsCache = Record<string, Partial<Record<Language, AnalysisResult>>>;

const AppContent: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HOME);
  const [history, setHistory] = useLocalStorage<ScanHistoryItem[]>('scanHistory', []);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentCrop, setCurrentCrop] = useState<Crop | null>(null);
  const [historyDetail, setHistoryDetail] = useState<ScanHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { language, t } = useLanguage();

  const cacheRef = useRef<ResultsCache>({});

  const getPosition = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition((pos) => resolve(pos), () => resolve(null), { timeout: 5000, maximumAge: 60000 });
    });
  };

  const handleAnalyze = useCallback(async (crop: Crop, image: string, forceLanguage?: Language) => {
    const targetLanguage = forceLanguage || language;
    const imageCache = cacheRef.current[image];
    if (imageCache && imageCache[targetLanguage]) {
      setCurrentResult(imageCache[targetLanguage]!);
      setCurrentImage(image);
      setCurrentCrop(crop);
      setScreen(AppScreen.RESULTS);
      return;
    }

    setScreen(AppScreen.ANALYZING);
    setCurrentImage(image);
    setCurrentCrop(crop);
    setError(null);

    try {
      const pos = await getPosition();
      const location = pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude } : undefined;
      const result = await analyzeCropImage(image, crop, targetLanguage, location);
      
      if (result.cropMismatch) {
        setError(t('errorCropMismatch'));
        setScreen(AppScreen.HOME);
        return;
      }

      if (!cacheRef.current[image]) cacheRef.current[image] = {};
      cacheRef.current[image][targetLanguage] = result;
      setCurrentResult(result);

      const isNewScan = !history.some(item => item.image === image);
      if (isNewScan) {
          const newHistoryItem: ScanHistoryItem = {
            id: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            crop, image, result, location
          };
          setHistory([newHistoryItem, ...history]);
      }
      setScreen(AppScreen.RESULTS);
    } catch (err: any) {
      setError(err.message === 'API_KEY_NOT_CONFIGURED' ? t('errorApiKey') : t('errorAnalysis'));
      setScreen(AppScreen.HOME);
    }
  }, [history, language, setHistory, t]);

  const handleViewHistoryItem = (item: ScanHistoryItem) => {
    setHistoryDetail(item);
    setScreen(AppScreen.HISTORY_DETAIL);
  };
  
  const resetToHome = () => {
    setScreen(AppScreen.HOME);
    setCurrentResult(null); setCurrentImage(null); setCurrentCrop(null); setHistoryDetail(null); setError(null);
  };

  const renderScreen = () => {
    switch (screen) {
      case AppScreen.ANALYZING: return <AnalysisScreen />;
      case AppScreen.RESULTS:
        if (currentResult && currentImage && currentCrop) {
          return <ResultsScreen result={currentResult} image={currentImage} crop={currentCrop} onBack={resetToHome} onChatClick={() => setScreen(AppScreen.CHAT)} onAnalyzeRequest={handleAnalyze} />;
        }
        resetToHome(); return null;
      case AppScreen.CHAT:
        if ((currentResult || historyDetail?.result) && (currentCrop || historyDetail?.crop)) {
          return <ChatScreen crop={(currentCrop || historyDetail!.crop)} diagnosis={(currentResult || historyDetail!.result)} onBack={() => setScreen(AppScreen.RESULTS)} />;
        }
        resetToHome(); return null;
      case AppScreen.HISTORY: return <HistoryScreen history={history} onViewItem={handleViewHistoryItem} onBack={resetToHome} />;
      case AppScreen.HISTORY_DETAIL:
        if (historyDetail) {
          return <ResultsScreen result={historyDetail.result} image={historyDetail.image} crop={historyDetail.crop} onBack={() => setScreen(AppScreen.HISTORY)} onChatClick={() => setScreen(AppScreen.CHAT)} onAnalyzeRequest={handleAnalyze}/>;
        }
        setScreen(AppScreen.HISTORY); return null;
      case AppScreen.ABOUT: return <AboutScreen onBack={resetToHome} />;
      case AppScreen.HOME:
      default:
        return (
          <>
            {error && (
              <div className="container mx-auto px-4 pt-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 border border-rose-400 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-2xl relative shadow-md" role="alert">
                  <span className="block sm:inline">{error}</span>
                  <button className="absolute top-0 bottom-0 right-0 px-4" onClick={() => setError(null)}>✕</button>
                </div>
              </div>
            )}
            <HomeScreen onAnalyze={handleAnalyze} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Header
        onHistoryClick={() => setScreen(AppScreen.HISTORY)}
        onAboutClick={() => setScreen(AppScreen.ABOUT)}
        isHome={screen === AppScreen.HOME}
      />
      <main className="pb-10">{renderScreen()}</main>
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
