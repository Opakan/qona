import type { PrismaClient, Prisma } from '@prisma/client';
import { BaseRepository } from './base.js';

type UserCreate = Prisma.UserCreateInput;
type UserUpdate = Prisma.UserUpdateInput;

export class UserRepository extends BaseRepository {
  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByAuthId(authId: string) {
    return this.prisma.user.findUnique({ where: { authId } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async upsertByAuthId(input: { authId: string; email: string; name: string }) {
    return this.prisma.user.upsert({
      where: { authId: input.authId },
      update: { email: input.email, name: input.name },
      create: { authId: input.authId, email: input.email, name: input.name },
    });
  }

  async update(id: string, data: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateByAuthId(authId: string, data: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { authId }, data });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
