import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class UsdaNutritionProvider {
  private readonly logger = new Logger(UsdaNutritionProvider.name);
  private readonly USDA_API_KEY: string;
  private readonly USDA_API_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

  constructor(private readonly configService: ConfigService) {
    this.USDA_API_KEY = this.configService.get<string>('USDA_API_KEY') || '';
    if (!this.USDA_API_KEY) {
      this.logger.error('USDA_API_KEY is not set in environment variables.');
      throw new Error('USDA_API_KEY is not configured.');
    }
  }

  async searchFood(query: string): Promise<any> {
    try {
      const response = await axios.get(`${this.USDA_API_BASE_URL}/foods/search`, {
        params: {
          api_key: this.USDA_API_KEY,
          query: query,
          dataType: ['Branded', 'Foundation', 'SR Legacy'],
          pageSize: 1,
        },
      });
      return response.data.foods[0];
    } catch (error: any) {
      this.logger.error(`USDA food search failed for query "${query}": ${error.message}`);
      throw error;
    }
  }

  async getFoodDetails(fdcId: number): Promise<any> {
    try {
      const response = await axios.get(`${this.USDA_API_BASE_URL}/food/${fdcId}`, {
        params: {
          api_key: this.USDA_API_KEY,
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`USDA food details fetch failed for FDC ID "${fdcId}": ${error.message}`);
      throw error;
    }
  }

  async analyzeImage(imageUrl: string): Promise<any> {
    this.logger.warn('USDA API does not directly support image analysis. This method requires an external image-to-text service or manual input.');
    throw new Error('USDA API does not support direct image analysis.');
  }

  async analyzeText(description: string): Promise<any> {
    this.logger.log(`Analyzing text with USDA: "${description}"`);
    try {
      const searchResult = await this.searchFood(description);
      if (!searchResult) {
        return { dishName: description, items: [], totalKcal: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 };
      }

      const foodDetails = await this.getFoodDetails(searchResult.fdcId);
      const nutrients = foodDetails.foodNutrients;

      const getNutrientValue = (nutrientName: string) => {
        const nutrient = nutrients.find((n: any) => n.nutrient.name.toLowerCase().includes(nutrientName.toLowerCase()));
        return nutrient ? nutrient.amount : 0;
      };

      const totalKcal = getNutrientValue('energy');
      const totalProtein = getNutrientValue('protein');
      const totalFat = getNutrientValue('fat');
      const totalCarbs = getNutrientValue('carbohydrate');

      return {
        dishName: foodDetails.description,
        items: [
          {
            label: foodDetails.description,
            kcal: totalKcal,
            protein: totalProtein,
            fat: totalFat,
            carbs: totalCarbs,
            gramsMean: foodDetails.servingSize || 100,
          },
        ],
        totalKcal,
        totalProtein,
        totalFat,
        totalCarbs,
      };
    } catch (error: any) {
      this.logger.error(`USDA text analysis failed: ${error.message}`);
      throw error;
    }
  }
}