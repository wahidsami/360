import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { GlobalRole } from '@prisma/client';

export class AddMemberDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsEnum(GlobalRole)
    role: GlobalRole;
}
