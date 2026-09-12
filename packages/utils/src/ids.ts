/**
 * Prefixed-ULID generator for transactional entities (user, vehicle,
 * listing, message, conversation, analytics event, ...) — see
 * plans/03-shared-types-validation.md §5. A ULID is sortable by creation
 * time and collision-free without a DB round trip; the prefix makes IDs
 * self-describing in logs/errors (`usr_01HZ...`, `veh_01HZ...`).
 *
 * Catalogue entities (make, model, generation, derivative, ...) do *not*
 * use this — they get stable, human-readable slug IDs instead, owned by
 * Plan 08.
 */
import { ulid } from 'ulid';

/** Builds a new `${prefix}_${ULID}` ID, e.g. `createId('usr')` → `usr_01HZX82K7Q4M...`. */
export function createId<Prefix extends string>(prefix: Prefix): `${Prefix}_${string}` {
  return `${prefix}_${ulid()}`;
}
