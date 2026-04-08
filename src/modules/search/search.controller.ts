import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto, SuggestQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Full-text product search with filters, sorting, and facets',
    description: `
Supports:
- q: full-text query (name, description, SKU)
- categoryId + includeSubcategories: category drill-down
- minPrice / maxPrice: price range
- productType: simple | variable | bundle
- isFeatured: featured products only
- sortBy: relevance | price_asc | price_desc | newest | rating | popular
- page / limit: pagination
Returns results + facets (category counts, price range, type breakdown).
    `.trim(),
  })
  search(@Query() dto: SearchQueryDto) {
    return this.searchService.search(dto);
  }

  @Get('suggest')
  @ApiOperation({
    summary: 'Autocomplete suggestions — returns top matching product names and images',
    description: 'Use for the search-as-you-type dropdown. Minimum 2 characters. Cached for 30 s.',
  })
  suggest(@Query() dto: SuggestQueryDto) {
    return this.searchService.suggest(dto);
  }
}
