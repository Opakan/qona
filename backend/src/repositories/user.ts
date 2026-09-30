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

  async upsertByAuthId(input: { authId: string; email: string; name: string; country?: string }) {
    // 1. Try finding by authId
    let user = await this.prisma.user.findUnique({ where: { authId: input.authId } });
    if (user) {
      return this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: input.email,
          name: input.name,
          ...(input.country ? { country: input.country } : {}),
        },
      });
    }

    // 2. Try finding by email (in case authId changed or re-registered)
    if (input.email) {
      user = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (user) {
        return this.prisma.user.update({
          where: { id: user.id },
          data: {
            authId: input.authId,
            name: input.name,
            ...(input.country ? { country: input.country } : {}),
          },
        });
      }
    }

    // 3. User does not exist, create safely
    return this.prisma.user.create({
      data: {
        authId: input.authId,
        email: input.email,
        name: input.name,
        country: input.country ?? null,
      },
    });
  }

  async update(id: string, data: { name?: string; avatarUrl?: string; country?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateByAuthId(authId: string, data: { name?: string; avatarUrl?: string; country?: string; role?: 'USER' | 'ADMIN' }) {
    return this.prisma.user.update({ where: { authId }, data });
  }

  async updateRole(id: string, role: 'USER' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async findManyPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { country: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    let users: any[] = [];
    let total = 0;
    try {
      total = await this.prisma.user.count({ where });
      users = await this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
          },
          _count: {
            select: {
              workflows: true,
              conversations: true,
            },
          },
        },
      });
    } catch (e: any) {
      console.error('[findManyPaginated] Error:', e?.message);
      // Re-throw so the route handler can report back
      throw e;
    }

    return {
      users: users.map((user) => {
        const activeSub = user.subscriptions[0];
        return {
          id: user.id,
          authId: user.authId,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          country: user.country,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          workflowsCount: user._count.workflows,
          conversationsCount: user._count.conversations,
          planName: activeSub?.plan?.name || 'Free',
        };
      }),
      total,
      pages: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  async getAdminStats() {
    // Run each query independently so a schema mismatch on one doesn't crash the whole endpoint
    let totalUsers = 0;
    let activeUsers = 0;
    let totalWorkflows = 0;
    let allUsers: Array<{
      email: string;
      country: string | null;
      createdAt: Date;
      subscriptions: Array<{ plan: { name: string } | null }>;
    }> = [];

    try {
      totalUsers = await this.prisma.user.count();
    } catch (e) {
      console.error('[getAdminStats] totalUsers failed:', e);
    }

    try {
      activeUsers = await this.prisma.user.count({ where: { workflows: { some: {} } } });
    } catch (e) {
      console.error('[getAdminStats] activeUsers failed:', e);
    }

    try {
      allUsers = await this.prisma.user.findMany({
        select: {
          email: true,
          country: true,
          createdAt: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            select: { plan: { select: { name: true } } },
          },
        },
      });
    } catch (e) {
      console.error('[getAdminStats] allUsers failed:', e);
    }

    try {
      totalWorkflows = await this.prisma.workflow.count();
    } catch (e) {
      console.error('[getAdminStats] totalWorkflows failed:', e);
    }

    const emailDomains: Record<string, number> = {};
    const countryDistribution: Record<string, number> = {};
    const planDistribution: Record<string, number> = { Free: 0, Starter: 0, Pro: 0 };

    allUsers.forEach((user) => {
      const parts = user.email.split('@');
      if (parts.length > 1) {
        const domain = parts[1].toLowerCase();
        let provider = 'Other';
        if (domain.includes('gmail.com')) provider = 'Gmail';
        else if (domain.includes('yahoo.com')) provider = 'Yahoo';
        else if (domain.includes('outlook.com') || domain.includes('hotmail.com')) provider = 'Outlook';
        else if (domain.includes('icloud.com')) provider = 'iCloud';
        emailDomains[provider] = (emailDomains[provider] || 0) + 1;
      }

      const country = user.country || 'Unknown';
      countryDistribution[country] = (countryDistribution[country] || 0) + 1;

      const planName = user.subscriptions[0]?.plan?.name || 'Free';
      planDistribution[planName] = (planDistribution[planName] || 0) + 1;
    });

    const growthData: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      growthData[d.toISOString().split('T')[0]] = 0;
    }
    allUsers.forEach((user) => {
      const dateStr = user.createdAt.toISOString().split('T')[0];
      if (dateStr in growthData) growthData[dateStr]++;
    });

    const avgWorkflows = totalUsers > 0 ? Number((totalWorkflows / totalUsers).toFixed(1)) : 0;

    return {
      totalUsers,
      activeUsers,
      totalWorkflows,
      avgWorkflows,
      emailDomains: Object.entries(emailDomains).map(([name, count]) => ({ name, count })),
      countryDistribution: Object.entries(countryDistribution).map(([name, count]) => ({ name, count })),
      planDistribution: Object.entries(planDistribution).map(([name, count]) => ({ name, count })),
      growth: Object.entries(growthData).map(([date, count]) => ({ date, count })),
    };
  }
}
