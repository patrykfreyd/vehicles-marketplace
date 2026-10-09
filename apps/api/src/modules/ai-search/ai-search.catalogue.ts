import { Injectable } from '@nestjs/common';
import { db } from '@vehicles-marketplace/db';

@Injectable()
export class AiSearchCatalogue {
  async vocabulary() {
    // Read-only controlled vocabulary, not listings. The provider has no DB tool.
    const [makes, equipment] = await Promise.all([
      db.make.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' }, take: 300 }),
      db.equipment.findMany({
        select: {
          id: true,
          name: true,
          manufacturerAliases: { select: { manufacturerName: true } },
        },
        orderBy: { id: 'asc' },
        take: 1000,
      }),
    ]);
    return { makes, equipment };
  }
}
