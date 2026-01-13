
import React from 'react';

export enum Language {
  EN = 'English',
  UR = 'Urdu',
  SI = 'Sindhi',
  PS = 'Pashto',
  BAL = 'Balochi',
}

export enum AppScreen {
  HOME = 'home',
  ANALYZING = 'analyzing',
  RESULTS = 'results',
  HISTORY = 'history',
  HISTORY_DETAIL = 'history_detail',
  ABOUT = 'about',
  CHAT = 'chat',
}

export interface Crop {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  cropMismatch?: boolean;
  mismatchExplanation?: string;
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
  regionalAlerts?: string[];
  groundingLinks?: GroundingLink[];
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  crop: Crop;
  image: string; // base64 encoded image
  result: AnalysisResult;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
