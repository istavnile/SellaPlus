import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar colaboradores' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.employeesService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un colaborador' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.employeesService.findOne(user.tenantId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear colaborador (propietario o administrador)' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; email: string; phone?: string; role: UserRole; password?: string },
  ) {
    return this.employeesService.create(user.tenantId, body);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Establecer PIN de acceso al TPV' })
  setPin(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('pin') pin: string,
  ) {
    return this.employeesService.setPin(user.tenantId, id, pin);
  }

  @Patch(':id/password')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar/resetear contraseña de un colaborador (propietario o administrador)' })
  resetPassword(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.employeesService.resetPassword(user.tenantId, id, newPassword, user.role as UserRole);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar colaborador' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.employeesService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar colaborador (propietario o administrador)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.employeesService.remove(user.tenantId, id);
  }
}
