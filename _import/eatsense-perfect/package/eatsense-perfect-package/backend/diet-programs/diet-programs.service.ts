import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DietProgramsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { category?: string; featured?: boolean }) {
    const where: any = { isActive: true };
    if (filters?.category) where.category = filters.category;
    if (filters?.featured) where.isFeatured = true;

    return this.prisma.dietProgram.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async findByIdOrSlug(idOrSlug: string) {
    const program = await this.prisma.dietProgram.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isActive: true },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          take: 1,
          include: { meals: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  async getProgramDay(programId: string, dayNumber: number) {
    const day = await this.prisma.dietProgramDay.findFirst({
      where: { programId, dayNumber },
      include: { meals: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!day) throw new NotFoundException('Day not found');
    return day;
  }

  async getUserPrograms(userId: string) {
    return this.prisma.userDietProgram.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: { program: true },
    });
  }

  async startProgram(userId: string, programId: string) {
    const program = await this.prisma.dietProgram.findUnique({ where: { id: programId } });
    if (!program || !program.isActive) throw new NotFoundException('Program not found');

    const existing = await this.prisma.userDietProgram.findUnique({
      where: { userId_programId: { userId, programId } },
    });

    if (existing) {
      if (existing.status === 'active') throw new BadRequestException('Already enrolled');
      return this.prisma.userDietProgram.update({
        where: { id: existing.id },
        data: { status: 'active', currentDay: 1, startedAt: new Date(), completedAt: null },
        include: { program: true },
      });
    }

    return this.prisma.userDietProgram.create({
      data: { userId, programId, status: 'active', currentDay: 1 },
      include: { program: true },
    });
  }

  async updateProgress(userId: string, programId: string, day: number) {
    const userProgram = await this.prisma.userDietProgram.findUnique({
      where: { userId_programId: { userId, programId } },
      include: { program: true },
    });

    if (!userProgram || userProgram.status !== 'active') {
      throw new NotFoundException('Active program not found');
    }

    const isCompleted = day >= userProgram.program.duration;

    return this.prisma.userDietProgram.update({
      where: { id: userProgram.id },
      data: {
        currentDay: day,
        status: isCompleted ? 'completed' : 'active',
        completedAt: isCompleted ? new Date() : null,
      },
      include: { program: true },
    });
  }
}
