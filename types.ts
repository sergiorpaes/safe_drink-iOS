
export enum SafetyStatus {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
  CRITICAL = 'CRITICAL',
  INVALID = 'INVALID'
}

export interface AnalysisResult {
  status: SafetyStatus;
  drinkType: string;
  observations: string[];
  detectedRedFlags: string[];
  confidence: number;
  alertMessage?: string;
  recommendation: string;
  emergencyAction?: string;
}

export interface ScanState {
  isScanning: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

export interface PhysicalSymptom {
  id: string;
  label: string;
  severity: 'low' | 'high';
}

export const SYMPTOMS: PhysicalSymptom[] = [
  { id: 'taste', label: 'Salty/Bitter Taste', severity: 'low' },
  { id: 'confusion', label: 'Mental Confusion', severity: 'high' },
  { id: 'speech', label: 'Speech Difficulty', severity: 'high' },
  { id: 'nausea', label: 'Nausea/Vomiting', severity: 'low' },
  { id: 'breathing', label: 'Breathing Problems', severity: 'high' },
  { id: 'spasms', label: 'Muscle Spasms/Seizures', severity: 'high' },
  { id: 'memory', label: 'Memory/Consciousness Loss', severity: 'high' },
  { id: 'hangover', label: 'Severe Hangover (little alcohol)', severity: 'low' },
  { id: 'intoxication', label: 'Unusual Intoxication', severity: 'high' },
];
