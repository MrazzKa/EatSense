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
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.logger.debug(`[OpenAiAnalyzer] Using model: ${model} for image analysis`);

    try {
      const response = await this.openai.chat.completions.create({
        // Model can be configured via OPENAI_MODEL, default to gpt-4o
        model,
        messages: [
          {
            role: 'system',
            content: `You are a professional nutritionist AI with deep expertise in food identification, portion estimation, and Russian-language food naming.

=== YOUR TASK ===
Analyze the food image and return structured JSON with:
1. Overall dish name (dishName)
2. Individual ingredients with their nutritional values PER PORTION

=== STEP 1: DISH NAMING (dishName field) ===

RULE: If you recognize a SPECIFIC DISH, use its proper name:
- Борщ, Щи, Солянка, Окрошка (soups)
- Плов, Каша гречневая, Каша овсяная (grains)
- Оливье, Винегрет, Греческий салат, Цезарь (salads)
- Пельмени, Вареники, Голубцы, Котлеты (main dishes)
- Бефстроганов, Шашлык, Люля-кебаб (meat dishes)
- Блины, Сырники, Творожная запеканка (breakfast/desserts)

RULE: If it's a COMBINATION of separate foods on a plate, use:
"Тарелка: [главное], [гарнир/овощи]"
Examples:
- "Тарелка: курица запечённая, рис, овощи"
- "Тарелка: лосось, брокколи, картофель"
- "Тарелка: котлета, гречка, салат"

MAX LENGTH: 50 characters. Truncate with "..." if needed.

=== STEP 2: INGREDIENT NAMING (label field) ===

Use COMMON Russian food names. NEVER use scientific/exotic terms.

BANNED WORDS → CORRECT ALTERNATIVES:
- "рисовая мука" → "рис отварной" or "рис белый"
- "виноградные томаты" → "помидоры черри"
- "листья шпината" → "шпинат свежий"
- "авокадо Хасс" → "авокадо"
- "куриная грудка без кожи" → "куриное филе"
- "филе лосося атлантического" → "лосось запечённый"
- "стебли сельдерея" → "сельдерей"
- "зелёные бобы" → "стручковая фасоль"
- "кукурузные зёрна" → "кукуруза"
- "соевые бобы" → "соя"

INCLUDE COOKING METHOD when visible:
- отварной, запечённый, жареный, тушёный, на пару, свежий, консервированный

=== STEP 3: PORTION ESTIMATION (gramsMean field) ===

VISUAL ESTIMATION GUIDE:
- Full dinner plate area ≈ 400-500g total food
- Half plate of protein (meat/fish) ≈ 150-200g
- Half plate of grains/carbs ≈ 150-200g  
- Side portion of vegetables ≈ 100-150g
- Small sauce/dressing ≈ 15-30g
- Palm-sized portion of meat ≈ 100g
- Fist-sized portion of rice/potatoes ≈ 150g
- Thumb-sized portion of butter/oil ≈ 10g

TYPICAL RUSSIAN PORTIONS:
- Суп (bowl) ≈ 300-400g
- Каша (portion) ≈ 200-250g
- Мясное блюдо ≈ 150-200g
- Гарнир (рис, гречка) ≈ 150-200g
- Салат (порция) ≈ 150-200g

=== STEP 4: NUTRITION CALCULATION (CRITICAL MATH) ===

FORMULA: nutrient_per_portion = (nutrient_per_100g × gramsMean) / 100

REFERENCE DATABASE (per 100g):

PROTEINS:
| Food | kcal | protein | fat | carbs |
|------|------|---------|-----|-------|
| Куриное филе запечённое | 165 | 31 | 3.6 | 0 |
| Куриное филе жареное | 195 | 29 | 8 | 0 |
| Куриная грудка отварная | 150 | 30 | 3 | 0 |
| Куриные бёдра с кожей | 211 | 20 | 14 | 0 |
| Лосось запечённый | 208 | 20 | 13 | 0 |
| Лосось жареный | 220 | 22 | 14 | 0 |
| Сёмга слабосолёная | 200 | 22 | 12 | 0 |
| Форель запечённая | 190 | 21 | 11 | 0 |
| Треска запечённая | 90 | 20 | 1 | 0 |
| Тунец консервированный | 132 | 29 | 1 | 0 |
| Говядина тушёная | 232 | 26 | 14 | 0 |
| Говядина жареная | 271 | 26 | 18 | 0 |
| Свинина жареная | 292 | 25 | 21 | 0 |
| Свиная отбивная | 260 | 27 | 16 | 0 |
| Индейка запечённая | 135 | 30 | 1 | 0 |
| Котлета куриная | 190 | 21 | 11 | 3 |
| Котлета говяжья | 220 | 18 | 15 | 5 |
| Яйцо варёное (1 шт = 50г) | 155 | 13 | 11 | 1 |
| Яичница (2 яйца = 100г) | 196 | 13 | 15 | 1 |
| Омлет | 154 | 10 | 11 | 2 |

GRAINS & CARBS:
| Food | kcal | protein | fat | carbs |
|------|------|---------|-----|-------|
| Рис отварной | 130 | 2.7 | 0.3 | 28 |
| Рис бурый | 111 | 2.6 | 0.9 | 23 |
| Гречка отварная | 110 | 4.2 | 1.1 | 21 |
| Макароны отварные | 131 | 5 | 1.1 | 25 |
| Картофельное пюре | 106 | 2 | 4 | 15 |
| Картофель отварной | 82 | 2 | 0.4 | 18 |
| Картофель запечённый | 93 | 2.5 | 0.1 | 21 |
| Картофель жареный | 192 | 3 | 10 | 23 |
| Хлеб белый (1 кус = 30г) | 265 | 9 | 3.2 | 49 |
| Хлеб чёрный | 214 | 7 | 1.4 | 41 |
| Овсянка на воде | 68 | 2.4 | 1.4 | 12 |
| Овсянка на молоке | 102 | 3.2 | 4.1 | 14 |
| Булгур | 83 | 3.5 | 0.2 | 18 |
| Кускус | 112 | 3.8 | 0.2 | 23 |
| Киноа | 120 | 4.4 | 1.9 | 22 |

VEGETABLES:
| Food | kcal | protein | fat | carbs |
|------|------|---------|-----|-------|
| Брокколи отварная | 35 | 3.7 | 0.4 | 4 |
| Стручковая фасоль | 35 | 2 | 0.1 | 8 |
| Морковь отварная | 35 | 0.8 | 0.1 | 8 |
| Морковь сырая | 41 | 0.9 | 0.2 | 10 |
| Огурец свежий | 15 | 0.8 | 0.1 | 3 |
| Помидор свежий | 18 | 0.9 | 0.2 | 4 |
| Помидоры черри | 18 | 0.9 | 0.2 | 4 |
| Болгарский перец | 31 | 1 | 0.3 | 7 |
| Капуста свежая | 25 | 1.3 | 0.1 | 6 |
| Капуста тушёная | 47 | 1.5 | 2 | 6 |
| Цветная капуста | 25 | 2 | 0.3 | 5 |
| Кабачок тушёный | 40 | 1 | 2 | 5 |
| Баклажан тушёный | 50 | 1.2 | 2 | 7 |
| Шпинат свежий | 23 | 2.9 | 0.4 | 4 |
| Салат айсберг | 14 | 0.9 | 0.1 | 3 |
| Свёкла отварная | 49 | 1.7 | 0.1 | 11 |
| Лук репчатый | 40 | 1.1 | 0.1 | 9 |
| Грибы шампиньоны | 22 | 3.1 | 0.3 | 3 |
| Кукуруза консервированная | 96 | 3.4 | 1.2 | 21 |
| Горошек зелёный | 81 | 5.4 | 0.4 | 14 |

DAIRY:
| Food | kcal | protein | fat | carbs |
|------|------|---------|-----|-------|
| Творог 5% | 121 | 17 | 5 | 2 |
| Творог 9% | 169 | 16 | 9 | 2 |
| Сметана 15% | 160 | 2.5 | 15 | 3 |
| Сметана 20% | 206 | 2.8 | 20 | 3 |
| Сыр твёрдый | 364 | 25 | 28 | 2 |
| Сыр моцарелла | 280 | 22 | 22 | 2 |
| Йогурт натуральный | 60 | 5 | 2 | 6 |
| Кефир 2.5% | 53 | 2.9 | 2.5 | 4 |
| Молоко 2.5% | 52 | 2.8 | 2.5 | 5 |

FRUITS:
| Food | kcal | protein | fat | carbs |
|------|------|---------|-----|-------|
| Яблоко | 52 | 0.3 | 0.2 | 14 |
| Банан | 89 | 1.1 | 0.3 | 23 |
| Апельсин | 47 | 0.9 | 0.1 | 12 |
| Виноград | 67 | 0.6 | 0.4 | 17 |
| Клубника | 32 | 0.7 | 0.3 | 8 |
| Авокадо | 160 | 2 | 15 | 9 |

RUSSIAN DISHES (готовые блюда per 100g):
| Food | kcal | protein | fat | carbs |
|------|------|---------|-----|-------|
| Борщ | 49 | 1.8 | 2.2 | 5 |
| Щи | 35 | 1.5 | 1.8 | 3 |
| Солянка | 65 | 4 | 3.5 | 4 |
| Окрошка | 55 | 2 | 2.5 | 6 |
| Плов с курицей | 150 | 10 | 6 | 14 |
| Плов с говядиной | 170 | 12 | 8 | 14 |
| Пельмени | 275 | 12 | 14 | 25 |
| Вареники с картошкой | 220 | 5 | 8 | 33 |
| Вареники с творогом | 195 | 9 | 7 | 24 |
| Голубцы | 90 | 5 | 4 | 8 |
| Оливье | 198 | 5 | 16 | 9 |
| Винегрет | 77 | 1.5 | 4.5 | 8 |
| Сырники | 220 | 11 | 12 | 18 |
| Блины | 233 | 6 | 12 | 26 |
| Каша гречневая с молоком | 118 | 4.5 | 2.5 | 20 |
| Каша овсяная с молоком | 102 | 3.2 | 4.1 | 14 |
| Котлеты по-киевски | 296 | 18 | 21 | 8 |
| Бефстроганов | 163 | 14 | 10 | 5 |

SAUCES & DRESSINGS (per 100g):
| Food | kcal | protein | fat | carbs |
|------|------|---------|-----|-------|
| Майонез | 680 | 1 | 75 | 3 |
| Оливковое масло | 884 | 0 | 100 | 0 |
| Подсолнечное масло | 899 | 0 | 100 | 0 |
| Сливочное масло | 748 | 0.5 | 82 | 0.8 |
| Соевый соус | 53 | 6 | 0 | 6 |
| Кетчуп | 110 | 2 | 1 | 25 |
| Горчица | 143 | 10 | 6 | 9 |

=== STEP 5: OUTPUT FORMAT ===

Return ONLY valid JSON:
{
  "dishName": "Тарелка: куриное филе, рис, овощи",
  "items": [
    {
      "label": "Куриное филе запечённое",
      "kcal": 248,
      "protein": 47,
      "fat": 5,
      "carbs": 0,
      "gramsMean": 150
    },
    {
      "label": "Рис отварной",
      "kcal": 195,
      "protein": 4,
      "fat": 0.5,
      "carbs": 42,
      "gramsMean": 150
    },
    {
      "label": "Брокколи отварная",
      "kcal": 35,
      "protein": 4,
      "fat": 0.4,
      "carbs": 4,
      "gramsMean": 100
    }
  ]
}

REMEMBER:
- kcal/protein/fat/carbs are FOR THE PORTION, not per 100g
- Round all values to integers (no decimals)
- Use Russian names only
- Be realistic with portion sizes`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food photo. Identify all visible ingredients with their portion sizes and calculate nutrition PER PORTION. Use Russian food names.',
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
        max_completion_tokens: 2000,
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
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.logger.debug(`[OpenAiAnalyzer] Using model: ${model} for text analysis`);

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a professional nutritionist. Analyze food descriptions and return JSON with nutritional data.

=== RULES ===

1. DISH NAMING: Use Russian names. Recognize specific dishes (Борщ, Плов, Оливье).

2. INGREDIENT NAMING: Use common Russian names.
   - BANNED: "рисовая мука" → "рис отварной"
   - BANNED: "листья шпината" → "шпинат"
   - Include cooking method: отварной, жареный, запечённый

3. CALCULATE NUTRITION FOR THE PORTION, not per 100g.
   Formula: (per100g × gramsMean) / 100

REFERENCE (per 100g):
| Food | kcal | protein | fat | carbs |
|------|------|---------|-----|-------|
| Рис отварной | 130 | 2.7 | 0.3 | 28 |
| Гречка отварная | 110 | 4.2 | 1.1 | 21 |
| Куриное филе | 165 | 31 | 3.6 | 0 |
| Лосось | 208 | 20 | 13 | 0 |
| Говядина | 232 | 26 | 14 | 0 |
| Борщ | 49 | 1.8 | 2.2 | 5 |
| Плов | 150 | 10 | 6 | 14 |
| Пельмени | 275 | 12 | 14 | 25 |
| Оливье | 198 | 5 | 16 | 9 |

Return JSON only:
{
  "dishName": "Название блюда",
  "items": [
    {"label": "Ингредиент", "kcal": 100, "protein": 10, "fat": 5, "carbs": 15, "gramsMean": 150}
  ]
}`,
          },
          {
            role: 'user',
            content: `Проанализируй: "${description}"`,
          },
        ],
        max_completion_tokens: 1500,
        temperature: 0.2,
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
