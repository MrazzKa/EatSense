import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SpecialistsService } from '../specialists/specialists.service';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private specialistsService: SpecialistsService,
  ) {}

  async create(data: { consultationId: string; clientId: string; rating: number; comment?: string }) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: data.consultationId },
      include: { review: true },
    });

    if (!consultation) throw new ForbiddenException('Consultation not found');
    if (consultation.clientId !== data.clientId) throw new ForbiddenException('Access denied');
    if (consultation.review) throw new BadRequestException('Review already exists');

    const review = await this.prisma.review.create({
      data: {
        consultationId: data.consultationId,
        clientId: data.clientId,
        specialistId: consultation.specialistId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    await this.specialistsService.updateRating(consultation.specialistId);
    return review;
  }

  async findBySpecialistId(specialistId: string) {
    return this.prisma.review.findMany({
      where: { specialistId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, userProfile: { select: { firstName: true, avatarUrl: true } } },
        },
      },
    });
  }
}
