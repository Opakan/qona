import { z } from 'zod';

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export const UserProfileSchema = z.object({
  id: z.string(),
  authId: z.string(),
  email: z.string().email(),
  name: z.string().min(1).max(200),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  country: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UpdateUserProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;
