import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisResult, Crop } from '../types';
import { Language } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LeafIcon } from './icons/LeafIcon';
import { SpeakerLoudIcon } from './icons/SpeakerLoudIcon';
import { StopCircleIcon } from './icons/StopCircleIcon';

interface ResultsScreenProps {
  result: AnalysisResult;
  image: string;
  crop: Crop;
  onBack: () => void;
  onAnalyzeRequest: (crop: Crop, image: string) => void;
}

const ResultCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow-md p-4 mb-4">
    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-2">{title}</h3>
    {children}
  </div>
);

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-start gap-2 mb-2">
        <LeafIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
        <span>{children}</span>
    </li>
);


export const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, image, crop, onBack, onAnalyzeRequest }) => {
  const { t, language } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const confidenceColor = result.confidenceScore > 80 ? 'text-green-600' : result.confidenceScore > 50 ? 'text-yellow-600' : 'text-red-600';
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Don't re-analyze on the initial render of the component
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    // Re-analyze when the language changes to get translated results
    onAnalyzeRequest(crop, image);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);


  const getLangCode = (lang: Language): string => {
    switch(lang) {
        case Language.UR: return 'ur-PK';
        case Language.SI: return 'sd-IN'; // Best available option in browsers
        case Language.PS: return 'ps-AF'; // Best available option in browsers
        case Language.BAL: return 'ur-PK'; // Fallback for Balochi
        case Language.EN:
        default:
            return 'en-US';
    }
  }

  // Effect to load available speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    
    // Voices load asynchronously
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); // For browsers that load voices instantly

    // Cleanup: stop speaking and remove listener when component unmounts
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const createSpeechText = () => {
    let text = `${result.diseaseName}. `;
    text += `${t('diseaseInfo')}: ${result.description}. `;

    if (!result.isHealthy) {
        if (result.symptoms?.length > 0) {
            text += `${t('symptoms')}: ${result.symptoms.join(', ')}. `;
        }
        if (result.remedies) {
            text += `${t('remedies')}: `;
            if (result.remedies.chemical?.length > 0) {
                text += `${t('chemical')}: ${result.remedies.chemical.join(', ')}. `;
            }
            if (result.remedies.organic?.length > 0) {
                text += `${t('organic')}: ${result.remedies.organic.join(', ')}. `;
            }
        }
        if (result.preventiveMeasures?.length > 0) {
            text += `${t('prevention')}: ${result.preventiveMeasures.join(', ')}. `;
        }
    }
    return text;
  };

  const handleToggleSpeech = () => {
    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
    } else {
      const speechText = createSpeechText();
      const utterance = new SpeechSynthesisUtterance(speechText);
      const targetLang = getLangCode(language);
      
      utterance.lang = targetLang;

      // Find a specific voice for the target language for better quality
      const voice = voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
      
      if (voice) {
        utterance.voice = voice;
      } else {
        console.warn(`TTS voice not found for language: ${targetLang}. Using browser default.`);
      }
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        setIsSpeaking(false);
      };
      
      synth.speak(utterance);
      setIsSpeaking(true);
    }
  };


  return (
    <div className="container mx-auto p-4 max-w-3xl pb-24">
      <h2 className="text-2xl font-bold text-center text-gray-800 my-4">{t('analysisResults')}</h2>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <img src={`data:image/jpeg;base64,${image}`} alt="Analyzed leaf" className="w-full h-64 object-cover" />
          <div className="p-4 flex flex-col justify-center">
            <h3 className={`text-2xl font-bold ${result.isHealthy ? 'text-green-700' : 'text-red-700'}`}>
              {result.diseaseName}
            </h3>
            {!result.isHealthy && (
              <p className="text-lg font-medium text-gray-600">
                {t('confidence')}: <span className={`font-bold ${confidenceColor}`}>{result.confidenceScore}%</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <ResultCard title={t('diseaseInfo')}>
        <p className="text-gray-700">{result.description}</p>
      </ResultCard>

      {!result.isHealthy && (
        <>
          {result.symptoms && result.symptoms.length > 0 && (
            <ResultCard title={t('symptoms')}>
              <ul className="text-gray-700 list-none">
                {result.symptoms.map((symptom, i) => <ListItem key={i}>{symptom}</ListItem>)}
              </ul>
            </ResultCard>
          )}

          {result.remedies && (
            <ResultCard title={t('remedies')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">{t('chemical')}</h4>
                  <ul className="text-gray-700 list-none">
                    {result.remedies.chemical.map((remedy, i) => <ListItem key={i}>{remedy}</ListItem>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">{t('organic')}</h4>
                  <ul className="text-gray-700 list-none">
                    {result.remedies.organic.map((remedy, i) => <ListItem key={i}>{remedy}</ListItem>)}
                  </ul>
                </div>
              </div>
            </ResultCard>
          )}

          {result.preventiveMeasures && result.preventiveMeasures.length > 0 && (
            <ResultCard title={t('prevention')}>
              <ul className="text-gray-700 list-none">
                {result.preventiveMeasures.map((measure, i) => <ListItem key={i}>{measure}</ListItem>)}
              </ul>
            </ResultCard>
          )}
        </>
      )}

      <div className="text-center mt-6">
        <button
          onClick={onBack}
          className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
        >
          {t('backToHome')}
        </button>
      </div>
      
      <div className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-20">
        <button
          onClick={handleToggleSpeech}
          className="bg-green-600 text-white rounded-full p-4 shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-110"
          aria-label={isSpeaking ? t('stopReading') : t('readAloud')}
        >
          {isSpeaking ? (
            <StopCircleIcon className="w-8 h-8" />
          ) : (
            <SpeakerLoudIcon className="w-8 h-8" />
          )}
        </button>
      </div>

    </div>
  );
};