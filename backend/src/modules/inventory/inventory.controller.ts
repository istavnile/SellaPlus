import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { MovementType } from '@prisma/client';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('movements')
  @ApiOperation({ summary: 'Listar movimientos de inventario' })
  @ApiQuery({ name: 'variantId', required: false })
  getMovements(@CurrentUser() user: JwtPayload, @Query('variantId') variantId?: string) {
    return this.inventoryService.getMovements(user.tenantId, variantId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock bajo' })
  getLowStock(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getLowStockProducts(user.tenantId);
  }

  @Post('adjust/:variantId')
  @ApiOperation({ summary: 'Ajustar stock de una variante' })
  adjustStock(
    @CurrentUser() user: JwtPayload,
    @Param('variantId') variantId: string,
    @Body() body: { quantity: number; type: MovementType; reason?: string },
  ) {
    return this.inventoryService.adjustStock(
      user.tenantId,
      variantId,
      body.quantity,
      body.type,
      body.reason,
    );
  }
}
