import type { CarFinderCriteria, SearchResult } from '@vehicles-marketplace/validation';
import { z } from 'zod';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function scoreCar(listing: SearchResult, criteria: CarFinderCriteria): number {
  const w = criteria.weights;
  // Unknown measurements score zero; weights are normalized, never AI scores.
  // Practicality means the user's explicitly preferred body style, not guessed space.
  const scores = {
    practicality: criteria.preferredBodyStyles.includes(listing.bodyStyle) ? 1 : 0,
    performance:
      criteria.targetPowerBhp && listing.powerBhp !== null
        ? clamp(listing.powerBhp / criteria.targetPowerBhp)
        : 0,
    affordability: clamp(1 - listing.pricePence / criteria.maxPricePence),
    mileage: criteria.targetMileageMiles
      ? clamp(1 - listing.mileageMiles / criteria.targetMileageMiles)
      : 0,
  };
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (!sum) return 0;
  return Math.round(
    (100 *
      (Object.keys(w) as Array<keyof typeof w>).reduce(
        (total, key) => total + w[key] * scores[key],
        0,
      )) /
      sum,
  );
}

export function carFacts(
  listing: SearchResult,
  criteria: CarFinderCriteria,
): Record<string, string> {
  const facts: Record<string, string> = {
    price: `Listed at £${(listing.pricePence / 100).toLocaleString('en-GB')}, within your £${(criteria.maxPricePence / 100).toLocaleString('en-GB')} budget.`,
    mileage: `Recorded mileage: ${listing.mileageMiles.toLocaleString('en-GB')} miles.`,
    body: `Body style: ${listing.bodyStyle.toLowerCase()}.`,
    fuel: `Fuel type: ${listing.fuel.toLowerCase()}.`,
  };
  if (listing.powerBhp !== null) facts.power = `Catalogue power: ${listing.powerBhp} bhp.`;
  if (criteria.preferredBodyStyles.includes(listing.bodyStyle))
    facts.practicality = 'Matches your preferred body style.';
  if (listing.transmissions.length)
    facts.transmission = `Catalogue transmission options: ${listing.transmissions.join(', ').toLowerCase()}.`;
  return facts;
}

// The explanation model can select/order facts, never author unverified prose.
export const ExplanationSchema = z.strictObject({
  selections: z
    .array(
      z.strictObject({
        listingId: z.string().min(1),
        factIds: z.array(z.string().min(1)).min(1).max(5),
      }),
    )
    .max(10),
});

export function renderExplanation(
  facts: Record<string, string>,
  selected: string[] | undefined,
): string {
  const valid = [...new Set(selected ?? [])].filter((id) => Object.hasOwn(facts, id));
  return (valid.length ? valid : ['price', 'mileage']).map((id) => facts[id]).join(' ');
}
