import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { UpdateUserProfileSchema } from '@qona/shared';
import { db } from '../services/db.js';

export const authRouter = Router();

const userSelect = {
  id: true,
  authId: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    let user = await db.user.findByAuthId(req.user!.authId);

    if (!user) {
      user = await db.user.upsertByAuthId({
        authId: req.user!.authId,
        email: req.user!.email,
        name: req.user!.name,
      });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.put('/me', requireAuth, validate(UpdateUserProfileSchema), async (req, res, next) => {
  try {
    const user = await db.user.updateByAuthId(req.user!.authId, { name: req.body.name });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});
