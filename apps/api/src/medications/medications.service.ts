import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { DateTime } from 'luxon';

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * P3.1: Create medication schedule
   */
  async create(userId: string, dto: CreateMedicationDto) {
    // Validate times format
    this.validateTimes(dto.times);

    // Validate daysOfWeek if provided
    if (dto.daysOfWeek) {
      this.validateDaysOfWeek(dto.daysOfWeek);
    }

    const medication = await this.prisma.medicationSchedule.create({
      data: {
        userId,
        name: dto.name,
        dosage: dto.dosage,
        frequency: dto.frequency,
        times: dto.times,
        daysOfWeek: dto.daysOfWeek || null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
        reminderEnabled: dto.reminderEnabled ?? true,
        isActive: true,
      },
    });

    this.logger.log(`[MedicationsService] Created medication schedule id=${medication.id} for userId=${userId}`);
    return medication;
  }

  /**
   * P3.1: Get all medications for user
   */
  async findAll(userId: string, includeInactive: boolean = false) {
    const where: any = { userId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.medicationSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * P3.1: Get medication by ID
   */
  async findOne(userId: string, id: string) {
    const medication = await this.prisma.medicationSchedule.findFirst({
      where: { id, userId },
    });

    if (!medication) {
      throw new NotFoundException('Medication schedule not found');
    }

    return medication;
  }

  /**
   * P3.1: Update medication schedule
   */
  async update(userId: string, id: string, dto: UpdateMedicationDto) {
    const existing = await this.findOne(userId, id);

    if (dto.times) {
      this.validateTimes(dto.times);
    }

    if (dto.daysOfWeek !== undefined) {
      if (dto.daysOfWeek === null || dto.daysOfWeek.length === 0) {
        // Allow null/empty to mean every day
      } else {
        this.validateDaysOfWeek(dto.daysOfWeek);
      }
    }

    const updated = await this.prisma.medicationSchedule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.dosage !== undefined && { dosage: dto.dosage }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.times !== undefined && { times: dto.times }),
        ...(dto.daysOfWeek !== undefined && { daysOfWeek: dto.daysOfWeek }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.reminderEnabled !== undefined && { reminderEnabled: dto.reminderEnabled }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`[MedicationsService] Updated medication schedule id=${id} for userId=${userId}`);
    return updated;
  }

  /**
   * P3.1: Delete medication schedule
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Verify ownership

    await this.prisma.medicationSchedule.delete({
      where: { id },
    });

    this.logger.log(`[MedicationsService] Deleted medication schedule id=${id} for userId=${userId}`);
  }

  /**
   * P3.1: Get medications due for today
   */
  async getDueToday(userId: string, timezone: string = 'UTC') {
    const now = DateTime.now().setZone(timezone);
    const today = now.weekday - 1; // Convert to 0-6 (Monday=0, Sunday=6)
    const currentTime = now.toFormat('HH:mm');

    const medications = await this.prisma.medicationSchedule.findMany({
      where: {
        userId,
        isActive: true,
        reminderEnabled: true,
        startDate: { lte: now.toJSDate() },
        OR: [
          { endDate: null },
          { endDate: { gte: now.toJSDate() } },
        ],
      },
    });

    // Filter medications that are due today
    const dueToday = medications.filter((med) => {
      // Check if medication applies to today
      if (med.daysOfWeek && med.daysOfWeek.length > 0) {
        if (!med.daysOfWeek.includes(today)) {
          return false;
        }
      }

      // Check if any time has passed today
      return med.times.some((time) => {
        const [hour, minute] = time.split(':').map(Number);
        const medTime = now.set({ hour, minute, second: 0, millisecond: 0 });
        return medTime <= now;
      });
    });

    return dueToday;
  }

  /**
   * P3.1: Validate time format (HH:mm)
   */
  private validateTimes(times: string[]) {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    for (const time of times) {
      if (!timeRegex.test(time)) {
        throw new BadRequestException(`Invalid time format: ${time}. Expected HH:mm format.`);
      }
    }
  }

  /**
   * P3.1: Validate days of week (0-6)
   */
  private validateDaysOfWeek(days: number[]) {
    for (const day of days) {
      if (day < 0 || day > 6) {
        throw new BadRequestException(`Invalid day of week: ${day}. Expected 0-6 (Sunday-Saturday).`);
      }
    }
  }
}

