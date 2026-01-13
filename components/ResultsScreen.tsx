
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastLanguageRef = useRef<Language>(language);

  // Robust Confidence Score Normalization
  const getNormalizedConfidence = useCallback(() => {
    let score = result.confidenceScore;
    if (typeof score !== 'number') return 85; // Fallback for UI consistency
    if (score > 0 && score <= 1) return Math.round(score * 100);
    return Math.min(100, Math.max(0, Math.round(score)));
  }, [result.confidenceScore]);

  const confidence = getNormalizedConfidence();
  const confidenceColor = result.isHealthy ? 'text-emerald-600' : confidence > 75 ? 'text-emerald-600' : 'text-amber-600';
  const barColor = result.isHealthy ? 'bg-emerald-500' : confidence > 75 ? 'bg-emerald-500' : 'bg-amber-500';

  // Stop any playing audio immediately
  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) {
        // Source already stopped
      }
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoadingSpeech(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  // Logic for re-analysis on language change
  useEffect(() => {
    if (lastLanguageRef.current !== language) {
      stopAudio();
      lastLanguageRef.current = language;
      onAnalyzeRequest(crop, image, language);
    }
  }, [language, onAnalyzeRequest, crop, image, stopAudio]);

  const handleToggleSpeech = async () => {
    // If already playing or loading, stop it
    if (isSpeaking || isLoadingSpeech) {
      stopAudio();
      return;
    }

    try {
      setIsLoadingSpeech(true);
      setActionError(null);
      
      const speechParts = [
        result.diseaseName,
        result.description,
        ...(result.symptoms || []),
        ...(result.preventiveMeasures || [])
      ].filter(Boolean).join(". ");

      const base64Audio = await generateTTS(speechParts, DEFAULT_VOICE);
      
      // Lazily initialize and resume context on user gesture
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsSpeaking(false);
        audioSourceRef.current = null;
      };
      
      source.start(0);
      audioSourceRef.current = source;
      setIsSpeaking(true);
    } catch (err) {
      console.error("TTS Control Error:", err);
      setActionError(t('errorTTS'));
      setIsSpeaking(false);
    } finally {
      setIsLoadingSpeech(false);
    }
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
    <div className="min-h-screen transition-colors duration-300 pb-40">
      <div className="container mx-auto p-4 max-w-3xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{t('analysisResults')}</h2>
          <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
            {crop.name}
          </div>
        </div>
        
        {actionError && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-4 mb-6 rounded-2xl flex justify-between items-center shadow-lg">
            <p className="text-rose-700 dark:text-rose-400 font-medium text-sm">{actionError}</p>
            <button onClick={() => setActionError(null)} className="text-rose-500 font-bold p-2">✕</button>
          </div>
        )}

        {/* Main Result Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden mb-8 border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-5 relative h-64 md:h-full">
              <img src={`data:image/jpeg;base64,${image}`} alt="Result" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] ${result.isHealthy ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-rose-600 shadow-lg shadow-rose-600/30'}`}>
                  {result.isHealthy ? t('healthy') : 'Diagnosis'}
                </span>
              </div>
            </div>
            <div className="md:col-span-7 p-8">
              <h3 className={`text-3xl font-black mb-4 leading-tight ${result.isHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {result.diseaseName}
              </h3>
              
              {/* Confidence Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('confidence')}</span>
                  <span className={`text-sm font-black ${confidenceColor}`}>{confidence}%</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${barColor} shadow-sm`} 
                    style={{ width: `${Math.max(8, confidence)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button 
                  onClick={handleToggleSpeech}
                  disabled={isLoadingSpeech && !isSpeaking}
                  className={`flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 ${isSpeaking ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700'}`}
                >
                  {isLoadingSpeech ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : isSpeaking ? <StopCircleIcon className="w-5 h-5" /> : <SpeakerLoudIcon className="w-5 h-5" />}
                  <span className="text-[10px] uppercase tracking-wider">{isSpeaking ? t('stopReading') : t('readAloud')}</span>
                </button>
                <button onClick={handleShare} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                  <ShareIcon className="w-5 h-5" />
                  <span className="text-[10px] uppercase tracking-wider">{t('shareResults')}</span>
                </button>
              </div>

              <button 
                onClick={onChatClick}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {t('talkToExpert')}
              </button>
            </div>
          </div>
        </div>

        {/* Details Sections */}
        <div className="space-y-6">
          <ResultCard title={t('diseaseInfo')} icon={<LeafIcon className="w-5 h-5" />}>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">{result.description}</p>
          </ResultCard>

          {!result.isHealthy && (
            <>
              <ResultCard title={t('symptoms')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}>
                <ul className="space-y-2">{result.symptoms?.map((s, i) => <ListItem key={i}>{s}</ListItem>)}</ul>
              </ResultCard>
              <ResultCard title={t('remedies')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.673.337a4 4 0 01-2.506.331L6 15l2-2.5m1.428-1.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.673.337a4 4 0 01-2.506.331L2 10l2-2.5m10.744 3.372a4 4 0 115.714 5.714 4 4 0 01-5.714-5.714z" /></svg>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-3">{t('organic')}</h4>
                    <ul className="space-y-1">{result.remedies?.organic.map((r, i) => <ListItem key={i}>{r}</ListItem>)}</ul>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">{t('chemical')}</h4>
                    <ul className="space-y-1">{result.remedies?.chemical.map((r, i) => <ListItem key={i}>{r}</ListItem>)}</ul>
                  </div>
                </div>
              </ResultCard>
            </>
          )}

          {/* Sources Section */}
          {result.groundingLinks && result.groundingLinks.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-4">Official Sources & Maps</h4>
              <div className="space-y-2">
                {result.groundingLinks.map((link, i) => (
                  <a key={i} href={link.uri} target="_blank" rel="noopener" className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-emerald-50 transition-all border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{link.title}</span>
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar - Fix for "Back to Home" button visibility */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex justify-center pb-safe">
        <button 
          onClick={onBack} 
          className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span className="inline-block rtl:rotate-180">←</span>
          {t('backToHome')}
        </button>
      </div>
    </div>
  );
};
