import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class SignupOrgDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  orgName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  orgSlug: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MaxLength(200)
  adminName?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
