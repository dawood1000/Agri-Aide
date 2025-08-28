import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface AboutScreenProps {
  onBack: () => void;
}

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
  <div className="bg-white rounded-lg shadow-md p-6 mb-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-2">{question}</h3>
    <p className="text-gray-700">{answer}</p>
  </div>
);

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('aboutTitle')}</h2>
        <button
          onClick={onBack}
          className="text-green-600 font-semibold hover:underline flex items-center gap-1"
        >
          <span className="inline-block rtl:rotate-180">&larr;</span> {t('backToHome')}
        </button>
      </div>

      <div className="space-y-4">
        <FAQItem question={t('q1')} answer={t('a1')} />
        <FAQItem question={t('q2')} answer={t('a2')} />
        <FAQItem question={t('q3')} answer={t('a3')} />
        <FAQItem question={t('q4')} answer={t('a4')} />
      </div>
    </div>
  );
};
