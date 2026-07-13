import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { UpdateUserProfileSchema } from '@qona/shared';
import { db } from '../services/db.js';
import { DISPOSABLE_EMAIL_DOMAINS } from '@qona/shared';
import { AppError } from '../middleware/errorHandler.js';
import axios from 'axios';

export const authRouter = Router();

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const emailDomain = req.user!.email.split('@')[1]?.toLowerCase();
    if (emailDomain && DISPOSABLE_EMAIL_DOMAINS.includes(emailDomain as typeof DISPOSABLE_EMAIL_DOMAINS[number])) {
      throw new AppError('Disposable email addresses are not allowed. Please use a permanent email address.', 403);
    }

    const authId = req.user!.authId;
    let user = await db.user.findByAuthId(authId);

    // Geolocation logic
    let country: string | undefined = undefined;
    const rawIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    const ip = rawIp.split(',')[0].trim();
    const isLocalhost = !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('::ffff:127.');

    if (isLocalhost) {
      const mockCountries = ['US', 'NG', 'GB', 'CA', 'DE', 'IN', 'FR', 'ZA', 'AU'];
      const hash = authId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      country = mockCountries[hash % mockCountries.length];
    } else {
      try {
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 2000 });
        if (geoResponse.data && geoResponse.data.countryCode) {
          country = geoResponse.data.countryCode;
        }
      } catch (err) {
        console.warn(`[GeoIP] Failed to geolocate IP "${ip}":`, err instanceof Error ? err.message : err);
      }
    }

    if (!user) {
      user = await db.user.upsertByAuthId({
        authId,
        email: req.user!.email,
        name: req.user!.name,
        country,
      });
    } else if (!user.country && country) {
      user = await db.user.updateByAuthId(authId, { country });
    }

    // Auto-promote opadgiant@gmail.com to ADMIN role
    if (user && user.email.toLowerCase() === 'opadgiant@gmail.com' && user.role !== 'ADMIN') {
      user = await db.user.updateRole(user.id, 'ADMIN');
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
