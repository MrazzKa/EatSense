import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { SuggestionsService, SuggestedFoodItem } from './suggestions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('suggestions')
@UseGuards(JwtAuthGuard)
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get('foods')
  async getSuggestedFoods(@Req() req: any): Promise<SuggestedFoodItem[]> {
    const userId = req.user.id;
    return this.suggestionsService.getSuggestedFoodsForUser(userId);
  }
}

