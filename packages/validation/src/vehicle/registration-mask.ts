/**
 * plans/11-vehicle-listing-data-model.md §3 — registration visibility to
 * buyers is masked by default (anti-cloning risk real UK marketplaces
 * actively avoid); the owning seller and an admin always see the full
 * plate (enforced by the caller, not this function).
 *
 * Registrations are stored normalized — uppercase, no whitespace (see
 * `normalizeRegistration`) — so masking re-inserts the visual split for a
 * current-format UK plate (2 letters + 2 digits age identifier, e.g.
 * "YA22" of "YA22XYZ") and blanks the rest: "YA22 ***". Anything too short
 * to safely split (older/dateless formats, or genuinely odd input) is
 * masked in full rather than partially — never trade a shorter mask for a
 * more revealing one.
 */
export function maskRegistration(registration: string): string {
  const normalized = registration.trim().toUpperCase();
  if (normalized.length <= 4) return '***';
  return `${normalized.slice(0, 4)} ***`;
}
