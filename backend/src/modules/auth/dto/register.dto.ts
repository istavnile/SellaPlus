import { IsEmail, IsString, MinLength, IsNotEmpty, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Mi Tienda' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'mi-tienda' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'El slug solo puede contener letras minusculas, numeros y guiones' })
  slug: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'juan@mitienda.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'America/Mexico_City', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;
}
