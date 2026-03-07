
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
    @IsString()
    @IsNotEmpty()
    token: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
