import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { SearchService, SearchResultItem } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across projects, tasks, clients, findings' })
  async search(
    @Request() req: { user: { orgId: string } },
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ): Promise<SearchResultItem[]> {
    const orgId = req.user?.orgId;
    if (!orgId) return [];
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20;
    return this.searchService.search(orgId, q ?? '', limitNum);
  }
}
