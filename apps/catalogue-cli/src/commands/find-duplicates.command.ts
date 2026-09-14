/** `catalogue find-duplicates <manufacturer>` — plans/09-catalogue-import-tooling-admin.md §5. Prints candidates for a human to resolve via the Admin's merge action; never auto-merges. */
import {
  findDuplicateCandidates,
  type DuplicateCandidateInput,
  type DuplicateGroup,
} from '@vehicles-marketplace/catalogue-types';
import { getMakeDuplicateCandidateInputs } from '../lib/catalogue-queries';

export function printDuplicateGroups(
  manufacturer: string,
  groups: DuplicateGroup<DuplicateCandidateInput>[],
): void {
  if (groups.length === 0) {
    console.log(`No candidate duplicates found for "${manufacturer}".`);
    return;
  }
  console.log(`Candidate duplicates for "${manufacturer}":`);
  for (const group of groups) {
    const items = group.items
      .map((item) => `"${item.name}" [${item.generationCode}] (${item.id})`)
      .join(' ~ ');
    console.log(`  ${items}`);
  }
}

export async function runFindDuplicates(manufacturer: string) {
  const inputs = await getMakeDuplicateCandidateInputs(manufacturer);
  const groups = findDuplicateCandidates(inputs);
  printDuplicateGroups(manufacturer, groups);
  return groups;
}
