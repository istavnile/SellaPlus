import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesSummary(tenantId: string, params?: { from?: Date; to?: Date }) {
    const where = {
      tenantId,
      status: TransactionStatus.COMPLETED,
      ...(params?.from || params?.to
        ? {
            createdAt: {
              ...(params.from && { gte: params.from }),
              ...(params.to && { lte: params.to }),
            },
          }
        : {}),
    };

    const [transactions, totalAgg] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({
        where,
        _sum: { total: true, taxAmount: true, discountAmount: true },
      }),
    ]);

    return {
      totalTransactions: transactions,
      totalRevenue: totalAgg._sum.total ?? 0,
      totalTax: totalAgg._sum.taxAmount ?? 0,
      totalDiscounts: totalAgg._sum.discountAmount ?? 0,
    };
  }

  async getSalesByProduct(tenantId: string, params?: { from?: Date; to?: Date }) {
    const dateFilter =
      params?.from || params?.to
        ? {
            transaction: {
              createdAt: {
                ...(params.from && { gte: params.from }),
                ...(params.to && { lte: params.to }),
              },
              status: TransactionStatus.COMPLETED,
            },
          }
        : { transaction: { status: TransactionStatus.COMPLETED, tenantId } };

    const items = await this.prisma.transactionItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        transaction: { tenantId, status: TransactionStatus.COMPLETED },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 20,
    });

    return items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      totalQuantity: item._sum.quantity,
      totalRevenue: item._sum.lineTotal,
    }));
  }

  async getDailySales(tenantId: string, days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        tenantId,
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: from },
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped: Record<string, { date: string; total: number; count: number }> = {};
    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = { date, total: 0, count: 0 };
      grouped[date].total += Number(tx.total);
      grouped[date].count += 1;
    }

    return Object.values(grouped);
  }
}
