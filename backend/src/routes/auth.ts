import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { UpdateUserProfileSchema } from '@qona/shared';
import { db } from '../services/db.js';
import { DISPOSABLE_EMAIL_DOMAINS } from '@qona/shared';
import { AppError } from '../middleware/errorHandler.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const emailDomain = req.user!.email.split('@')[1]?.toLowerCase();
    if (emailDomain && DISPOSABLE_EMAIL_DOMAINS.includes(emailDomain as typeof DISPOSABLE_EMAIL_DOMAINS[number])) {
      throw new AppError('Disposable email addresses are not allowed. Please use a permanent email address.', 403);
    }

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
