import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DietProgramsService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters?: { category?: string }) {
        if (!this.prisma.dietProgram) {
            return [];
        }

        const where: any = { isActive: true };
        if (filters?.category) where.category = filters.category;

        return this.prisma.dietProgram.findMany({
            where,
            orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
        });
    }

    async findById(id: string) {
        if (!this.prisma.dietProgram) {
            return null;
        }

        return this.prisma.dietProgram.findUnique({
            where: { id },
            include: {
                days: {
                    orderBy: { dayNumber: 'asc' },
                    include: {
                        meals: { orderBy: { sortOrder: 'asc' } },
                    },
                },
            },
        });
    }

    async startProgram(userId: string, programId: string) {
        if (!this.prisma.dietProgram || !this.prisma.userDietProgram) {
            throw new NotFoundException('Feature not available');
        }

        const program = await this.prisma.dietProgram.findUnique({
            where: { id: programId },
        });

        if (!program) throw new NotFoundException('Program not found');

        const existing = await this.prisma.userDietProgram.findUnique({
            where: { userId_programId: { userId, programId } },
        });

        if (existing && existing.status === 'active') {
            throw new ConflictException('Already enrolled in this program');
        }

        if (existing) {
            return this.prisma.userDietProgram.update({
                where: { id: existing.id },
                data: { status: 'active', currentDay: 1, startedAt: new Date() },
                include: { program: true },
            });
        }

        return this.prisma.userDietProgram.create({
            data: { userId, programId, status: 'active', currentDay: 1 },
            include: { program: true },
        });
    }

    async getProgress(userId: string, programId: string) {
        if (!this.prisma.userDietProgram) {
            return null;
        }

        const progress = await this.prisma.userDietProgram.findUnique({
            where: { userId_programId: { userId, programId } },
            include: {
                program: {
                    include: {
                        days: {
                            orderBy: { dayNumber: 'asc' },
                            include: { meals: { orderBy: { sortOrder: 'asc' } } },
                        },
                    },
                },
            },
        });

        return progress;
    }

    async completeDay(userId: string, programId: string) {
        if (!this.prisma.userDietProgram) {
            throw new NotFoundException('Feature not available');
        }

        const progress = await this.prisma.userDietProgram.findUnique({
            where: { userId_programId: { userId, programId } },
            include: { program: true },
        });

        if (!progress) throw new NotFoundException('Progress not found');

        const newDay = progress.currentDay + 1;
        const isCompleted = newDay > progress.program.duration;

        return this.prisma.userDietProgram.update({
            where: { id: progress.id },
            data: {
                currentDay: isCompleted ? progress.program.duration : newDay,
                status: isCompleted ? 'completed' : 'active',
                completedAt: isCompleted ? new Date() : null,
            },
            include: { program: true },
        });
    }
}
