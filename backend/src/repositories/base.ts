import type { PrismaClient } from '@prisma/client';

export class BaseRepository {
  constructor(protected readonly prisma: PrismaClient) {}
}
