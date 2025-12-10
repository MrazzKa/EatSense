import { URLS } from '../config/env';
import { fetchWithTimeout } from './fetchWithTimeout';

export interface AnalysisResult {
  items: Array<{
    label: string;
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
    gramsMean?: number;
  }>;
}

export const analyzeImage = async (imageUri: string, locale?: string): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'image.jpg',
  } as any);

  if (locale) {
    formData.append('locale', locale);
  }

  try {
    const response = await fetchWithTimeout(`${URLS.API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }, 30000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Analysis error:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
};

export const analyzeText = async (description: string, locale?: 'en' | 'ru' | 'kk'): Promise<AnalysisResult> => {
  try {
    const response = await fetchWithTimeout(`${URLS.API_BASE_URL}/analyze-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description, locale }),
    }, 30000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Text analysis error:', error);
    throw new Error(`Text analysis failed: ${error.message}`);
  }
};