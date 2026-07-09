import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyLimitGuard } from '../limits/daily-limit.guard';
import { DailyLimit } from '../limits/daily-limit.decorator';
import { FridgeService, SupportedLocale } from './fridge.service';
import { FridgeRecipesDto } from './dto/fridge-recipes.dto';

/**
 * "Photograph your fridge → cook from what you have."
 * Lives under /food/fridge so it reuses the food module's wiring & guards.
 */
@ApiTags('Fridge')
@Controller('food/fridge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FridgeController {
  constructor(private readonly fridgeService: FridgeService) {}

  /**
   * Recognize the products in a fridge/pantry photo.
   * Has its OWN daily budget (free = 1/day via FREE_DAILY_FRIDGE_SCANS), separate
   * from meal analysis — so a fridge scan never eats a meal-analysis credit.
   */
  @Post('scan')
  @UseGuards(DailyLimitGuard)
  @DailyLimit({ resource: 'fridge' })
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Detect food products in a fridge/pantry photo' })
  async scan(@UploadedFile() file: any, @Body() body: { locale?: SupportedLocale }, @Request() req: any) {
    if (!file?.buffer) {
      throw new BadRequestException('No image provided');
    }
    if (file.mimetype && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Uploaded file is not an image');
    }
    const base64 = Buffer.isBuffer(file.buffer) ? file.buffer.toString('base64') : Buffer.from(file.buffer).toString('base64');
    return this.fridgeService.scanFridge(base64, body?.locale || 'en');
  }

  /**
   * Suggest recipes cookable from the confirmed ingredient list.
   */
  @Post('recipes')
  @ApiOperation({ summary: 'Suggest recipes from available ingredients' })
  async recipes(@Body() body: FridgeRecipesDto, @Request() req: any) {
    return this.fridgeService.getRecipes({
      ingredients: body.ingredients || [],
      userId: req.user.id,
      locale: body.locale || 'en',
    });
  }
}
