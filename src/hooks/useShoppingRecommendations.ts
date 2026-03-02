import { useState, useEffect } from 'react';
import ApiService from '../services/apiService';
import { useI18n } from '../../app/i18n/hooks';
import { ShoppingCategory } from '../types/tracker';

interface Recommendation {
  name: string;
  category: ShoppingCategory;
  emoji: string;
}

const CATEGORY_MAP: Record<string, ShoppingCategory> = {
  protein: 'protein',
  proteins: 'protein',
  meat: 'protein',
  fish: 'protein',
  vegetable: 'veg',
  vegetables: 'veg',
  fruit: 'veg',
  fruits: 'veg',
  dairy: 'dairy',
  fat: 'fat',
  fats: 'fat',
  oils: 'fat',
  grain: 'grain',
  grains: 'grain',
  cereals: 'grain',
};

function mapCategory(raw?: string): ShoppingCategory {
  if (!raw) return 'other';
  const key = raw.toLowerCase().trim();
  return CATEGORY_MAP[key] || 'other';
}

export function useShoppingRecommendations() {
  const { language } = useI18n();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [insufficientData, setInsufficientData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const response = await ApiService.getSuggestedFoodsV2(language);

        if (!response || response.status === 'insufficient_data') {
          setInsufficientData(true);
          setRecommendations([]);
          return;
        }

        const items: Recommendation[] = [];
        const sections = response.sections || [];
        for (const section of sections) {
          for (const item of section.items || []) {
            items.push({
              name: item.name || item.title || '',
              category: mapCategory(section.category || section.title),
              emoji: item.emoji || '🍽️',
            });
          }
        }

        if (!cancelled) {
          setRecommendations(items);
          setInsufficientData(false);
        }
      } catch {
        if (!cancelled) {
          setRecommendations([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [language]);

  return { recommendations, loading, insufficientData };
}
