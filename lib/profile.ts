import { z } from 'zod';
import type { UserProfile } from './types';

// The browser sends the profile the user typed in; the server re-validates it before it reaches a prompt.
export const ProfileSchema = z.object({
  age: z.number().int().min(12).max(110),
  weight_kg: z.number().min(25).max(300),
  height_cm: z.number().min(100).max(250),
  gender: z.enum(['female', 'male', 'other']),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

export const toProfile = (p: ProfileInput): UserProfile => ({ name: 'You', ...p });
