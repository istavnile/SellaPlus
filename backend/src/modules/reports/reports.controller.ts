import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales/summary')
  @ApiOperation({ summary: 'Resumen de ventas' })
  @ApiQuery({ name: 'from', required: false, description: 'Fecha inicio ISO' })
  @ApiQuery({ name: 'to', required: false, description: 'Fecha fin ISO' })
  @ApiQuery({ name: 'cashierId', required: false })
  getSalesSummary(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.reportsService.getSalesSummary(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cashierId,
    });
  }

  @Get('sales/by-product')
  @ApiOperation({ summary: 'Ventas por producto' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'cashierId', required: false })
  getSalesByProduct(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.reportsService.getSalesByProduct(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cashierId,
    });
  }

  @Get('sales/daily')
  @ApiOperation({ summary: 'Ventas diarias' })
  @ApiQuery({ name: 'days', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'cashierId', required: false })
  getDailySales(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.reportsService.getDailySales(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      days: days ? parseInt(days) : undefined,
      cashierId,
    });
  }

  @Get('sales/by-employee')
  @ApiOperation({ summary: 'Ventas por colaborador' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'cashierId', required: false })
  getSalesByEmployee(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.reportsService.getSalesByEmployee(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cashierId,
    });
  }

  @Get('sales/by-payment-method')
  @ApiOperation({ summary: 'Ventas por método de pago' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'cashierId', required: false })
  getSalesByPaymentMethod(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.reportsService.getSalesByPaymentMethod(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cashierId,
    });
  }

  @Get('sales/by-category')
  @ApiOperation({ summary: 'Ventas por categoría' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'cashierId', required: false })
  getSalesByCategory(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.reportsService.getSalesByCategory(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cashierId,
    });
  }

  @Get('receipts')
  @ApiOperation({ summary: 'Recibos / transacciones' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'cashierId', required: false })
  getReceipts(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.reportsService.getReceipts(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cashierId,
    });
  }

  @Get('receipts/summary')
  @ApiOperation({ summary: 'Resumen de recibos' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'cashierId', required: false })
  getReceiptsSummary(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.reportsService.getReceiptsSummary(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      cashierId,
    });
  }
}
