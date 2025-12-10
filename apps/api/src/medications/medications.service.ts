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
   * P3.1: Get medications due for today (using new Medication model)
   */
  async getDueToday(userId: string, timezone: string = 'UTC') {
    const now = DateTime.now().setZone(timezone);
    const currentTime = now.toFormat('HH:mm');

    const medications = await this.prisma.medication.findMany({
      where: {
        userId,
        isActive: true,
        startDate: { lte: now.toJSDate() },
        OR: [
          { endDate: null },
          { endDate: { gte: now.toJSDate() } },
        ],
      },
      include: { doses: true },
    });

    // Filter medications that are due today
    const dueToday = medications.filter((med) => {
      // Check if any dose time has passed today
      return med.doses.some((dose) => {
        const [hour, minute] = dose.timeOfDay.split(':').map(Number);
        const medTime = now.set({ hour, minute, second: 0, millisecond: 0 });
        return medTime <= now;
      });
    });

    return dueToday;
  }

  // ========== New Medication Model Methods (with MedicationDose) ==========

  /**
   * Find all medications for user (new model)
   */
  async findAllForUser(userId: string) {
    return this.prisma.medication.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { doses: true },
    });
  }

  /**
   * Find one medication for user (new model)
   */
  async findOneForUser(userId: string, id: string) {
    const medication = await this.prisma.medication.findFirst({
      where: { id, userId },
      include: { doses: true },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    return medication;
  }

  /**
   * Create medication for user (new model)
   */
  async createForUser(userId: string, dto: CreateMedicationDto) {
    const {
      name,
      dosage,
      instructions,
      startDate,
      endDate,
      timezone,
      isActive,
      doses,
    } = dto;

    return this.prisma.medication.create({
      data: {
        userId,
        name,
        dosage,
        instructions,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        timezone: timezone || 'UTC',
        isActive: isActive ?? true,
        doses: {
          create: doses.map((dose) => ({
            timeOfDay: dose.timeOfDay,
            beforeMeal: !!dose.beforeMeal,
            afterMeal: !!dose.afterMeal,
          })),
        },
      },
      include: { doses: true },
    });
  }

  /**
   * Update medication for user (new model)
   */
  async updateForUser(userId: string, id: string, dto: UpdateMedicationDto) {
    const existing = await this.findOneForUser(userId, id);

    const { doses, ...rest } = dto;

    // Обновляем сам Medication
    const updated = await this.prisma.medication.update({
      where: { id: existing.id },
      data: {
        ...('name' in rest && rest.name !== undefined ? { name: rest.name } : {}),
        ...('dosage' in rest && rest.dosage !== undefined ? { dosage: rest.dosage } : {}),
        ...('instructions' in rest && rest.instructions !== undefined ? { instructions: rest.instructions } : {}),
        ...('startDate' in rest && rest.startDate
          ? { startDate: new Date(rest.startDate) }
          : {}),
        ...('endDate' in rest && rest.endDate !== undefined
          ? { endDate: rest.endDate ? new Date(rest.endDate) : null }
          : {}),
        ...('timezone' in rest && rest.timezone
          ? { timezone: rest.timezone }
          : {}),
        ...('isActive' in rest && typeof rest.isActive === 'boolean'
          ? { isActive: rest.isActive }
          : {}),
      },
      include: { doses: true },
    });

    // Если передали doses — пере-создаём их
    if (doses) {
      await this.prisma.medicationDose.deleteMany({
        where: { medicationId: existing.id },
      });

      await this.prisma.medicationDose.createMany({
        data: doses.map((dose) => ({
          medicationId: existing.id,
          timeOfDay: dose.timeOfDay,
          beforeMeal: !!dose.beforeMeal,
          afterMeal: !!dose.afterMeal,
        })),
      });
    }

    return this.findOneForUser(userId, id);
  }

  /**
   * Remove medication for user (soft delete via isActive=false)
   */
  async removeForUser(userId: string, id: string) {
    const existing = await this.findOneForUser(userId, id);

    // Soft delete через isActive=false
    return this.prisma.medication.update({
      where: { id: existing.id },
      data: { isActive: false },
      include: { doses: true },
    });
  }
}

