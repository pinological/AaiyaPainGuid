import { z } from 'zod';

const list = (min: number, max: number) =>
  z
    .array(z.string().min(1))
    .min(min)
    .transform((a) => a.slice(0, max));

export const CardSchema = z.object({
  title: z.string().min(1),
  structure_type: z.enum(['muscle', 'muscle part', 'bursa', 'fascia', 'other']).catch('other'),
  summary: z.string().min(1),
  what_it_does: list(1, 4),
  why_it_might_hurt: list(1, 4),
  exercises: z
    .array(
      z.object({
        name: z.string().min(1),
        how: z.string().min(1),
        dose: z.string().default(''),
        caution: z.string().default(''),
      }),
    )
    .min(1)
    .transform((a) => a.slice(0, 3)),
  red_flags: z
    .array(z.string().min(1))
    .default([])
    .transform((a) => a.slice(0, 4)),
  related: z
    .array(z.string().min(1))
    .default([])
    .transform((a) => a.slice(0, 3)),
});

export type Card = z.infer<typeof CardSchema>;

/** What the client receives: `related` resolved to real model parts, red flags merged with the static list. */
export interface RelatedRef {
  raw: string;
  display: string;
}
export type FinalCard = Omit<Card, 'related'> & { related: RelatedRef[] };
