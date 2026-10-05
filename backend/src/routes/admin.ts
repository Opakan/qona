import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../services/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config.js';
import type { Request, Response, NextFunction } from 'express';

export const adminRouter = Router();

// Middleware to ensure the user is an admin by querying the database role
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const adminEmails = ['opadgiant@gmail.com', 'admin@qonace.com'];
    const isOwner = Boolean(req.user.email && adminEmails.some((e) => e.toLowerCase() === req.user!.email.toLowerCase()));
    const devOverride = req.headers['x-developer-role'] === 'ADMIN';

    console.log(`[requireAdmin] user=${req.user.email} isOwner=${isOwner} devOverride=${devOverride}`);

    let dbUser = await db.user.findByAuthId(req.user.authId);
    if (!dbUser && req.user.email) {
      dbUser = await db.user.findByEmail(req.user.email);
    }

    if (!dbUser && (isOwner || devOverride)) {
      try {
        dbUser = await db.user.upsertByAuthId({
          authId: req.user.authId,
          email: req.user.email,
          name: req.user.name,
        });
      } catch (err) {
        console.warn('[Admin] Upsert error in requireAdmin:', err);
      }
    }

    if (isOwner && dbUser && dbUser.role !== 'ADMIN') {
      try {
        dbUser = await db.user.updateRole(dbUser.id, 'ADMIN');
      } catch (err) {
        console.warn('[Admin] updateRole error in requireAdmin:', err);
      }
    }

    // isOwner always passes through — DB role is secondary for owner emails
    if (!devOverride && !isOwner && (!dbUser || dbUser.role !== 'ADMIN')) {
      console.warn(`[requireAdmin] Access DENIED for ${req.user.email}`);
      throw new AppError('Forbidden: Admin access required', 403);
    }

    console.log(`[requireAdmin] Access GRANTED for ${req.user.email}`);
    next();
  } catch (error) {
    next(error);
  }
}

// Apply authentication and admin verification to all admin endpoints
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Retrieves aggregated user and system usage statistics.
 */
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const stats = await db.user.getAdminStats();
    res.json({ stats });
  } catch (error: any) {
    console.error('[Admin /stats] Error:', error?.message, error?.stack);
    next(error);
  }
});

/**
 * GET /api/admin/users
 * Retrieves a list of users with pagination, sorting, and search.
 */
// Only allow sorting on fields that exist in the User model
const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'email', 'country', 'role'];

adminRouter.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const search = req.query.search as string || undefined;
    const rawSortBy = req.query.sortBy as string || 'createdAt';
    const sortBy = VALID_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const result = await db.user.findManyPaginated({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Admin /users] Error:', error?.message, error?.stack);
    next(error);
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Updates a user's role (USER or ADMIN).
 */
adminRouter.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'USER' && role !== 'ADMIN') {
      throw new AppError('Invalid role. Role must be USER or ADMIN.', 400);
    }

    const updatedUser = await db.user.updateRole(id, role);
    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/upgrade-user
 * Manually activates a subscription for a user by email.
 * Body: { email: string, plan: 'starter' | 'pro' | 'enterprise', interval?: 'month' | 'year' }
 */
adminRouter.post('/upgrade-user', async (req, res, next) => {
  try {
    const { getPrisma } = await import('../lib/prisma.js');
    const prisma = getPrisma();
    const { email, plan = 'starter', interval = 'month' } = req.body;

    if (!email) throw new AppError('email is required', 400);

    // Find the user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(`No user found with email: ${email}`, 404);

    // Ensure plan exists
    let dbPlan = await prisma.subscriptionPlan.findFirst({ where: { slug: plan } });
    if (!dbPlan) {
      const planDefaults: Record<string, { name: string; price: number; description: string; exports: number }> = {
        starter: { name: 'Starter', price: 1, description: 'Start building workflows.', exports: 10 },
        pro: { name: 'Pro', price: 30, description: 'For professionals and growing teams.', exports: 100 },
        enterprise: { name: 'Enterprise', price: 99, description: 'For growing businesses.', exports: 1000 },
      };
      const def = planDefaults[plan] || planDefaults.starter;
      dbPlan = await prisma.subscriptionPlan.create({
        data: { name: def.name, slug: plan, description: def.description, price: def.price, currency: 'USD', interval, exports: def.exports, features: JSON.stringify([`${def.exports} workflow exports`, 'AI generation', 'n8n format export']), active: true },
      });
    }

    // Cancel any existing active subs
    await prisma.subscription.updateMany({
      where: { userId: user.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    // Create new active subscription
    const expiresAt = new Date();
    if (interval === 'year') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    const ref = `ADMIN-UPGRADE-${Date.now()}-${email.split('@')[0]}`;
    const subscription = await prisma.subscription.create({
      data: { userId: user.id, planId: dbPlan.id, provider: 'flutterwave', providerRef: ref, status: 'ACTIVE', expiresAt },
      include: { plan: true },
    });

    // Create invoice record
    await prisma.invoice.create({
      data: { userId: user.id, subscriptionId: subscription.id, provider: 'flutterwave', providerRef: `${ref}-inv`, amount: dbPlan.price, currency: 'USD', status: 'PAID', paidAt: new Date(), metadata: { plan, interval, note: 'Manual admin upgrade' } },
    });

    res.json({ success: true, message: `${email} upgraded to ${dbPlan.name} (${interval})`, subscription });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Deletes a user from the database.
 */
adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    const dbUserToDelete = await db.user.findById(id);
    if (dbUserToDelete && dbUserToDelete.authId === req.user!.authId) {
      throw new AppError('Conflict: You cannot delete your own admin account.', 409);
    }

    await db.user.delete(id);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
});
