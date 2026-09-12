import { createHealthCheck } from '@vehicles-marketplace/validation';

export function getStartupMessage(): string {
  const health = createHealthCheck();
  return `catalogue-cli: alive (${JSON.stringify(health)}). No real commands yet — see Plan 09 (Catalogue Import Tooling & Admin).`;
}

function main(): void {
  console.log(getStartupMessage());
}

main();
