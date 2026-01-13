
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Crop, AnalysisResult } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { startAgriChat } from '../services/geminiService';
import { Chat } from '@google/genai';

interface ChatScreenProps {
  crop: Crop;
  diagnosis: AnalysisResult;
  onBack: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ crop, diagnosis, onBack }) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatInstanceRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatInstanceRef.current = startAgriChat(crop, diagnosis, language);
    setMessages([{ role: 'model', text: t('chatWelcome') }]);
  }, [crop, diagnosis, language, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || !chatInstanceRef.current || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const response = await chatInstanceRef.current.sendMessage({ message: userText });
      const modelText = response.text || "I'm sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Error: Could not connect to the expert agronomist." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] animate-fade-in bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Chat Header */}
      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
            <span className="rtl:rotate-180 block text-lg font-black">←</span>
          </button>
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{t('talkToExpert')}</h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{crop.name} • {diagnosis.diseaseName}</p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-[24px] shadow-sm text-sm font-medium leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-100 dark:border-slate-800'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-200 dark:bg-slate-800 px-5 py-3 rounded-[24px] rounded-bl-none text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('sending')}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800 shadow-2xl transition-colors">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('chatPlaceholder')}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-emerald-950/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
