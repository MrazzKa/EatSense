import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AnalysisResult } from '../food-analyzer.service';

@Injectable()
export class OpenAiAnalyzer {
  private readonly logger = new Logger(OpenAiAnalyzer.name);
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Extract JSON from a response that may include markdown, code fences, or extra text
  private extractJson(text: string): string {
    // 1) Look for ```json ... ``` fenced block
    const fencedJson = text.match(/```json\s*[\s\S]*?```/i);
    if (fencedJson && fencedJson[0]) {
      return fencedJson[0].replace(/```json/i, '').replace(/```$/, '').trim();
    }
    // 2) Look for any ``` ... ``` fenced block
    const fenced = text.match(/```[\s\S]*?```/);
    if (fenced && fenced[0]) {
      return fenced[0].replace(/```/g, '').trim();
    }
    // 3) Fallback: extract substring between first { and last }
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return text.slice(first, last + 1);
    }
    // 4) As a last resort, return original text (will fail fast in JSON.parse)
    return text.trim();
  }

  async analyzeImage(imageBuffer: Buffer): Promise<AnalysisResult> {
    const model = process.env.OPENAI_MODEL || 'gpt-5.1';
    this.logger.debug(`[OpenAiAnalyzer] Using model: ${model} for image analysis`);

    try {
      const response = await this.openai.chat.completions.create({
        // Model can be configured via OPENAI_MODEL, default to gpt-5.1
        model,
        messages: [
          {
            role: 'system',
            content: `You are a professional nutritionist. Provide accurate nutritional data.

CRITICAL RULES (STRICT COMPLIANCE REQUIRED):

1. FOOD NAMING BANS:
   - NEVER use "рисовая мука" (rice flour) for visible grains. If it looks like rice, it IS "рис отварной" (boiled rice).
   - NEVER use "виноградные помидоры". Use "черри помидоры" (cherry tomatoes).
   - NEVER use "листья шпината". Use "шпинат свежий".
   - NEVER use "авокадо Хасс". Use just "авокадо".

2. PORTION-BASED MATH (CRITICAL):
   - You MUST calculate nutrients for the ACTUAL portion size, NOT per 100g.
   - Example: Boiled rice is ~130 kcal/100g. For 180g portion: 130 * 1.8 = 234 kcal.
   - Chicken breast is ~165 kcal/100g. For 150g portion: 165 * 1.5 = 247 kcal.
   - BE REALISTIC. Do not hallucinate high calories for plain vegetables.

3. DISH NAMING (For the whole plate):
   - If multiple components: "Сборная тарелка ([main], [side], [veg])"
   - Example: "Сборная тарелка (курица, рис, овощи)"
   - If healthy/dietary: "ПП тарелка (курица с рисом)" or similar.
   - Keep it short (max 50 chars).

4. COMMON INGREDIENTS CONTEXT:
   - Identify cooking method: boiled/steamed/fried.
   - "White stuff" next to chicken is usually "рис отварной" or "картофельное пюре", NOT flour/sugar/salt.

Return JSON:
{
  "dishName": "Сборная тарелка...",
  "items": [
    {
      "label": "рис отварной",
      "kcal": 234,
      "protein": 5,
      "fat": 1,
      "carbs": 50,
      "gramsMean": 180
    }
  ]
}`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food photo. Identify ingredients, estimated portion sizes (grams), and calculate total nutrients PER PORTION. Use Russian names.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
                },
              },
            ],
          },
        ],
        max_completion_tokens: 1500,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON from possible markdown/text response
      try {
        const jsonString = this.extractJson(content);
        const result = JSON.parse(jsonString);
        if (!result.items || !Array.isArray(result.items)) {
          throw new Error('Invalid response format');
        }
        return result;
      } catch (parseError: any) {
        this.logger.error('[OpenAiAnalyzer] Failed to parse OpenAI response', {
          parseError: parseError.message,
          contentPreview: content?.substring(0, 200),
        });
        throw new Error('Invalid response format from OpenAI');
      }
    } catch (error: any) {
      this.logger.error('[OpenAiAnalyzer] OpenAI image analysis error', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        status: error?.status,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
        model,
      });
      throw error;
    }
  }

  async analyzeText(description: string): Promise<AnalysisResult> {
    const model = process.env.OPENAI_MODEL || 'gpt-5.1';
    this.logger.debug(`[OpenAiAnalyzer] Using model: ${model} for text analysis`);

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a professional nutritionist and food analyst. Analyze food descriptions and provide accurate nutritional information.
            
            Guidelines:
            - Parse the description to identify all food items
            - Estimate realistic portion sizes
            - Provide accurate nutritional data per 100g
            - Consider cooking methods mentioned
            - Account for common ingredients and seasonings
            - Be specific about food names and preparation methods
            
            Return a JSON object with an "items" array, where each item has:
            - label: specific food name
            - kcal: calories per 100g
            - protein: protein in grams per 100g
            - fat: fat in grams per 100g
            - carbs: carbohydrates in grams per 100g
            - gramsMean: estimated portion size in grams
            
            Example format:
            {
              "items": [
                {
                  "label": "Grilled Chicken Breast",
                  "kcal": 165,
                  "protein": 31,
                  "fat": 3.6,
                  "carbs": 0,
                  "gramsMean": 150
                }
              ]
            }`,
          },
          {
            role: 'user',
            content: `Analyze this food description and provide detailed nutritional information: "${description}"`,
          },
        ],
        max_completion_tokens: 1500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON from possible markdown/text response
      try {
        const jsonString = this.extractJson(content);
        const result = JSON.parse(jsonString);
        if (!result.items || !Array.isArray(result.items)) {
          throw new Error('Invalid response format');
        }
        return result;
      } catch (parseError: any) {
        this.logger.error('[OpenAiAnalyzer] Failed to parse OpenAI response', {
          parseError: parseError.message,
          contentPreview: content?.substring(0, 200),
        });
        throw new Error('Invalid response format from OpenAI');
      }
    } catch (error: any) {
      this.logger.error('[OpenAiAnalyzer] OpenAI text analysis error', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        status: error?.status,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
        model,
        descriptionPreview: description?.substring(0, 100),
      });
      throw error;
    }
  }
}
