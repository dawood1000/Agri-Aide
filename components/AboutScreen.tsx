
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { LeafIcon } from './icons/LeafIcon';

interface AboutScreenProps {
  onBack: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 mb-6 animate-fade-in transition-colors">
    <div className="flex items-center gap-4 mb-6">
      <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">{title}</h3>
    </div>
    <div className="text-slate-600 dark:text-slate-400 leading-relaxed text-base font-medium">
      {children}
    </div>
  </div>
);

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 max-w-4xl pb-32 animate-fade-in">
      <div className="flex justify-between items-center mb-10 mt-4">
        <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{t('aboutTitle')}</h2>
        <button
          onClick={onBack}
          className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black py-3 px-6 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
        >
          <span className="inline-block rtl:rotate-180">←</span> {t('backToHome')}
        </button>
      </div>

      {/* Hero Mission Section */}
      <div className="bg-emerald-600 dark:bg-emerald-700 rounded-[2.5rem] p-10 mb-10 text-white shadow-xl shadow-emerald-100 dark:shadow-emerald-950/20 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-4 uppercase tracking-widest text-emerald-100">{t('missionTitle')}</h3>
          <p className="text-xl md:text-2xl font-bold leading-snug">
            "{t('missionText')}"
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <Section title={t('q1')} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}>
            <p>{t('a1')}</p>
          </Section>
        </div>
        <div className="md:col-span-1">
          <Section title={t('q2')} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.673.337a4 4 0 01-2.506.331L6 15l2-2.5m1.428-1.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.673.337a4 4 0 01-2.506.331L2 10l2-2.5m10.744 3.372a4 4 0 115.714 5.714 4 4 0 01-5.714-5.714z" /></svg>}>
            <p>{t('a2')}</p>
          </Section>
        </div>
        <div className="md:col-span-1">
          <Section title={t('q3')} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
            <p>{t('a3')}</p>
          </Section>
        </div>
        <div className="md:col-span-1">
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] border border-rose-100 dark:border-rose-900/50 p-8 h-full transition-colors">
            <div className="flex items-center gap-4 mb-6 text-rose-600 dark:text-rose-400">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               <h3 className="text-xl font-black tracking-tight uppercase">{t('q4')}</h3>
            </div>
            <p className="text-rose-800/80 dark:text-rose-300/80 leading-relaxed text-sm font-bold">
              {t('a4')}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <LeafIcon className="w-12 h-12 text-emerald-300 dark:text-emerald-800 mx-auto mb-4" />
        <p className="text-slate-400 dark:text-slate-600 font-black tracking-[0.2em] uppercase text-xs">
          Built for the future of farming
        </p>
      </div>
    </div>
  );
};
