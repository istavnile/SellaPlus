import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productsService.findAll(user.tenantId, { search, categoryId });
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Buscar producto por codigo de barras' })
  findByBarcode(@CurrentUser() user: JwtPayload, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(user.tenantId, barcode);
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
