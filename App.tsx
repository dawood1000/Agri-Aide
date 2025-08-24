
import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import useLocalStorage from './hooks/useLocalStorage';
import { analyzeCropImage } from './services/geminiService';
import type { Crop, ScanHistoryItem, AnalysisResult } from './types';
import { AppScreen } from './types';

import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { HistoryScreen } from './components/HistoryScreen';

const AppContent: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HOME);
  const [history, setHistory] = useLocalStorage<ScanHistoryItem[]>('scanHistory', []);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<ScanHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { language, t } = useLanguage();

  const handleAnalyze = async (crop: Crop, image: string) => {
    setScreen(AppScreen.ANALYZING);
    setCurrentImage(image);
    setError(null);
    try {
      const result = await analyzeCropImage(image, crop, language);
      setCurrentResult(result);

      const newHistoryItem: ScanHistoryItem = {
        id: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        crop,
        image,
        result,
      };
      setHistory([newHistoryItem, ...history]);

      setScreen(AppScreen.RESULTS);
    } catch (err: any) {
      if(err.message === 'API_KEY_NOT_CONFIGURED'){
         setError(t('errorApiKey'));
      } else if (err.message === 'ANALYSIS_FAILED') {
        setError(t('errorAnalysis'));
      } else {
        setError(t('errorGeneral'));
      }
      setScreen(AppScreen.HOME);
    }
  };

  const handleViewHistoryItem = (item: ScanHistoryItem) => {
    setHistoryDetail(item);
    setScreen(AppScreen.HISTORY_DETAIL);
  };
  
  const resetToHome = () => {
    setScreen(AppScreen.HOME);
    setCurrentResult(null);
    setCurrentImage(null);
    setHistoryDetail(null);
    setError(null);
  };

  const renderScreen = () => {
    switch (screen) {
      case AppScreen.ANALYZING:
        return <AnalysisScreen />;
      case AppScreen.RESULTS:
        if (currentResult && currentImage) {
          return <ResultsScreen result={currentResult} image={currentImage} onBack={resetToHome} />;
        }
        resetToHome();
        return null;
      case AppScreen.HISTORY:
        return <HistoryScreen history={history} onViewItem={handleViewHistoryItem} onBack={resetToHome} />;
      case AppScreen.HISTORY_DETAIL:
        if (historyDetail) {
          return <ResultsScreen result={historyDetail.result} image={historyDetail.image} onBack={() => setScreen(AppScreen.HISTORY)} />;
        }
        setScreen(AppScreen.HISTORY);
        return null;
      case AppScreen.HOME:
      default:
        return (
          <>
            {error && (
              <div className="container mx-auto px-4 pt-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">{t('error')}! </strong>
                  <span className="block sm:inline">{error}</span>
                  <span className="absolute top-0 bottom-0 right-0 rtl:left-0 rtl:right-auto px-4 py-3" onClick={() => setError(null)}>
                    <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                  </span>
                </div>
              </div>
            )}
            <HomeScreen onAnalyze={handleAnalyze} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header onHistoryClick={() => setScreen(AppScreen.HISTORY)} isHome={screen === AppScreen.HOME} />
      <main>{renderScreen()}</main>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;