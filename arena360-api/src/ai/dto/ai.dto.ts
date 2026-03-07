import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  content: string;
}

export class ChatDto {
  @IsArray()
  @IsObject({ each: true })
  messages: ChatMessageDto[];
}

export class ProjectContextDto {
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class FindingContextDto {
  @IsString()
  findingId: string;
}
