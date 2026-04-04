import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TransactionsService, CreateTransactionDto } from './transactions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { TransactionStatus } from '@prisma/client';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar transacciones' })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: TransactionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.transactionsService.findAll(user.tenantId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener transaccion por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transactionsService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear transaccion (venta)' })
  create(@CurrentUser() user: JwtPayload, @Body() body: CreateTransactionDto) {
    return this.transactionsService.create(user.tenantId, user.sub, body);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar transaccion' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transactionsService.cancel(user.tenantId, id);
  }

  @Post(':id/send-receipt')
  @ApiOperation({ summary: 'Enviar recibo por correo' })
  sendReceipt(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('email') email: string,
  ) {
    return this.transactionsService.sendReceipt(user.tenantId, id, email);
  }
}
