import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class FtsService {
  constructor(private readonly prisma: PrismaService) {}

  async searchFoodsFTS(query: string, limit = 20) {
    const rows: Array<any> = await this.prisma.$queryRawUnsafe(
      `
      SELECT f.*, ts_rank_cd(f.search_vector, plainto_tsquery($1)) AS rank
      FROM foods f
      WHERE f.search_vector @@ plainto_tsquery($1)
      ORDER BY rank DESC
      LIMIT $2
      `,
      query,
      limit,
    );

    return rows;
  }
}


