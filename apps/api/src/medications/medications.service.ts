import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { DateTime } from 'luxon';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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

    let medications;
    try {
      medications = await this.prisma.medication.findMany({
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
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2021') {
        throw new ServiceUnavailableException('Medications feature is not initialized (table missing).');
      }
      throw err;
    }

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
    try {
      return await this.prisma.medication.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
        include: { doses: true },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2021') {
        throw new ServiceUnavailableException('Medications feature is not initialized (table missing).');
      }
      throw err;
    }
  }

  /**
   * Find one medication for user (new model)
   */
  async findOneForUser(userId: string, id: string) {
    let medication;
    try {
      medication = await this.prisma.medication.findFirst({
        where: { id, userId },
        include: { doses: true },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2021') {
        throw new ServiceUnavailableException('Medications feature is not initialized (table missing).');
      }
      throw err;
    }

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    return medication;
  }

  /**
   * Calculate remaining stock based on quantity, doses, and days passed
   */
  private calculateRemainingStock(
    quantity: number | null | undefined,
    dosesCount: number,
    startDate: Date,
    endDate: Date | null,
  ): number | null {
    if (!quantity || quantity <= 0) {
      return null;
    }

    const now = DateTime.now();
    const start = DateTime.fromJSDate(startDate);
    const end = endDate ? DateTime.fromJSDate(endDate) : null;

    // Calculate days passed since start
    const daysPassed = Math.max(0, Math.floor(now.diff(start, 'days').days));
    
    // If end date exists and has passed, medication is finished
    if (end && now > end) {
      return 0;
    }

    // Calculate total doses taken (doses per day * days passed)
    const totalDosesTaken = dosesCount * daysPassed;
    const remaining = Math.max(0, quantity - totalDosesTaken);

    return remaining;
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
      quantity,
      remainingStock,
      lowStockThreshold,
    } = dto;

    const startDateObj = new Date(startDate);
    const endDateObj = endDate ? new Date(endDate) : null;

    // Calculate remaining stock if quantity is provided
    const calculatedRemainingStock = quantity
      ? this.calculateRemainingStock(quantity, doses.length, startDateObj, endDateObj)
      : remainingStock || null;

    try {
      return await this.prisma.medication.create({
        data: {
          userId,
          name,
          dosage,
          instructions,
          startDate: startDateObj,
          endDate: endDateObj,
          timezone: timezone || 'UTC',
          isActive: isActive ?? true,
          quantity: quantity || null,
          remainingStock: calculatedRemainingStock,
          lowStockThreshold: lowStockThreshold || 7,
          lastStockUpdate: calculatedRemainingStock !== null ? new Date() : null,
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
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
        throw new ServiceUnavailableException('Medications feature is not initialized (table missing).');
      }
      throw err;
    }
  }

  /**
   * Update medication for user (new model)
   */
  async updateForUser(userId: string, id: string, dto: UpdateMedicationDto) {
    const existing = await this.findOneForUser(userId, id);

    const { doses, quantity, remainingStock, lowStockThreshold, ...rest } = dto;

    // Determine final doses count (use new doses if provided, otherwise existing)
    const finalDosesCount = doses ? doses.length : existing.doses.length;
    const finalStartDate = rest.startDate ? new Date(rest.startDate) : existing.startDate;
    const finalEndDate = rest.endDate !== undefined 
      ? (rest.endDate ? new Date(rest.endDate) : null)
      : existing.endDate;
    const finalQuantity = quantity !== undefined ? quantity : existing.quantity;

    // Recalculate remaining stock if quantity or doses changed
    let calculatedRemainingStock = remainingStock;
    if (finalQuantity && (quantity !== undefined || doses !== undefined || rest.startDate)) {
      calculatedRemainingStock = this.calculateRemainingStock(
        finalQuantity,
        finalDosesCount,
        finalStartDate,
        finalEndDate,
      );
    }

    // Обновляем сам Medication
    let updated;
    try {
      updated = await this.prisma.medication.update({
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
        ...(quantity !== undefined ? { quantity: quantity || null } : {}),
        ...(calculatedRemainingStock !== undefined ? { 
          remainingStock: calculatedRemainingStock,
          lastStockUpdate: calculatedRemainingStock !== null ? new Date() : null,
        } : {}),
        ...(lowStockThreshold !== undefined ? { lowStockThreshold: lowStockThreshold || 7 } : {}),
      },
      include: { doses: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
        throw new ServiceUnavailableException('Medications feature is not initialized (table missing).');
      }
      throw err;
    }

    // Если передали doses — пере-создаём их
    if (doses) {
      try {
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
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2021') {
          throw new ServiceUnavailableException('Medications feature is not initialized (table missing).');
        }
        throw err;
      }
    }

    return this.findOneForUser(userId, id);
  }

  /**
   * Remove medication for user (soft delete via isActive=false)
   */
  async removeForUser(userId: string, id: string) {
    const existing = await this.findOneForUser(userId, id);

    // Soft delete через isActive=false
    try {
      return await this.prisma.medication.update({
        where: { id: existing.id },
        data: { isActive: false },
        include: { doses: true },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2021') {
        throw new ServiceUnavailableException('Medications feature is not initialized (table missing).');
      }
      throw err;
    }
  }
}

