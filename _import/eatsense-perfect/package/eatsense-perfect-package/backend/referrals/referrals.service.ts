import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  private generateCode(name: string): string {
    const prefix = (name || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'X');
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    return prefix + suffix;
  }

  async getOrCreateCode(userId: string) {
    let referralCode = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (referralCode) return referralCode;

    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { firstName: true },
    });

    let code: string;
    let attempts = 0;

    do {
      code = this.generateCode(userProfile?.firstName || 'USER');
      const existing = await this.prisma.referralCode.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) code = 'REF' + userId.slice(-6).toUpperCase();

    return this.prisma.referralCode.create({ data: { userId, code } });
  }

  async getStats(userId: string) {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { userId },
      include: {
        referrals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            referred: {
              select: { id: true, userProfile: { select: { firstName: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    if (!referralCode) {
      const newCode = await this.getOrCreateCode(userId);
      return { code: newCode.code, invitedCount: 0, earnedDays: 0, referrals: [] };
    }

    return {
      code: referralCode.code,
      invitedCount: referralCode.usageCount,
      earnedDays: referralCode.totalBonusDays,
      referrals: referralCode.referrals.map((r) => ({
        id: r.id,
        date: r.createdAt,
        bonusDays: r.referrerBonus,
        friend: { firstName: r.referred.userProfile?.firstName || 'Friend', avatarUrl: r.referred.userProfile?.avatarUrl },
      })),
    };
  }

  async applyCode(referredUserId: string, code: string) {
    const referralCode = await this.prisma.referralCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!referralCode) throw new NotFoundException('Referral code not found');
    if (referralCode.userId === referredUserId) throw new BadRequestException('Cannot use your own referral code');

    const existingReferral = await this.prisma.referral.findUnique({ where: { referredId: referredUserId } });
    if (existingReferral) throw new BadRequestException('You have already used a referral code');

    const BONUS_DAYS = 7;

    await this.prisma.referral.create({
      data: {
        referralCodeId: referralCode.id,
        referrerId: referralCode.userId,
        referredId: referredUserId,
        referrerBonus: BONUS_DAYS,
        referredBonus: BONUS_DAYS,
        status: 'completed',
      },
    });

    await this.prisma.referralCode.update({
      where: { id: referralCode.id },
      data: { usageCount: { increment: 1 }, totalBonusDays: { increment: BONUS_DAYS } },
    });

    return { success: true, message: 'You and your friend both received ' + BONUS_DAYS + ' days of PRO!', bonusDays: BONUS_DAYS };
  }

  async validateCode(code: string, userId?: string) {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code: code.toUpperCase() },
      include: { user: { select: { userProfile: { select: { firstName: true } } } } },
    });

    if (!referralCode) return { valid: false, message: 'Code not found' };
    if (userId && referralCode.userId === userId) return { valid: false, message: 'Cannot use your own code' };

    return { valid: true, referrerName: referralCode.user.userProfile?.firstName || 'A friend', bonusDays: 7 };
  }
}
