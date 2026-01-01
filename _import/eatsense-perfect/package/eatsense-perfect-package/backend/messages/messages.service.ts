import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  private async checkAccess(consultationId: string, userId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { specialist: { select: { userId: true } } },
    });

    if (!consultation) throw new ForbiddenException('Consultation not found');

    const isClient = consultation.clientId === userId;
    const isSpecialist = consultation.specialist.userId === userId;
    if (!isClient && !isSpecialist) throw new ForbiddenException('Access denied');

    return consultation;
  }

  async findByConsultationId(consultationId: string, userId: string) {
    await this.checkAccess(consultationId, userId);

    return this.prisma.message.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            userProfile: { select: { firstName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async create(data: {
    consultationId: string;
    senderId: string;
    type: string;
    content: string;
    metadata?: any;
  }) {
    await this.checkAccess(data.consultationId, data.senderId);

    return this.prisma.message.create({
      data: {
        consultationId: data.consultationId,
        senderId: data.senderId,
        type: data.type,
        content: data.content,
        metadata: data.metadata,
      },
      include: {
        sender: {
          select: {
            id: true,
            userProfile: { select: { firstName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async markAsRead(consultationId: string, userId: string) {
    await this.checkAccess(consultationId, userId);

    await this.prisma.message.updateMany({
      where: {
        consultationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const clientConsultations = await this.prisma.consultation.findMany({
      where: { clientId: userId },
      select: { id: true },
    });

    const specialist = await this.prisma.specialist.findUnique({ where: { userId } });
    const specialistConsultations = specialist
      ? await this.prisma.consultation.findMany({
          where: { specialistId: specialist.id },
          select: { id: true },
        })
      : [];

    const allConsultationIds = [
      ...clientConsultations.map((c) => c.id),
      ...specialistConsultations.map((c) => c.id),
    ];

    if (allConsultationIds.length === 0) return 0;

    return this.prisma.message.count({
      where: {
        consultationId: { in: allConsultationIds },
        senderId: { not: userId },
        isRead: false,
      },
    });
  }

  async shareMeals(data: {
    consultationId: string;
    senderId: string;
    fromDate: Date;
    toDate: Date;
  }) {
    await this.checkAccess(data.consultationId, data.senderId);

    const meals = await this.prisma.meal.findMany({
      where: {
        userId: data.senderId,
        createdAt: { gte: data.fromDate, lte: data.toDate },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return this.create({
      consultationId: data.consultationId,
      senderId: data.senderId,
      type: 'meal_share',
      content: `Shared ${meals.length} meals`,
      metadata: { meals, fromDate: data.fromDate, toDate: data.toDate },
    });
  }

  async shareLabResults(data: {
    consultationId: string;
    senderId: string;
    labResultId: string;
  }) {
    await this.checkAccess(data.consultationId, data.senderId);

    const labResult = await this.prisma.labResult.findFirst({
      where: { id: data.labResultId, userId: data.senderId },
      include: { metrics: true },
    });

    if (!labResult) throw new ForbiddenException('Lab result not found');

    return this.create({
      consultationId: data.consultationId,
      senderId: data.senderId,
      type: 'lab_share',
      content: 'Shared lab results',
      metadata: { labResult },
    });
  }
}
