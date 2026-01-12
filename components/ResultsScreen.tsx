import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisResult, Crop, Language } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LeafIcon } from './icons/LeafIcon';
import { SpeakerLoudIcon } from './icons/SpeakerLoudIcon';
import { StopCircleIcon } from './icons/StopCircleIcon';
import { ShareIcon } from './icons/ShareIcon';
import { generateTTS, decodeBase64, decodeAudioData } from '../services/geminiService';

interface ResultsScreenProps {
  result: AnalysisResult;
  image: string;
  crop: Crop;
  onBack: () => void;
  onAnalyzeRequest: (crop: Crop, image: string, forceLanguage?: Language) => void;
}

const DEFAULT_VOICE = 'Zephyr';

const ResultCard: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ title, children, icon }) => (
  <div className="bg-white rounded-lg shadow-md p-5 mb-5 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
    <div className="flex items-center gap-2 mb-3 border-b pb-2">
      {icon}
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
    </div>
    {children}
  </div>
);

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 mb-3">
    <LeafIcon className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
    <span className="text-gray-700 leading-relaxed text-lg">{children}</span>
  </li>
);

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, image, crop, onBack, onAnalyzeRequest }) => {
  const { t, language } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const confidenceColor = result.confidenceScore > 80 ? 'text-green-600' : result.confidenceScore > 50 ? 'text-yellow-600' : 'text-red-600';
  
  // Track the language of the 'result' prop we currently display
  const lastLanguageRef = useRef<Language>(language);

  useEffect(() => {
    // If language changed and it's not the one associated with the current result, request a new analysis
    if (lastLanguageRef.current !== language) {
        // Stop any ongoing speech
        if (audioSource) {
          try { audioSource.stop(); } catch(e) {}
          setAudioSource(null);
          setIsSpeaking(false);
        }
        lastLanguageRef.current = language;
        // The parent (App.tsx) handles the caching logic
        onAnalyzeRequest(crop, image, language);
    }
  }, [language, onAnalyzeRequest, crop, image]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioSource) {
        try { audioSource.stop(); } catch(e) {}
      }
    };
  }, [audioSource]);

  const createSpeechText = () => {
    return `${result.diseaseName}. ${result.description}`;
  };

  const startSpeech = async () => {
    try {
      setIsLoadingSpeech(true);
      setActionError(null);
      const speechText = createSpeechText();
      const base64Audio = await generateTTS(speechText, DEFAULT_VOICE);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsSpeaking(false);
        setAudioSource(null);
      };
      
      source.start();
      setAudioSource(source);
      setIsSpeaking(true);
    } catch (err) {
      console.error("TTS failed", err);
      setActionError(t('errorTTS'));
      setIsSpeaking(false);
    } finally {
      setIsLoadingSpeech(false);
    }
  };

  const handleToggleSpeech = () => {
    if (isSpeaking || isLoadingSpeech) {
      if (audioSource) {
        try { audioSource.stop(); } catch(e) {}
        setAudioSource(null);
      }
      setIsSpeaking(false);
      setIsLoadingSpeech(false);
      return;
    }
    startSpeech();
  };

  const handleShare = async () => {
    setActionError(null);
    const shareText = `${t('appName')} - ${result.diseaseName}\n\n${result.description}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: t('appName'), text: shareText });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setActionError(t('errorShare'));
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert(t('copiedToClipboard'));
      } catch (err) {
        setActionError(t('errorShare'));
      }
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl pb-32">
      <h2 className="text-2xl font-bold text-center text-gray-800 my-4">{t('analysisResults')}</h2>
      
      {actionError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded shadow-sm flex justify-between items-start">
          <p className="text-red-700 font-medium">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4 text-xs uppercase">
            {t('dismiss')}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <img src={`data:image/jpeg;base64,${image}`} alt="Analyzed leaf" className="w-full h-72 object-cover" />
          <div className="p-6 flex flex-col justify-center bg-gray-50">
            <h3 className={`text-3xl font-bold ${result.isHealthy ? 'text-green-700' : 'text-red-700'} mb-2`}>
              {result.diseaseName}
            </h3>
            {!result.isHealthy && (
              <p className="text-xl font-medium text-gray-600 mb-4">
                {t('confidence')}: <span className={`font-bold ${confidenceColor}`}>{result.confidenceScore}%</span>
              </p>
            )}
            <button onClick={handleShare} className="flex items-center justify-center gap-2 bg-white text-blue-600 font-bold py-2 px-4 rounded-lg border border-blue-200 shadow-sm hover:bg-blue-50">
              <ShareIcon className="w-5 h-5" />
              <span>{t('shareResults')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-green-200 flex items-center justify-center gap-4">
        <button
          onClick={handleToggleSpeech}
          disabled={isLoadingSpeech && !isSpeaking}
          className={`flex items-center gap-2 ${isSpeaking || isLoadingSpeech ? 'bg-red-600' : 'bg-green-600'} text-white font-bold py-3 px-8 rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50`}
        >
          {isLoadingSpeech ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isSpeaking ? (
            <StopCircleIcon className="w-6 h-6" />
          ) : (
            <SpeakerLoudIcon className="w-6 h-6" />
          )}
          <span>{isSpeaking || isLoadingSpeech ? t('stopReading') : t('readAloud')}</span>
        </button>
      </div>

      <ResultCard title={t('diseaseInfo')}>
        <p className="text-gray-700 text-lg leading-relaxed">{result.description}</p>
      </ResultCard>

      {!result.isHealthy && (
        <>
          {result.symptoms && result.symptoms.length > 0 && (
            <ResultCard title={t('symptoms')}>
              <ul className="text-gray-700 list-none space-y-1">
                {result.symptoms.map((symptom, i) => <ListItem key={i}>{symptom}</ListItem>)}
              </ul>
            </ResultCard>
          )}

          {result.remedies && (
            <ResultCard title={t('remedies')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-bold text-blue-800 mb-3">{t('chemical')}</h4>
                  <ul className="text-gray-700 list-none space-y-1">
                    {result.remedies.chemical.map((remedy, i) => <ListItem key={i}>{remedy}</ListItem>)}
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h4 className="font-bold text-green-800 mb-3">{t('organic')}</h4>
                  <ul className="text-gray-700 list-none space-y-1">
                    {result.remedies.organic.map((remedy, i) => <ListItem key={i}>{remedy}</ListItem>)}
                  </ul>
                </div>
              </div>
            </ResultCard>
          )}

          {result.preventiveMeasures && result.preventiveMeasures.length > 0 && (
            <ResultCard title={t('prevention')}>
              <ul className="text-gray-700 list-none space-y-1">
                {result.preventiveMeasures.map((measure, i) => <ListItem key={i}>{measure}</ListItem>)}
              </ul>
            </ResultCard>
          )}
        </>
      )}

      {result.groundingLinks && result.groundingLinks.length > 0 && (
        <ResultCard title="Regional Resources">
          <div className="flex flex-wrap gap-2 pt-2">
            {result.groundingLinks.map((link, i) => (
              <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-green-700 py-2 px-4 rounded-full text-sm font-medium border border-gray-300">
                {link.title}
              </a>
            ))}
          </div>
        </ResultCard>
      )}

      <div className="text-center mt-12 mb-8">
        <button onClick={onBack} className="bg-green-600 text-white font-bold py-4 px-10 rounded-xl hover:bg-green-700 transition-all shadow-lg">
          {t('backToHome')}
        </button>
      </div>
    </div>
  );
};
