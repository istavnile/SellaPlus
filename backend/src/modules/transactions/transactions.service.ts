import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionStatus, PaymentMethod } from '@prisma/client';

export interface CreateTransactionDto {
  customerId?: string;
  items: {
    productId: string;
    variantId?: string;
    productName: string;
    variantLabel?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
    lineTotal: number;
  }[];
  payments: {
    method: PaymentMethod;
    amount: number;
    cashTendered?: number;
    changeGiven?: number;
  }[];
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  notes?: string;
}

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { status?: TransactionStatus; limit?: number; offset?: number }) {
    return this.prisma.transaction.findMany({
      where: {
        tenantId,
        ...(params?.status && { status: params.status }),
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        cashier: { select: { id: true, name: true } },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: params?.limit ?? 50,
      skip: params?.offset ?? 0,
    });
  }

  async findOne(tenantId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        cashier: { select: { id: true, name: true, email: true } },
        items: true,
        payments: true,
        receipts: true,
      },
    });
    if (!transaction) throw new NotFoundException('Transaccion no encontrada');
    return transaction;
  }

  async create(tenantId: string, cashierId: string, dto: CreateTransactionDto) {
    // Generate sequential transaction number
    const count = await this.prisma.transaction.count({ where: { tenantId } });
    const transactionNumber = `TXN-${String(count + 1).padStart(6, '0')}`;

    const transaction = await this.prisma.transaction.create({
      data: {
        tenantId,
        cashierId,
        transactionNumber,
        customerId: dto.customerId,
        status: TransactionStatus.COMPLETED,
        subtotal: dto.subtotal,
        discountAmount: dto.discountAmount ?? 0,
        taxAmount: dto.taxAmount ?? 0,
        total: dto.total,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantLabel: item.variantLabel,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount ?? 0,
            taxRate: item.taxRate ?? 0,
            taxAmount: item.taxAmount ?? 0,
            lineTotal: item.lineTotal,
          })),
        },
        payments: {
          create: dto.payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            cashTendered: p.cashTendered,
            changeGiven: p.changeGiven,
          })),
        },
      },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
    });

    return transaction;
  }

  async cancel(tenantId: string, id: string) {
    const transaction = await this.findOne(tenantId, id);
    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Solo se pueden cancelar transacciones pendientes');
    }
    return this.prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.CANCELLED },
    });
  }
}
