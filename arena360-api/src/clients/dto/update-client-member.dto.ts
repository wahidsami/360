import { IsEnum } from 'class-validator';
import { GlobalRole } from '@prisma/client';

export class UpdateClientMemberDto {
    @IsEnum(GlobalRole)
    role: GlobalRole;
}
