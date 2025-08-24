
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
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{t('scanHistory')}</h2>
        <button
          onClick={onBack}
          className="text-green-600 font-semibold hover:underline flex items-center gap-1"
        >
          <span className="inline-block rtl:rotate-180">&larr;</span> {t('backToHome')}
        </button>
      </div>
      
      {history.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">{t('noHistory')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4 text-left rtl:text-right"
            >
              <img 
                src={`data:image/jpeg;base64,${item.image}`} 
                alt={`${item.crop.name} leaf`}
                className="w-20 h-20 object-cover rounded-md"
              />
              <div className="flex-grow">
                <p className="font-bold text-lg text-gray-800">
                  {item.result.diseaseName}
                </p>
                <p className="text-sm text-gray-500">{item.crop.name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => onViewItem(item)}
                className="bg-green-100 text-green-800 font-semibold py-2 px-4 rounded-lg hover:bg-green-200 transition-colors text-sm"
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