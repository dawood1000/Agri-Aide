
import React from 'react';
import type { ScanHistoryItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HistoryScreenProps {
  history: ScanHistoryItem[];
  onViewItem: (item: ScanHistoryItem) => void;
  onBack: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onViewItem, onBack }) => {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 max-w-3xl animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{t('scanHistory')}</h2>
        <button
          onClick={onBack}
          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
        >
          <span className="inline-block rtl:rotate-180">&larr;</span> {t('backToHome')}
        </button>
      </div>
      
      {history.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-slate-400 dark:text-slate-500 font-medium">{t('noHistory')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-800 p-5 flex items-center gap-5 text-left rtl:text-right transition-all group"
            >
              <div className="relative flex-shrink-0">
                <img 
                  src={`data:image/jpeg;base64,${item.image}`} 
                  alt={`${item.crop.name} leaf`}
                  className="w-20 h-20 object-cover rounded-2xl shadow-sm group-hover:scale-105 transition-transform"
                />
                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 ${item.result.isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-black text-lg text-slate-800 dark:text-slate-100 truncate">
                  {item.result.diseaseName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                    {item.crop.name}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onViewItem(item)}
                className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-3 px-5 rounded-2xl hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all text-xs uppercase tracking-wider"
              >
                {t('viewDetails')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
