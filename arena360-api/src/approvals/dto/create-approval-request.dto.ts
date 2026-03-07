import { IsString, IsOptional, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ApprovalStepDto {
  @IsString()
  approverId!: string;
}

export class CreateApprovalRequestDto {
  @IsString()
  entityType!: 'REPORT' | 'INVOICE' | 'CONTRACT';

  @IsString()
  entityId!: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps?: ApprovalStepDto[];
}
