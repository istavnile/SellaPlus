import { Controller, Get, Param, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del negocio' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.findOne(user.tenantId, id);
  }

  @Get('me/pin/status')
  @ApiOperation({ summary: 'Verificar si el usuario actual tiene PIN configurado' })
  async getPinStatus(@CurrentUser() user: JwtPayload) {
    const hasPin = await this.usersService.hasPin(user.tenantId, user.sub);
    return { hasPin };
  }

  @Post('me/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crear o actualizar el PIN del usuario actual' })
  async setPin(@CurrentUser() user: JwtPayload, @Body() body: { pin: string }) {
    await this.usersService.setPin(user.tenantId, user.sub, body.pin);
    return { message: 'PIN configurado correctamente' };
  }

  @Post('me/pin/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar el PIN del usuario actual' })
  async verifyPin(@CurrentUser() user: JwtPayload, @Body() body: { pin: string }) {
    await this.usersService.verifyPin(user.tenantId, user.sub, body.pin);
    return { valid: true };
  }
}
