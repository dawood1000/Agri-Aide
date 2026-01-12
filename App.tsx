import React, { useState, useCallback, useRef } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
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

/**
 * Cache structure to store analysis results for a specific image in different languages.
 * Key: string (image base64 or unique ID)
 * Value: Map of language to analysis result
 */
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

  // In-memory cache for session results to avoid re-analysis when flipping languages
  const cacheRef = useRef<ResultsCache>({});

  const getPosition = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      // Reduced timeout to 5 seconds for better UX
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  const handleAnalyze = useCallback(async (crop: Crop, image: string, forceLanguage?: Language) => {
    const targetLanguage = forceLanguage || language;
    
    // Check cache first
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

      // Update Cache
      if (!cacheRef.current[image]) cacheRef.current[image] = {};
      cacheRef.current[image][targetLanguage] = result;

      setCurrentResult(result);

      // Only add to history if it's a new image scan
      const isNewScan = !history.some(item => item.image === image);
      if (isNewScan) {
          const newHistoryItem: ScanHistoryItem = {
            id: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            crop,
            image,
            result,
            location
          };
          setHistory([newHistoryItem, ...history]);
      }

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
  }, [history, language, setHistory, t]);

  const handleViewHistoryItem = (item: ScanHistoryItem) => {
    // Populate cache from history item to prevent re-scan if they change language in detail view
    if (!cacheRef.current[item.image]) cacheRef.current[item.image] = {};
    // Note: This only caches for the original language. Other languages will still trigger a scan once.
    
    setHistoryDetail(item);
    setScreen(AppScreen.HISTORY_DETAIL);
  };
  
  const resetToHome = () => {
    setScreen(AppScreen.HOME);
    setCurrentResult(null);
    setCurrentImage(null);
    setCurrentCrop(null);
    setHistoryDetail(null);
    setError(null);
  };

  const renderScreen = () => {
    switch (screen) {
      case AppScreen.ANALYZING:
        return <AnalysisScreen />;
      case AppScreen.RESULTS:
        if (currentResult && currentImage && currentCrop) {
          return <ResultsScreen result={currentResult} image={currentImage} crop={currentCrop} onBack={resetToHome} onAnalyzeRequest={handleAnalyze} />;
        }
        resetToHome();
        return null;
      case AppScreen.HISTORY:
        return <HistoryScreen history={history} onViewItem={handleViewHistoryItem} onBack={resetToHome} />;
      case AppScreen.HISTORY_DETAIL:
        if (historyDetail) {
          return <ResultsScreen result={historyDetail.result} image={historyDetail.image} crop={historyDetail.crop} onBack={() => setScreen(AppScreen.HISTORY)} onAnalyzeRequest={handleAnalyze}/>;
        }
        setScreen(AppScreen.HISTORY);
        return null;
      case AppScreen.ABOUT:
        return <AboutScreen onBack={resetToHome} />;
      case AppScreen.HOME:
      default:
        return (
          <>
            {error && (
              <div className="container mx-auto px-4 pt-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative shadow-sm" role="alert">
                  <strong className="font-bold">{t('error')}! </strong>
                  <span className="block sm:inline">{error}</span>
                  <button className="absolute top-0 bottom-0 right-0 rtl:left-0 rtl:right-auto px-4 py-3" onClick={() => setError(null)}>
                    <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                  </button>
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
      <Header
        onHistoryClick={() => setScreen(AppScreen.HISTORY)}
        onAboutClick={() => setScreen(AppScreen.ABOUT)}
        isHome={screen === AppScreen.HOME}
      />
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
