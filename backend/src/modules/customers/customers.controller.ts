import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.customersService.findAll(user.tenantId, { search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cliente' })
  create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.customersService.create(user.tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.customersService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cliente' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.remove(user.tenantId, id);
  }
}
