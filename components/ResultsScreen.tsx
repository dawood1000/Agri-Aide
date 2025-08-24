
import React from 'react';
import type { AnalysisResult } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LeafIcon } from './icons/LeafIcon';

interface ResultsScreenProps {
  result: AnalysisResult;
  image: string;
  onBack: () => void;
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


export const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, image, onBack }) => {
  const { t } = useLanguage();
  const confidenceColor = result.confidenceScore > 80 ? 'text-green-600' : result.confidenceScore > 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="container mx-auto p-4 max-w-3xl">
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
    </div>
  );
};
