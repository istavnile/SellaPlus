import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

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
  @ApiOperation({ summary: 'Crear colaborador' })
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
  @ApiOperation({ summary: 'Desactivar colaborador' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.employeesService.remove(user.tenantId, id);
  }
}
