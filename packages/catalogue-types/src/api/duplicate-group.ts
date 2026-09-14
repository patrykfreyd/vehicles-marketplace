/**
 * plans/09-catalogue-import-tooling-admin.md §7 — the response shape for
 * `catalogue-admin`'s duplicate-candidates endpoint (surfaced for the
 * Admin's merge flow, same §3 normalized-key grouping the CLI's
 * `find-duplicates` command prints).
 */
import { z } from 'zod';

export const DuplicateCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  generationCode: z.string().min(1),
  bodyStyle: z.string().min(1),
  fuel: z.string().min(1),
  drivetrain: z.string().min(1),
  powerBhp: z.number().int().positive().nullable().optional(),
});

export type DuplicateCandidate = z.infer<typeof DuplicateCandidateSchema>;

export const DuplicateGroupResponseSchema = z.object({
  key: z.string().min(1),
  items: z.array(DuplicateCandidateSchema),
});

export type DuplicateGroupResponse = z.infer<typeof DuplicateGroupResponseSchema>;
