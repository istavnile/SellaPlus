import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PosDevicesService } from './pos-devices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('POS Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pos-devices')
export class PosDevicesController {
  constructor(private posDevicesService: PosDevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar dispositivos TPV' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.posDevicesService.findAll(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear dispositivo TPV' })
  create(@CurrentUser() user: JwtPayload, @Body('name') name: string) {
    return this.posDevicesService.create(user.tenantId, name);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar dispositivo TPV' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.posDevicesService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar dispositivo TPV' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posDevicesService.remove(user.tenantId, id);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: 'Cajero reclama un TPV con su PIN' })
  claim(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('pin') pin: string,
  ) {
    return this.posDevicesService.claim(user.tenantId, id, user.sub, pin);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Liberar un TPV' })
  release(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('sessionToken') sessionToken: string,
  ) {
    return this.posDevicesService.release(user.tenantId, id, sessionToken);
  }
}
