import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WikiService } from './wiki.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateWikiPageDto, UpdateWikiPageDto } from './dto/wiki.dto';

@UseGuards(JwtAuthGuard)
@Controller('wiki')
export class WikiController {
  constructor(private readonly service: WikiService) {}

  @Get('pages')
  listPages(@Request() req: any) {
    return this.service.listPages(req.user.orgId, req.user);
  }

  @Get('pages/slug/:slug')
  getBySlug(@Request() req: any, @Param('slug') slug: string) {
    return this.service.getBySlug(req.user.orgId, slug, req.user);
  }

  @Get('pages/:id')
  getById(@Request() req: any, @Param('id') id: string) {
    return this.service.getById(req.user.orgId, id, req.user);
  }

  @Post('pages')
  create(@Request() req: any, @Body() dto: CreateWikiPageDto) {
    return this.service.create(req.user.orgId, req.user, dto);
  }

  @Patch('pages/:id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWikiPageDto,
  ) {
    return this.service.update(req.user.orgId, id, req.user, dto);
  }

  @Delete('pages/:id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.orgId, id, req.user);
  }

  @Get('pages/:id/versions')
  getVersions(@Request() req: any, @Param('id') id: string) {
    return this.service.getVersions(req.user.orgId, id, req.user);
  }
}
