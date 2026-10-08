import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '../auth/public.decorator';
import { SearchRequestDto, SearchResponseDto } from './dto/search.dto';
import { SearchService } from './search.service';

/**
 * plans/13-search-filtering.md §7 — `POST /search`, not `GET`: the full
 * filter payload (equipment arrays, a bounding box) is unwieldy as query
 * params, and this endpoint was never meant to be a bookmarkable URL on
 * its own (a shareable search URL is Plan 15/19's own front-end concern,
 * layered on top of this API). Public — browsing listings never requires
 * a session (same convention as the `CatalogueController` this replaces).
 */
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Public()
  @Post()
  @HttpCode(200)
  @ZodResponse({ status: 200, type: SearchResponseDto })
  async search(@Body() body: SearchRequestDto) {
    return this.service.search(body);
  }
}
