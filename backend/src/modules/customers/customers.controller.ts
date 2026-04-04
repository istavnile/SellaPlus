import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Res, UseGuards,
  UseInterceptors, UploadedFile,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
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

  @Get('export')
  @ApiOperation({ summary: 'Exportar clientes a CSV' })
  async export(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const csv = await this.customersService.exportCsv(user.tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clientes.csv"');
    res.send(csv);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar clientes desde CSV' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.customersService.importCsv(user.tenantId, file.buffer);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Eliminar clientes en masa' })
  bulkRemove(@CurrentUser() user: JwtPayload, @Body('ids') ids: string[]) {
    return this.customersService.bulkRemove(user.tenantId, ids);
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
