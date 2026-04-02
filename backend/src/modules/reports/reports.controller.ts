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
  getSalesSummary(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getSalesSummary(user.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('sales/by-product')
  @ApiOperation({ summary: 'Ventas por producto' })
  getSalesByProduct(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getSalesByProduct(user.tenantId);
  }

  @Get('sales/daily')
  @ApiOperation({ summary: 'Ventas diarias (ultimos N dias)' })
  @ApiQuery({ name: 'days', required: false })
  getDailySales(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    return this.reportsService.getDailySales(user.tenantId, days ? parseInt(days) : 30);
  }
}
