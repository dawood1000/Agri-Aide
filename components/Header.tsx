
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../types';
import { LeafIcon } from './icons/LeafIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { InfoIcon } from './icons/InfoIcon';

interface HeaderProps {
  onHistoryClick: () => void;
  onAboutClick: () => void;
  isHome: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onHistoryClick, onAboutClick, isHome }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const isRtl = language !== Language.EN;

  return (
    <header className="glass dark:bg-slate-900/80 shadow-sm sticky top-0 z-50 border-b border-white/20 dark:border-slate-800 transition-colors">
      <div className={`container mx-auto px-4 flex justify-between items-center ${isRtl ? 'py-6 min-h-[110px]' : 'py-3 min-h-[64px]'} md:min-h-[80px]`}>
        <div className="flex items-center gap-3 group cursor-pointer overflow-visible">
          <div className="bg-emerald-600 p-2 rounded-xl shadow-md group-hover:bg-emerald-500 transition-all flex-shrink-0">
            <LeafIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col justify-center overflow-visible">
             <h1 className={`text-xl font-bold ${isRtl ? 'text-emerald-800 dark:text-emerald-400' : 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-green-600 dark:from-emerald-400 dark:to-green-400'} whitespace-nowrap overflow-visible ${isRtl ? 'leading-[2.8] py-2' : 'leading-relaxed py-1'}`}>
               {t('appName')}
             </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm"
            title="Toggle Theme"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4-9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728l-.707-.707M6.343 17.657l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            )}
          </button>
          {isHome && (
            <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-full shadow-inner border border-white/50 dark:border-slate-700">
              <button
                onClick={onAboutClick}
                className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
                title={t('about')}
              >
                <InfoIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <button
                onClick={onHistoryClick}
                className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
                title={t('history')}
              >
                <HistoryIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          )}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={`appearance-none bg-emerald-50 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 text-emerald-900 dark:text-emerald-400 font-black rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full px-4 pr-9 cursor-pointer shadow-sm hover:bg-emerald-100/50 dark:hover:bg-slate-700 transition-colors ${isRtl ? 'text-lg py-1 leading-[2.8]' : 'text-xs py-3 uppercase tracking-wider'}`}
            >
              <option value={Language.EN}>EN</option>
              <option value={Language.UR}>اردو</option>
              <option value={Language.SI}>سنڌي</option>
              <option value={Language.PS}>پښتو</option>
              <option value={Language.BAL}>بلوچی</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-emerald-700 dark:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
