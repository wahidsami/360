import { IsEnum } from 'class-validator';
import { GlobalRole } from '@prisma/client';

export class UpdateMemberDto {
    @IsEnum(GlobalRole)
    role: GlobalRole;
}
