import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateFindingCommentDto {
    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    parentId?: string;
}
