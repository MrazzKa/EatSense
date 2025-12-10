// src/types/carcinogenicRisk.ts

export type CarcinogenicRiskLevel = 'none' | 'low' | 'moderate' | 'high';

export interface ItemCarcinogenRisk {
  itemName: string;
  level: CarcinogenicRiskLevel;
  reasonCodes: string[];
  reasons: string[];
  tags: string[];
}

export interface CarcinogenicRiskSummary {
  level: CarcinogenicRiskLevel;
  score: number;
  reasonCodes: string[];
  summaryText: string;
  disclaimer: string;
}

export interface CarcinogenicRiskResult {
  summary: CarcinogenicRiskSummary;
  highRiskItems: ItemCarcinogenRisk[];
}

