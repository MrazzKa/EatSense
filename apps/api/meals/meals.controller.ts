import { Controller, Get, Post, Body, UseGuards, Request, Put, Delete, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MealsService } from './meals.service';
import { CreateMealDto, UpdateMealItemDto, EditMealItemsDto } from './dto';

@ApiTags('Meals')
@Controller('meals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user meals' })
  @ApiResponse({ status: 200, description: 'Meals retrieved successfully' })
  async getMeals(@Request() req: any, @Query('date') date?: string) {
    return this.mealsService.getMeals(req.user.id, date);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new meal' })
  @ApiResponse({ status: 201, description: 'Meal created successfully' })
  async createMeal(
    @Body() createMealDto: CreateMealDto,
    @Request() req: any,
  ) {
    return this.mealsService.createMeal(req.user.id, createMealDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a meal' })
  @ApiResponse({ status: 200, description: 'Meal updated successfully' })
  async updateMeal(
    @Param('id') id: string,
    @Body() updateMealDto: Partial<CreateMealDto>,
    @Request() req: any,
  ) {
    return this.mealsService.updateMeal(req.user.id, id, updateMealDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meal' })
  @ApiResponse({ status: 200, description: 'Meal deleted successfully' })
  async deleteMeal(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.mealsService.deleteMeal(req.user.id, id);
  }

  @Post(':id/edit-items')
  @ApiOperation({ summary: 'Replace all items of a meal (legacy meals without analysisId)' })
  @ApiResponse({ status: 200, description: 'Meal items replaced and totals recomputed' })
  async editMealItems(
    @Param('id') mealId: string,
    @Body() dto: EditMealItemsDto,
    @Request() req: any,
  ) {
    return this.mealsService.editMealItems(req.user.id, mealId, dto);
  }

  @Put(':id/items/:itemId')
  @ApiOperation({ summary: 'Update a meal item (manual correction)' })
  @ApiResponse({ status: 200, description: 'Meal item updated successfully' })
  async updateMealItem(
    @Param('id') mealId: string,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateMealItemDto,
    @Request() req: any,
  ) {
    return this.mealsService.updateMealItem(req.user.id, mealId, itemId, updateItemDto);
  }
}
