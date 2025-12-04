import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PortionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get portion snapshots for a food
   */
  async getPortionSnapshots(foodId: string, basePortionG: number): Promise<Array<{ multiplier: number; grams: number }>> {
    // Get serving size from FoodPortion if available
    const portions = await this.prisma.foodPortion.findMany({
      where: { foodId },
      orderBy: { gramWeight: 'desc' },
      take: 1,
    });

    const servingSize = portions.length > 0 ? portions[0].gramWeight : basePortionG || 100;

    return [
      { multiplier: 0.25, grams: Math.round(servingSize * 0.25) },
      { multiplier: 0.5, grams: Math.round(servingSize * 0.5) },
      { multiplier: 1, grams: Math.round(servingSize) },
      { multiplier: 1.5, grams: Math.round(servingSize * 1.5) },
      { multiplier: 2, grams: Math.round(servingSize * 2) },
    ];
  }

  /**
   * Select appropriate portion size
   */
  selectPortion(estPortionG: number | null, foodPortions: any[]): number {
    if (estPortionG && estPortionG > 0) {
      return estPortionG;
    }

    // Find serving size
    const serving = foodPortions.find(p => 
      p.measureUnit?.toLowerCase().includes('serving') ||
      p.measureUnit?.toLowerCase().includes('cup')
    );

    if (serving) {
      return serving.gramWeight;
    }

    // Default to 100g
    return 100;
  }
}

