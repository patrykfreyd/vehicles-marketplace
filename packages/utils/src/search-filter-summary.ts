const labels: Record<string, string> = {
  query: 'Model or derivative',
  makeIds: 'Makes',
  equipmentIds: 'Required equipment',
  minPricePence: 'Minimum price',
  maxPricePence: 'Maximum price',
  minYear: 'Earliest year',
  maxYear: 'Latest year',
  minMileage: 'Minimum mileage',
  maxMileage: 'Maximum mileage',
  fuel: 'Fuel',
  transmission: 'Transmission',
  drivetrain: 'Drivetrain',
  bodyStyle: 'Body style',
  colourFamily: 'Colour',
  minPowerBhp: 'Minimum power (bhp)',
  minTorqueNm: 'Minimum torque (Nm)',
  maxZeroToSixtyTwo: 'Maximum 0–62 mph time (seconds)',
  engineFamily: 'Engine family',
};

/** Customer-facing labels shared by web and mobile filter summaries. */
export function searchFilterSummary(filters: Record<string, unknown>): string[] {
  return Object.entries(filters).flatMap(([key, value]) => {
    if (value === undefined || value === null || (Array.isArray(value) && !value.length)) return [];
    const formatted = Array.isArray(value)
      ? value.map((v: unknown) => String(v).replace(/[_-]/g, ' ')).join(', ')
      : key.endsWith('Pence')
        ? `£${(Number(value) / 100).toLocaleString('en-GB')}`
        : key.includes('Mileage')
          ? `${Number(value).toLocaleString('en-GB')} miles`
          : String(value);
    return [`${labels[key] ?? key}: ${formatted}`];
  });
}
