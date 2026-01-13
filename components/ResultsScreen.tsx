
import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisResult, Crop, Language } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
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
  onChatClick: () => void;
  onAnalyzeRequest: (crop: Crop, image: string, forceLanguage?: Language) => void;
}

const DEFAULT_VOICE = 'Zephyr';

const ResultCard: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode; variant?: 'default' | 'alert' }> = ({ title, children, icon, variant = 'default' }) => {
  const borderColor = variant === 'alert' ? 'border-orange-500' : 'border-emerald-500';
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 mb-6 border-l-[6px] ${borderColor} border-y border-r border-slate-100 dark:border-slate-800 animate-fade-in transition-colors`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl ${variant === 'alert' ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'}`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
};

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3 mb-4 group">
    <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
      <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 group-hover:bg-white"></div>
    </div>
    <span className="text-slate-700 dark:text-slate-300 text-base">{children}</span>
  </li>
);

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, image, crop, onBack, onChatClick, onAnalyzeRequest }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const confidenceColor = result.confidenceScore > 80 ? 'text-emerald-600 dark:text-emerald-400' : result.confidenceScore > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
  const lastLanguageRef = useRef<Language>(language);

  // Stop audio playback when result changes or component unmounts
  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {
          // Ignore errors from stopping already stopped source
        }
      }
    };
  }, [result, image]);

  useEffect(() => {
    if (lastLanguageRef.current !== language) {
        if (audioSourceRef.current) { 
          try { audioSourceRef.current.stop(); } catch(e) {} 
          audioSourceRef.current = null;
          setAudioSource(null);
          setIsSpeaking(false); 
        }
        lastLanguageRef.current = language;
        onAnalyzeRequest(crop, image, language);
    }
  }, [language, onAnalyzeRequest, crop, image]);

  const handleToggleSpeech = async () => {
    if (isSpeaking || isLoadingSpeech) {
      if (audioSourceRef.current) { 
        try { audioSourceRef.current.stop(); } catch(e) {} 
        audioSourceRef.current = null;
        setAudioSource(null); 
      }
      setIsSpeaking(false); setIsLoadingSpeech(false); return;
    }
    try {
      setIsLoadingSpeech(true); setActionError(null);
      
      const parts = [
        result.diseaseName,
        result.description
      ];

      if (result.symptoms && result.symptoms.length > 0) {
        parts.push(`${t('symptoms')}: ${result.symptoms.join(', ')}.`);
      }

      if (result.remedies) {
        if (result.remedies.organic && result.remedies.organic.length > 0) {
          parts.push(`${t('organic')} ${t('remedies')}: ${result.remedies.organic.join(', ')}.`);
        }
        if (result.remedies.chemical && result.remedies.chemical.length > 0) {
          parts.push(`${t('chemical')} ${t('remedies')}: ${result.remedies.chemical.join(', ')}.`);
        }
      }

      if (result.preventiveMeasures && result.preventiveMeasures.length > 0) {
        parts.push(`${t('prevention')}: ${result.preventiveMeasures.join(', ')}.`);
      }

      const speechText = parts.join(' ');
      
      const base64Audio = await generateTTS(speechText, DEFAULT_VOICE);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer; source.connect(ctx.destination);
      source.onended = () => { 
        setIsSpeaking(false); 
        setAudioSource(null); 
        audioSourceRef.current = null;
      };
      source.start(); 
      setAudioSource(source); 
      audioSourceRef.current = source;
      setIsSpeaking(true);
    } catch (err) { setActionError(t('errorTTS')); setIsSpeaking(false); } finally { setIsLoadingSpeech(false); }
  };

  const handleShare = async () => {
    const shareText = `${t('appName')} - ${result.diseaseName}\n\n${result.description}`;
    if (navigator.share) {
      try { await navigator.share({ title: t('appName'), text: shareText }); } catch (err) {}
    } else {
      try { await navigator.clipboard.writeText(shareText); alert(t('copiedToClipboard')); } catch (err) { setActionError(t('errorShare')); }
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="container mx-auto p-4 max-w-3xl pb-32 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{t('analysisResults')}</h2>
          <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
            {crop.name}
          </div>
        </div>
        
        {actionError && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-4 mb-6 rounded-2xl flex justify-between items-center shadow-lg">
            <p className="text-rose-700 dark:text-rose-400 font-medium text-sm">{actionError}</p>
            <button onClick={() => setActionError(null)} className="text-rose-500 dark:text-rose-400 font-bold p-2 hover:text-rose-300">✕</button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden mb-8 border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-5 relative group h-full">
              <img src={`data:image/jpeg;base64,${image}`} alt="Analyzed leaf" className="w-full h-full min-h-[300px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-slate-950/80 to-transparent"></div>
              <div className="absolute bottom-4 left-4">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black text-white uppercase tracking-widest ${result.isHealthy ? 'bg-emerald-500' : 'bg-rose-600'}`}>
                  {result.isHealthy ? t('healthy') : 'Detected'}
                </span>
              </div>
            </div>
            <div className="md:col-span-7 p-8 flex flex-col justify-center">
              <h3 className={`text-3xl font-black ${result.isHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'} mb-3 leading-tight py-1`}>
                {result.diseaseName}
              </h3>
              {!result.isHealthy && (
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-grow bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                     <div className={`h-full ${result.confidenceScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${result.confidenceScore}%` }}></div>
                  </div>
                  <span className={`text-sm font-black ${confidenceColor}`}>{result.confidenceScore}%</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button 
                  onClick={handleToggleSpeech}
                  disabled={isLoadingSpeech && !isSpeaking}
                  className={`flex items-center justify-center gap-2 font-bold py-4 px-4 rounded-2xl transition-all shadow-lg active:scale-95 ${isSpeaking || isLoadingSpeech ? 'bg-rose-700 text-white' : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  {isLoadingSpeech ? <div className="w-5 h-5 border-2 border-emerald-700 dark:border-emerald-400 border-t-transparent rounded-full animate-spin"></div> : isSpeaking ? <StopCircleIcon className="w-5 h-5" /> : <SpeakerLoudIcon className="w-5 h-5" />}
                  <span className="text-xs uppercase tracking-tight">{isSpeaking || isLoadingSpeech ? t('stopReading') : t('readAloud')}</span>
                </button>
                <button onClick={handleShare} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold py-4 px-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <ShareIcon className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-tight">{t('shareResults')}</span>
                </button>
              </div>

              <button 
                onClick={onChatClick}
                className="w-full bg-emerald-600 text-white font-black py-4 px-4 rounded-2xl shadow-xl shadow-emerald-950/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {t('talkToExpert')}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ResultCard title={t('diseaseInfo')} icon={<LeafIcon className="w-5 h-5" />}>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">{result.description}</p>
          </ResultCard>

          {!result.isHealthy && (
            <>
              <ResultCard title={t('symptoms')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}>
                <ul className="space-y-2">
                  {result.symptoms?.map((symptom, i) => <ListItem key={i}>{symptom}</ListItem>)}
                </ul>
              </ResultCard>
              <ResultCard title={t('remedies')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.673.337a4 4 0 01-2.506.331L6 15l2-2.5m1.428-1.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.673.337a4 4 0 01-2.506.331L2 10l2-2.5m10.744 3.372a4 4 0 115.714 5.714 4 4 0 01-5.714-5.714z" /></svg>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-4">{t('organic')}</h4>
                    <ul className="space-y-2">{result.remedies?.organic.map((remedy, i) => <ListItem key={i}>{remedy}</ListItem>)}</ul>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t('chemical')}</h4>
                    <ul className="space-y-2">{result.remedies?.chemical.map((remedy, i) => <ListItem key={i}>{remedy}</ListItem>)}</ul>
                  </div>
                </div>
              </ResultCard>
              
              {result.preventiveMeasures && result.preventiveMeasures.length > 0 && (
                <ResultCard title={t('prevention')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}>
                  <ul className="space-y-2">
                    {result.preventiveMeasures.map((measure, i) => <ListItem key={i}>{measure}</ListItem>)}
                  </ul>
                </ResultCard>
              )}
            </>
          )}

          {/* Source & Map Grounding Links (Mandatory Display) */}
          {result.groundingLinks && result.groundingLinks.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-slate-800 dark:text-white shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800 transition-colors">
              <h4 className="text-emerald-600 dark:text-emerald-500 font-black text-xs uppercase tracking-[0.2em] mb-4">Sources & Regional Data</h4>
              <div className="space-y-3">
                {result.groundingLinks.map((link, i) => (
                  <a 
                    key={i} 
                    href={link.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 p-4 rounded-xl transition-all border border-slate-200 dark:border-slate-700/50"
                  >
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-slate-100 truncate pr-4">{link.title}</span>
                    <svg className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40">
          <button onClick={onBack} className="w-full max-w-sm bg-emerald-600 text-white font-black py-4 px-10 rounded-2xl hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-950/40 active:scale-95 border border-emerald-500/20">
            {t('backToHome')}
          </button>
        </div>
      </div>
    </div>
  );
};
