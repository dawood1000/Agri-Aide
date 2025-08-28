
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
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

  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <LeafIcon className="w-8 h-8 text-green-600" />
          <h1 className="text-xl font-bold text-green-800">{t('appName')}</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {isHome && (
            <>
              <button
                onClick={onAboutClick}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label={t('about')}
              >
                <InfoIcon className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={onHistoryClick}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label={t('history')}
              >
                <HistoryIcon className="w-6 h-6 text-gray-600" />
              </button>
            </>
          )}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2"
          >
            <option value={Language.EN}>English</option>
            <option value={Language.UR}>اردو</option>
            <option value={Language.SI}>سنڌي</option>
            <option value={Language.PS}>پښتو</option>
            <option value={Language.BAL}>بلوچی</option>
          </select>
        </div>
      </div>
    </header>
  );
};