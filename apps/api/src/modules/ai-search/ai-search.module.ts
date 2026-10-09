import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { AiSearchController } from './ai-search.controller';
import { AiSearchService } from './ai-search.service';
import { AiSearchProvider } from './ai-search.provider';
import { AiSearchCatalogue } from './ai-search.catalogue';
import { AiSearchThrottleGuard } from './ai-search-throttle.guard';

@Module({
  imports: [SearchModule],
  controllers: [AiSearchController],
  providers: [AiSearchService, AiSearchProvider, AiSearchCatalogue, AiSearchThrottleGuard],
})
export class AiSearchModule {}
