import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenFoodFactsService } from './openfoodfacts.service';

/**
 * Module for OpenFoodFacts integration.
 * 
 * This module provides barcode-based product lookup functionality.
 * Currently scaffolded for future use - not yet integrated into analysis pipeline.
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  providers: [OpenFoodFactsService],
  exports: [OpenFoodFactsService],
})
export class OpenFoodFactsModule {}

