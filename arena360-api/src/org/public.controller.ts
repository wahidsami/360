import { Controller, Get, Param } from '@nestjs/common';
import { OrgService } from './org.service';

@Controller('public')
export class PublicController {
  constructor(private readonly orgService: OrgService) {}

  @Get('org-by-slug/:slug')
  getOrgBySlug(@Param('slug') slug: string) {
    return this.orgService.getPublicOrgBySlug(slug);
  }
}
