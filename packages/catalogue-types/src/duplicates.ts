/**
 * plans/09-catalogue-import-tooling-admin.md §3 — "Duplicate detection
 * method": in-process normalized-key comparison (lowercased, whitespace/
 * punctuation-stripped name + generation + core specs), not a Postgres
 * `pg_trgm` query (that's Plan 13's scope). Shared by the CLI's
 * `find-duplicates`/`import` commands and the Admin's merge-candidate
 * surfacing (§7) so there's exactly one definition of "these two
 * derivatives look like the same car."
 *
 * Deliberately never auto-merges (§5's `find-duplicates` doc comment, §7's
 * merge flow requiring an explicit admin action) — this module only groups
 * candidates for a human to resolve.
 */

/** Lowercases, strips everything but letters/digits, collapses whitespace. */
export function normalizeForDuplicateKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export interface DuplicateCandidateInput {
  id: string;
  name: string; // "M4 Competition xDrive"
  generationCode: string; // "G82" — two derivatives with the same name in
  // different generations (F82 "M4 Competition" vs. a hypothetical G82 one)
  // are not duplicates, so the generation is part of the key, not just the
  // name.
  bodyStyle: string;
  fuel: string;
  drivetrain: string;
  powerBhp?: number | null;
}

export interface DuplicateGroup<T extends DuplicateCandidateInput> {
  key: string;
  items: T[];
}

/** The normalized-key §3 describes: name + generation + a few core specs. */
export function buildDuplicateKey(input: DuplicateCandidateInput): string {
  return [
    normalizeForDuplicateKey(input.name),
    normalizeForDuplicateKey(input.generationCode),
    input.bodyStyle,
    input.fuel,
    input.drivetrain,
    input.powerBhp ?? '',
  ].join('|');
}

/** Groups `items` by their duplicate key, returning only groups of 2+ — the candidate pairs a human resolves via the Admin's merge action. */
export function findDuplicateCandidates<T extends DuplicateCandidateInput>(
  items: T[],
): DuplicateGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = buildDuplicateKey(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, items: group }));
}
