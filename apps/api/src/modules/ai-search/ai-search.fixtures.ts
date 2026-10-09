import {
  AiExtractionSchema,
  AiSearchFilterSchema,
  type SearchResult,
  type CarFinderCriteria,
} from '@vehicles-marketplace/validation';

export function extraction(filters: object = {}, options: object = {}) {
  return AiExtractionSchema.parse({
    filters: {
      ...Object.fromEntries(Object.keys(AiSearchFilterSchema.shape).map((k) => [k, null])),
      ...filters,
    },
    clearFields: [],
    clarifyingQuestion: null,
    criteria: null,
    ...options,
  });
}
export const criteria: CarFinderCriteria = {
  maxPricePence: 3000000,
  weights: { performance: 0.5, practicality: 0.5, affordability: 0, mileage: 0 },
  preferredBodyStyles: ['ESTATE'],
  targetPowerBhp: 300,
  targetMileageMiles: null,
  requiredEquipmentIds: [],
};
export const listing: SearchResult = {
  listingId: 'lst-real',
  vehicleId: 'veh-real',
  pricePence: 2500000,
  title: null,
  thumbnailUrl: null,
  status: 'LIVE',
  publishedAt: null,
  makeId: 'bmw',
  makeName: 'BMW',
  modelId: 'bmw-3',
  modelName: '3 Series',
  generationId: 'bmw-3-g21',
  generationCode: 'G21',
  derivativeId: 'bmw-330i',
  derivativeName: '330i',
  bodyStyle: 'ESTATE',
  fuel: 'PETROL',
  transmissions: ['AUTOMATIC'],
  drivetrain: 'RWD',
  powerBhp: 258,
  mileageMiles: 35000,
  firstRegisteredAt: '2021-01-01T00:00:00.000Z',
  colourFamily: null,
  locationPostcodeArea: null,
  distanceMiles: null,
};
