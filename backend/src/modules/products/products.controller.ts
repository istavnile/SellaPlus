import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Res, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'stockAlert', required: false, enum: ['low_stock', 'out_of_stock'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('stockAlert') stockAlert?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(user.tenantId, {
      search,
      categoryId,
      stockAlert,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar productos a CSV' })
  async export(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const csv = await this.productsService.exportCsv(user.tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="productos.csv"');
    res.send(csv);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar productos desde CSV' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.importCsv(user.tenantId, file.buffer);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Buscar producto por codigo de barras' })
  findByBarcode(@CurrentUser() user: JwtPayload, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(user.tenantId, barcode);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Eliminar productos en masa' })
  bulkRemove(@CurrentUser() user: JwtPayload, @Body('ids') ids: string[]) {
    return this.productsService.bulkRemove(user.tenantId, ids);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear producto' })
  create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.productsService.create(user.tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.productsService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar producto' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.remove(user.tenantId, id);
  }
}
