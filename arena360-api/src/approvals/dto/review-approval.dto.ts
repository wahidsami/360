import { IsString, IsOptional } from 'class-validator';

export class ReviewApprovalDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
