import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { UpdateUserProfileSchema } from '@qona/shared';
import { getPrisma } from '../lib/prisma.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();

    let user = await prisma.user.findUnique({
      where: { authId: req.user!.authId },
      select: { id: true, authId: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          authId: req.user!.authId,
          email: req.user!.email,
          name: req.user!.name,
        },
        select: { id: true, authId: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true },
      });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.put('/me', requireAuth, validate(UpdateUserProfileSchema), async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const user = await prisma.user.update({
      where: { authId: req.user!.authId },
      data: { name: req.body.name },
      select: { id: true, authId: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});
