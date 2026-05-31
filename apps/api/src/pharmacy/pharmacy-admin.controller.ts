import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PharmacyService } from './pharmacy.service';

/**
 * Admin management of pharmacy access codes (the registry patients link to by
 * code). Auth mirrors ExpertsAdminController: constant-time ADMIN_SECRET header.
 */
@Controller('admin/pharmacy-codes')
export class PharmacyAdminController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  private validateAdmin(adminSecret: string) {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) throw new UnauthorizedException('Invalid admin credentials');
    const a = Buffer.from(String(adminSecret || ''));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
  }

  @Get()
  async list(@Headers('x-admin-secret') adminSecret: string) {
    this.validateAdmin(adminSecret);
    return this.pharmacyService.adminListPharmacyCodes();
  }

  @Post()
  async create(
    @Headers('x-admin-secret') adminSecret: string,
    @Body() body: {
      pharmacyName?: string;
      pharmacyEmail?: string;
      pharmacyAddress?: string;
      pharmacyPhone?: string;
      pharmacyWebsite?: string;
      language?: string;
      code?: string;
    },
  ) {
    this.validateAdmin(adminSecret);
    if (!body?.pharmacyName) throw new BadRequestException('pharmacyName is required');
    try {
      return await this.pharmacyService.adminCreatePharmacyCode({
        pharmacyName: body.pharmacyName,
        pharmacyEmail: body.pharmacyEmail,
        pharmacyAddress: body.pharmacyAddress,
        pharmacyPhone: body.pharmacyPhone,
        pharmacyWebsite: body.pharmacyWebsite,
        language: body.language,
        code: body.code,
      });
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Failed to create pharmacy code');
    }
  }

  @Post(':id/active')
  async setActive(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
    @Body() body: { isActive?: boolean },
  ) {
    this.validateAdmin(adminSecret);
    return this.pharmacyService.adminSetPharmacyCodeActive(id, body?.isActive !== false);
  }
}
