import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type Redis from 'ioredis';
import { AiMessageResponseSchema } from '@vehicles-marketplace/validation';
import { AiSearchService, SAVE_AI_SESSION_SCRIPT } from './ai-search.service';
import type { AiSearchProvider } from './ai-search.provider';
import type { AiSearchCatalogue } from './ai-search.catalogue';
import type { SearchService } from '../search/search.service';
import { criteria, extraction, listing } from './ai-search.fixtures';
import { carFacts, renderExplanation, scoreCar } from './car-finder.scoring';

describe('AI search pipeline', () => {
  const values = new Map<string, string>();
  const redis = {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
      return 'OK';
    }),
    eval: vi.fn(async (script: string, _count: number, key: string, ...args: string[]) => {
      if (script === SAVE_AI_SESSION_SCRIPT) {
        const [sessionKey, token, payload] = args;
        if (values.get(key) !== token) return 0;
        values.set(sessionKey!, payload!);
        return 1;
      }
      values.delete(key);
      return 1;
    }),
  };
  const provider = { call: vi.fn() };
  const search = { search: vi.fn() };
  const catalogue = {
    vocabulary: vi.fn(async () => ({
      makes: [{ id: 'bmw', name: 'BMW' }],
      equipment: [
        { id: 'adaptive_cruise', name: 'Adaptive cruise control', manufacturerAliases: [] },
      ],
    })),
  };
  const service = new AiSearchService(
    redis as unknown as Redis,
    provider as unknown as AiSearchProvider,
    search as unknown as SearchService,
    catalogue as AiSearchCatalogue,
  );
  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
    search.search.mockResolvedValue({
      items: [listing],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      searchId: 'srch-real',
    });
  });
  it('executes the plan example through real structured filters and preserves them on a follow-up', async () => {
    const filters = {
      makeIds: ['bmw'],
      bodyStyle: ['ESTATE'],
      maxPricePence: 3000000,
      fuel: ['PETROL'],
      transmission: ['AUTOMATIC'],
      minPowerBhp: 300,
      equipmentIds: ['adaptive_cruise'],
      minYear: 2021,
    };
    provider.call
      .mockResolvedValueOnce(extraction(filters))
      .mockResolvedValueOnce(extraction({ maxPricePence: 2700000 }));
    const first = await service.message('user', 'AI_SEARCH', {
      message:
        'A fast German estate around £30k, petrol, automatic, 300+ bhp, adaptive cruise, 2021+',
    });
    expect(search.search).toHaveBeenLastCalledWith({
      ...filters,
      sort: 'RELEVANCE',
      page: 1,
      pageSize: 20,
    });
    const second = await service.message('user', 'AI_SEARCH', {
      sessionId: first.sessionId,
      message: 'make it under £27k',
    });
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.filters).toEqual({ ...filters, maxPricePence: 2700000 });
    expect(second.results?.items).toEqual([listing]);
    expect(AiMessageResponseSchema.safeParse(second).success).toBe(true);
    expect(provider.call.mock.calls[1]?.[4]).toMatchObject({
      previousFilters: filters,
      history: expect.arrayContaining([
        { role: 'user', content: expect.stringContaining('German estate') },
      ]),
    });
    expect(redis.eval).toHaveBeenCalledWith(
      SAVE_AI_SESSION_SCRIPT,
      2,
      `AI_SEARCH_SESSION:${first.sessionId}:lock`,
      `AI_SEARCH_SESSION:${first.sessionId}`,
      expect.any(String),
      expect.any(String),
    );
  });
  it('persists vague queries as clarification turns without querying inventory', async () => {
    provider.call.mockResolvedValueOnce(
      extraction({}, { clarifyingQuestion: 'What is your rough budget?' }),
    );
    const answer = await service.message('user', 'AI_SEARCH', {
      message: 'something nice and fast',
    });
    expect(answer.clarifyingQuestion).toContain('budget');
    expect(search.search).not.toHaveBeenCalled();
  });
  it('rejects unknown, expired, other-user and other-feature sessions before paying for a call', async () => {
    provider.call.mockResolvedValueOnce(extraction({ maxPricePence: 3000000 }));
    const first = await service.message('user', 'AI_SEARCH', { message: 'under £30k' });
    provider.call.mockClear();
    await expect(
      service.message('other', 'AI_SEARCH', { sessionId: first.sessionId, message: 'show me' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.message('user', 'AI_CAR_FINDER', { sessionId: first.sessionId, message: 'show me' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    values.clear();
    await expect(
      service.message('user', 'AI_SEARCH', { sessionId: first.sessionId, message: 'show me' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(provider.call).not.toHaveBeenCalled();
  });
  it('does not execute invalid ranges or invented equipment IDs', async () => {
    for (const filters of [
      { minPricePence: 4000000, maxPricePence: 3000000 },
      { equipmentIds: ['invented'] },
    ]) {
      provider.call.mockResolvedValueOnce(extraction(filters));
      await expect(
        service.message('user', 'AI_SEARCH', { message: 'cars' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
    expect(search.search).not.toHaveBeenCalled();
  });
  it('provider failures preserve the last successful conversation and release the turn lock', async () => {
    provider.call
      .mockResolvedValueOnce(extraction({ maxPricePence: 3000000 }))
      .mockRejectedValueOnce(new Error('provider failure'));
    const first = await service.message('user', 'AI_SEARCH', { message: 'under £30k' });
    const snapshot = values.get(`AI_SEARCH_SESSION:${first.sessionId}`);
    await expect(
      service.message('user', 'AI_SEARCH', { sessionId: first.sessionId, message: 'under £27k' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(values.get(`AI_SEARCH_SESSION:${first.sessionId}`)).toBe(snapshot);
    expect(values.has(`AI_SEARCH_SESSION:${first.sessionId}:lock`)).toBe(false);
  });
  it('asks guided questions until weighted criteria are complete', async () => {
    provider.call.mockResolvedValueOnce(extraction({ maxPricePence: 3000000 }));
    const first = await service.message('user', 'AI_CAR_FINDER', {
      message: 'Help me choose under £30k',
    });
    expect(first.nextQuestion).toBeTruthy();
    expect(search.search).not.toHaveBeenCalled();
  });
  it('ranks inventory reproducibly and cannot render hallucinated specs, vehicles or scores', async () => {
    provider.call
      .mockResolvedValueOnce(extraction({ maxPricePence: 3000000 }, { criteria }))
      .mockResolvedValueOnce({
        selections: [
          {
            listingId: listing.listingId,
            factIds: ['power', 'heated seats', 'full service history', 'panoramic roof'],
          },
          { listingId: 'invented-vehicle', factIds: ['price'] },
        ],
      });
    const answer = await service.message('user', 'AI_CAR_FINDER', {
      message: 'Estate, 300 bhp, body and power equally important, under £30k',
    });
    expect(answer.recommendations).toHaveLength(1);
    expect(answer.recommendations?.[0]).toMatchObject({
      derivativeId: listing.derivativeId,
      matchScore: 93,
      reasoning: 'Catalogue power: 258 bhp.',
    });
    expect(scoreCar(listing, criteria)).toBe(scoreCar(listing, criteria));
    expect(scoreCar({ ...listing, powerBhp: null }, criteria)).toBe(50);
    expect(renderExplanation(carFacts(listing, criteria), ['invented'])).toContain('£25,000');
    expect(JSON.stringify(provider.call.mock.calls[1]?.[4])).not.toContain('user');
    expect(search.search).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 100, maxPricePence: 3000000 }),
    );
  });
  it('skips the explanation call when there are no real matches', async () => {
    provider.call.mockResolvedValueOnce(extraction({ maxPricePence: 3000000 }, { criteria }));
    search.search.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 1,
      searchId: 'srch-none',
    });
    expect(
      (await service.message('user', 'AI_CAR_FINDER', { message: 'cars' })).recommendations,
    ).toEqual([]);
    expect(provider.call).toHaveBeenCalledTimes(1);
  });
  it('cannot overwrite a conversation after its turn lock expires', async () => {
    provider.call.mockResolvedValueOnce(extraction({ maxPricePence: 3000000 }));
    const first = await service.message('user', 'AI_SEARCH', { message: 'under £30k' });
    const key = `AI_SEARCH_SESSION:${first.sessionId}`;
    const saved = values.get(key);
    provider.call.mockResolvedValueOnce(extraction({ maxPricePence: 2700000 }));
    search.search.mockImplementationOnce(async () => {
      values.delete(`${key}:lock`);
      return { items: [], page: 1, pageSize: 20, total: 0, totalPages: 1, searchId: 'srch-late' };
    });
    await expect(
      service.message('user', 'AI_SEARCH', { sessionId: first.sessionId, message: 'under £27k' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(values.get(key)).toBe(saved);
  });
});
