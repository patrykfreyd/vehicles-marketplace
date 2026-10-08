import { describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { SearchController } from './search.controller';

describe('SearchController', () => {
  it('search is @Public() — browsing listings never requires a session', () => {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, SearchController.prototype.search);
    expect(isPublic).toBe(true);
  });
});
