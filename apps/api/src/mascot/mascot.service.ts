import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { MascotType } from '@prisma/client';

const XP_THRESHOLDS = [0, 100, 300, 600, 1000];
const MAX_LEVEL = XP_THRESHOLDS.length; // 5
const MAX_XP = XP_THRESHOLDS[MAX_LEVEL - 1]; // 1000

function calculateLevel(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getNextLevelXp(level: number): number | null {
  if (level >= MAX_LEVEL) return null; // Max level reached
  return XP_THRESHOLDS[level] ?? null;
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
      nextLevelXp: getNextLevelXp(mascot.level),
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
      nextLevelXp: getNextLevelXp(mascot.level),
    };
  }

  async updateMascot(userId: string, data: { mascotType?: MascotType; name?: string }) {
    const mascot = await this.prisma.userMascot.findUnique({
      where: { userId },
    });
    if (!mascot) {
      throw new NotFoundException('Mascot not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.mascotType !== undefined) updateData.mascotType = data.mascotType;

    if (Object.keys(updateData).length === 0) {
      return { ...mascot, size: getMascotSize(mascot.level), nextLevelXp: getNextLevelXp(mascot.level) };
    }

    const updated = await this.prisma.userMascot.update({
      where: { userId },
      data: updateData,
    });
    return {
      ...updated,
      size: getMascotSize(updated.level),
      nextLevelXp: getNextLevelXp(updated.level),
    };
  }

  async deleteMascot(userId: string) {
    const mascot = await this.prisma.userMascot.findUnique({
      where: { userId },
    });
    if (!mascot) {
      throw new NotFoundException('Mascot not found');
    }

    await this.prisma.userMascot.delete({
      where: { userId },
    });

    return { deleted: true };
  }

  async addXp(userId: string, amount: number) {
    const mascot = await this.prisma.userMascot.findUnique({
      where: { userId },
    });
    if (!mascot) {
      throw new NotFoundException('Mascot not found');
    }

    // Cap XP at max level threshold to prevent unbounded growth
    const newXp = Math.min(mascot.xp + amount, MAX_XP);
    const newLevel = calculateLevel(newXp);

    // Skip DB update if already at max and XP unchanged
    if (newXp === mascot.xp && newLevel === mascot.level) {
      return {
        ...mascot,
        size: getMascotSize(mascot.level),
        nextLevelXp: getNextLevelXp(mascot.level),
        leveledUp: false,
      };
    }

    const updated = await this.prisma.userMascot.update({
      where: { userId },
      data: { xp: newXp, level: newLevel },
    });

    return {
      ...updated,
      size: getMascotSize(updated.level),
      nextLevelXp: getNextLevelXp(updated.level),
      leveledUp: newLevel > mascot.level,
    };
  }
}
