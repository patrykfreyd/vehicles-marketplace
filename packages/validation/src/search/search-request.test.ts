import { describe, expect, it } from 'vitest';
import { SearchRequestSchema } from './search-request';

describe('SearchRequestSchema', () => {
  it('accepts an empty request, defaulting sort/page/pageSize', () => {
    const result = SearchRequestSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ sort: 'RELEVANCE', page: 1, pageSize: 20 });
    }
  });

  it('rejects minPricePence greater than maxPricePence', () => {
    const result = SearchRequestSchema.safeParse({ minPricePence: 1000, maxPricePence: 500 });
    expect(result.success).toBe(false);
  });

  it('rejects minYear greater than maxYear', () => {
    const result = SearchRequestSchema.safeParse({ minYear: 2024, maxYear: 2020 });
    expect(result.success).toBe(false);
  });

  it('rejects minMileage greater than maxMileage', () => {
    const result = SearchRequestSchema.safeParse({ minMileage: 50_000, maxMileage: 10_000 });
    expect(result.success).toBe(false);
  });

  it('rejects DISTANCE_ASC sort without an origin', () => {
    const result = SearchRequestSchema.safeParse({ sort: 'DISTANCE_ASC' });
    expect(result.success).toBe(false);
  });

  it('accepts DISTANCE_ASC sort with an origin', () => {
    const result = SearchRequestSchema.safeParse({
      sort: 'DISTANCE_ASC',
      originLatitude: 53.25,
      originLongitude: -2.13,
    });
    expect(result.success).toBe(true);
  });

  it('rejects maxDistanceMiles without an origin', () => {
    const result = SearchRequestSchema.safeParse({ maxDistanceMiles: 20 });
    expect(result.success).toBe(false);
  });

  it('accepts a full standard + advanced filter payload', () => {
    const result = SearchRequestSchema.safeParse({
      query: 'M4 Comp xDrive',
      makeIds: ['bmw'],
      fuel: ['PETROL'],
      drivetrain: ['AWD'],
      minPowerBhp: 400,
      engineFamily: ['S58'],
      equipmentIds: ['heated_seats', 'adaptive_cruise'],
      sort: 'PRICE_ASC',
      page: 2,
      pageSize: 10,
    });
    expect(result.success).toBe(true);
  });
});
