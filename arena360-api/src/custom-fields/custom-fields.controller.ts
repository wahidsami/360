import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CreateCustomFieldDefDto,
  UpdateCustomFieldDefDto,
  SetCustomFieldValuesDto,
} from './dto/custom-field-def.dto';

@UseGuards(JwtAuthGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  @Get('defs')
  listDefs(@Request() req: any, @Query('entityType') entityType?: string) {
    return this.service.listDefs(
      req.user.orgId,
      req.user,
      entityType as any,
    );
  }

  @Post('defs')
  createDef(@Request() req: any, @Body() dto: CreateCustomFieldDefDto) {
    return this.service.createDef(req.user.orgId, req.user, dto);
  }

  @Patch('defs/:id')
  updateDef(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDefDto,
  ) {
    return this.service.updateDef(req.user.orgId, id, req.user, dto);
  }

  @Delete('defs/:id')
  deleteDef(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteDef(req.user.orgId, id, req.user);
  }

  @Get('values/:entityType/:entityId')
  getValues(
    @Request() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.getValues(
      req.user.orgId,
      entityType as any,
      entityId,
      req.user,
    );
  }

  @Patch('values/:entityType/:entityId')
  setValues(
    @Request() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: SetCustomFieldValuesDto,
  ) {
    return this.service.setValues(
      req.user.orgId,
      entityType as any,
      entityId,
      req.user,
      dto.values,
    );
  }
}
