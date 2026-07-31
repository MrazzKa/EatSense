import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyLimitGuard, dailyLimitKey } from '../limits/daily-limit.guard';
import { DailyLimit } from '../limits/daily-limit.decorator';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
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
  constructor(
    private readonly fridgeService: FridgeService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /** Pro unlocks the full history archive and unlimited favourites. */
  private async isPro(userId: string): Promise<boolean> {
    const sub = await this.prisma.userSubscription
      .findFirst({
        where: { userId, status: 'ACTIVE', endDate: { gt: new Date() } },
        select: { id: true },
      })
      .catch(() => null);
    return !!sub;
  }

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
    // The guard already reserved a scan before we got here. EVERY path out of
    // this method that does not hand the user a result must give it back — a
    // free user has ONE attempt per day, and losing it to a malformed upload or
    // an OpenAI outage locks them out until midnight for nothing.
    const refund = () => this.redis.decr(dailyLimitKey('fridge', req.user.id)).catch(() => {});

    try {
      if (!file?.buffer) {
        throw new BadRequestException('No image provided');
      }
      if (file.mimetype && !file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Uploaded file is not an image');
      }
      const base64 = Buffer.isBuffer(file.buffer)
        ? file.buffer.toString('base64')
        : Buffer.from(file.buffer).toString('base64');

      const result = await this.fridgeService.scanFridge(base64, body?.locale || 'en', req.user.id);

      // Recognized nothing at all → there is no result to show, so this did not
      // cost the user a scan either.
      if (!result?.ingredients?.length) {
        await refund();
      }
      return result;
    } catch (err) {
      await refund();
      throw err;
    }
  }

  /**
   * Suggest recipes cookable from the confirmed ingredient list.
   *
   * Rate-limited on its own budget: ingredients come straight from the body, so
   * without a cap this endpoint could be looped without ever taking a photo.
   */
  @Post('recipes')
  @UseGuards(DailyLimitGuard)
  @DailyLimit({ resource: 'fridge_recipes' })
  @ApiOperation({ summary: 'Suggest recipes from available ingredients' })
  async recipes(@Body() body: FridgeRecipesDto, @Request() req: any) {
    const userId = req.user.id;

    // The edits the user made to the detected chips are correction data for the
    // vision model — capture them before they are overwritten.
    if (body.scanId) {
      await this.fridgeService.recordIngredientEdits(userId, body.scanId, body.ingredients || []);
    }

    try {
      return await this.fridgeService.getRecipes({
        ingredients: body.ingredients || [],
        userId,
        locale: body.locale || 'en',
        scanId: body.scanId,
        excludeTitles: body.excludeTitles,
      });
    } catch (err) {
      await this.redis.decr(dailyLimitKey('fridge_recipes', userId)).catch(() => {});
      throw err;
    }
  }

  // ── History & favourites ───────────────────────────────────────────────────

  @Get('history')
  @ApiOperation({ summary: 'Past fridge scans with their recipes (free tier sees the most recent few)' })
  async history(@Request() req: any, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const userId = req.user.id;
    return this.fridgeService.getHistory(
      userId,
      await this.isPro(userId),
      limit ? parseInt(limit, 10) || 30 : 30,
      offset ? parseInt(offset, 10) || 0 : 0,
    );
  }

  @Get('history/:id')
  @ApiOperation({ summary: 'A single past scan with its recipes' })
  async scanDetail(@Param('id') id: string, @Request() req: any) {
    return this.fridgeService.getScan(req.user.id, id);
  }

  @Delete('history/:id')
  @ApiOperation({ summary: 'Delete a past scan and its recipes' })
  async removeScan(@Param('id') id: string, @Request() req: any) {
    return this.fridgeService.deleteScan(req.user.id, id);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Saved favourite recipes' })
  async favorites(@Request() req: any) {
    const userId = req.user.id;
    return this.fridgeService.getFavorites(userId, await this.isPro(userId));
  }

  @Post('recipes/:id/favorite')
  @ApiOperation({ summary: 'Toggle a recipe as favourite' })
  async favorite(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    return this.fridgeService.toggleFavorite(userId, id, await this.isPro(userId));
  }

  @Post('recipes/:id/cook')
  @ApiOperation({ summary: 'Mark a recipe as cooked and log it to the diary' })
  async cook(@Param('id') id: string, @Body() body: { mealType?: string }, @Request() req: any) {
    return this.fridgeService.markCooked(req.user.id, id, body?.mealType);
  }
}
