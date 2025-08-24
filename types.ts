import React from 'react';

export enum Language {
  EN = 'English',
  UR = 'Urdu',
  SI = 'Sindhi',
}

export enum AppScreen {
  HOME = 'home',
  ANALYZING = 'analyzing',
  RESULTS = 'results',
  HISTORY = 'history',
  HISTORY_DETAIL = 'history_detail',
}

export interface Crop {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export interface AnalysisResult {
  diseaseName: string;
  confidenceScore: number;
  isHealthy: boolean;
  description: string;
  symptoms: string[];
  remedies: {
    chemical: string[];
    organic: string[];
  };
  preventiveMeasures: string[];
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  crop: Crop;
  image: string; // base64 encoded image
  result: AnalysisResult;
}
