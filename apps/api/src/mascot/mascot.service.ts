import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { MascotType } from '@prisma/client';

const XP_THRESHOLDS = [0, 100, 300, 600, 1000];

function calculateLevel(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getMascotSize(level: number): 'small' | 'medium' | 'large' {
  if (level <= 2) return 'small';
  if (level <= 4) return 'medium';
  return 'large';
}

@Injectable()
export class MascotService {
  constructor(private readonly prisma: PrismaService) {}

  async getMascot(userId: string) {
    const mascot = await this.prisma.userMascot.findUnique({
      where: { userId },
    });
    if (!mascot) return null;
    return {
      ...mascot,
      size: getMascotSize(mascot.level),
      nextLevelXp: XP_THRESHOLDS[mascot.level] || null,
    };
  }

  async createMascot(userId: string, mascotType: MascotType, name: string) {
    const existing = await this.prisma.userMascot.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('User already has a mascot');
    }

    const mascot = await this.prisma.userMascot.create({
      data: { userId, mascotType, name },
    });
    return {
      ...mascot,
      size: getMascotSize(mascot.level),
      nextLevelXp: XP_THRESHOLDS[1],
    };
  }

  async addXp(userId: string, amount: number) {
    const mascot = await this.prisma.userMascot.findUnique({
      where: { userId },
    });
    if (!mascot) {
      throw new NotFoundException('Mascot not found');
    }

    const newXp = mascot.xp + amount;
    const newLevel = calculateLevel(newXp);

    const updated = await this.prisma.userMascot.update({
      where: { userId },
      data: { xp: newXp, level: newLevel },
    });

    return {
      ...updated,
      size: getMascotSize(updated.level),
      nextLevelXp: XP_THRESHOLDS[updated.level] || null,
      leveledUp: newLevel > mascot.level,
    };
  }
}
