import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReplyDto {
    @IsString()
    @MinLength(1)
    body: string;

    @IsOptional()
    @IsString()
    clientRequestId?: string;
}
