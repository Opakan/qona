import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../services/db.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Request, Response, NextFunction } from 'express';

export const adminRouter = Router();

// Middleware to ensure the user is an admin by querying the database role
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const dbUser = await db.user.findByAuthId(req.user.authId);
    if (!dbUser || dbUser.role !== 'ADMIN') {
      throw new AppError('Forbidden: Admin access required', 403);
    }
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
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * Retrieves a list of users with pagination, sorting, and search.
 */
adminRouter.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const search = req.query.search as string || undefined;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const result = await db.user.findManyPaginated({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    res.json(result);
  } catch (error) {
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
