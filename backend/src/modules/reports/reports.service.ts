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
        ? { createdAt: { ...(params.from && { gte: params.from }), ...(params.to && { lte: params.to }) } }
        : {}),
    };
    const [transactions, totalAgg] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({ where, _sum: { total: true, taxAmount: true, discountAmount: true } }),
    ]);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayWhere = { tenantId, status: TransactionStatus.COMPLETED, createdAt: { gte: todayStart } };
    const [todayTxCount, todayAgg] = await Promise.all([
      this.prisma.transaction.count({ where: todayWhere }),
      this.prisma.transaction.aggregate({ where: todayWhere, _sum: { total: true } }),
    ]);
    const grossSales = Number(totalAgg._sum.total ?? 0);
    const discounts  = Number(totalAgg._sum.discountAmount ?? 0);
    const netSales   = grossSales - discounts;
    return {
      totalTransactions: transactions, totalRevenue: grossSales,
      totalTax: Number(totalAgg._sum.taxAmount ?? 0), totalDiscounts: discounts,
      grossSales, refunds: 0, discounts, netSales, grossProfit: netSales,
      todayTransactions: todayTxCount, todayRevenue: Number(todayAgg._sum.total ?? 0),
    };
  }

  async getSalesByProduct(tenantId: string, params?: { from?: Date; to?: Date }) {
    const items = await this.prisma.transactionItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        transaction: {
          tenantId,
          status: TransactionStatus.COMPLETED,
          ...(params?.from || params?.to
            ? { createdAt: { ...(params?.from && { gte: params.from }), ...(params?.to && { lte: params.to }) } }
            : {}),
        },
      },
      _sum: { quantity: true, lineTotal: true, discountAmount: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 20,
    });

    return items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      totalQuantity: item._sum.quantity,
      totalRevenue: item._sum.lineTotal,
      totalDiscount: item._sum.discountAmount,
    }));
  }

  async getDailySales(tenantId: string, params?: { from?: Date; to?: Date; days?: number } | number) {
    // Backward-compatible: accept a plain number (old signature) or params object
    let from: Date;
    let to: Date | undefined;

    if (typeof params === 'number') {
      from = new Date();
      from.setDate(from.getDate() - params);
    } else if (params && typeof params === 'object') {
      if (params.from) {
        from = params.from;
      } else {
        from = new Date();
        from.setDate(from.getDate() - (params.days ?? 30));
      }
      to = params.to;
    } else {
      from = new Date();
      from.setDate(from.getDate() - 30);
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        tenantId,
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: from, ...(to && { lte: to }) },
      },
      select: { createdAt: true, total: true, discountAmount: true, subtotal: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped: Record<string, { date: string; grossSales: number; discounts: number; netSales: number; count: number }> = {};
    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = { date, grossSales: 0, discounts: 0, netSales: 0, count: 0 };
      const gross = Number(tx.total ?? 0);
      const disc  = Number(tx.discountAmount ?? 0);
      grouped[date].grossSales += gross;
      grouped[date].discounts  += disc;
      grouped[date].netSales   += gross - disc;
      grouped[date].count      += 1;
    }

    return Object.values(grouped);
  }

  async getReceipts(tenantId: string, params?: { from?: Date; to?: Date }) {
    return this.prisma.transaction.findMany({
      where: {
        tenantId,
        ...(params?.from || params?.to
          ? { createdAt: { ...(params?.from && { gte: params.from }), ...(params?.to && { lte: params.to }) } }
          : {}),
      },
      select: {
        id: true,
        transactionNumber: true,
        status: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        total: true,
        createdAt: true,
        cashier: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        payments: { select: { method: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSalesByEmployee(tenantId: string, params?: { from?: Date; to?: Date }) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        tenantId,
        status: TransactionStatus.COMPLETED,
        ...(params?.from || params?.to
          ? { createdAt: { ...(params?.from && { gte: params.from }), ...(params?.to && { lte: params.to }) } }
          : {}),
      },
      select: {
        cashierId: true,
        cashier: { select: { name: true } },
        total: true,
        discountAmount: true,
      },
    });

    const refunds = await this.prisma.transaction.findMany({
      where: {
        tenantId,
        status: TransactionStatus.REFUNDED,
        ...(params?.from || params?.to
          ? { createdAt: { ...(params?.from && { gte: params.from }), ...(params?.to && { lte: params.to }) } }
          : {}),
      },
      select: { cashierId: true, total: true },
    });

    const map: Record<string, {
      employeeId: string; name: string;
      grossSales: number; discounts: number; netSales: number;
      refunds: number; receipts: number;
    }> = {};

    for (const tx of transactions) {
      const id = tx.cashierId;
      if (!map[id]) map[id] = { employeeId: id, name: tx.cashier?.name ?? '', grossSales: 0, discounts: 0, netSales: 0, refunds: 0, receipts: 0 };
      const gross = Number(tx.total ?? 0);
      const disc  = Number(tx.discountAmount ?? 0);
      map[id].grossSales += gross;
      map[id].discounts  += disc;
      map[id].netSales   += gross - disc;
      map[id].receipts   += 1;
    }

    for (const tx of refunds) {
      const id = tx.cashierId;
      if (!map[id]) map[id] = { employeeId: id, name: '', grossSales: 0, discounts: 0, netSales: 0, refunds: 0, receipts: 0 };
      map[id].refunds += Number(tx.total ?? 0);
    }

    return Object.values(map).map((e) => ({
      ...e,
      avgSale: e.receipts > 0 ? e.netSales / e.receipts : 0,
    }));
  }

  async getSalesByPaymentMethod(tenantId: string, params?: { from?: Date; to?: Date }) {
    const dateFilter = params?.from || params?.to
      ? { createdAt: { ...(params?.from && { gte: params.from }), ...(params?.to && { lte: params.to }) } }
      : {};

    const [completedPayments, refundedPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: { transaction: { tenantId, status: TransactionStatus.COMPLETED, ...dateFilter } },
        select: { method: true, gatewayName: true, amount: true },
      }),
      this.prisma.payment.findMany({
        where: { transaction: { tenantId, status: TransactionStatus.REFUNDED, ...dateFilter } },
        select: { method: true, gatewayName: true, amount: true },
      }),
    ]);

    const map: Record<string, { method: string; transactions: number; amount: number; refundTransactions: number; refundAmount: number }> = {};

    for (const p of completedPayments) {
      const m = (p.gatewayName || p.method) as string;
      if (!map[m]) map[m] = { method: m, transactions: 0, amount: 0, refundTransactions: 0, refundAmount: 0 };
      map[m].transactions += 1;
      map[m].amount       += Number(p.amount ?? 0);
    }

    for (const p of refundedPayments) {
      const m = (p.gatewayName || p.method) as string;
      if (!map[m]) map[m] = { method: m, transactions: 0, amount: 0, refundTransactions: 0, refundAmount: 0 };
      map[m].refundTransactions += 1;
      map[m].refundAmount       += Number(p.amount ?? 0);
    }

    return Object.values(map).map((r) => ({
      ...r,
      netAmount: r.amount - r.refundAmount,
    }));
  }

  async getSalesByCategory(tenantId: string, params?: { from?: Date; to?: Date }) {
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          tenantId,
          status: TransactionStatus.COMPLETED,
          ...(params?.from || params?.to
            ? { createdAt: { ...(params?.from && { gte: params.from }), ...(params?.to && { lte: params.to }) } }
            : {}),
        },
      },
      select: {
        quantity: true,
        lineTotal: true,
        discountAmount: true,
        product: {
          select: {
            costPrice: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const map: Record<string, { categoryId: string; name: string; itemsSold: number; netSales: number; cogs: number }> = {};

    for (const item of items) {
      const cat = item.product?.category;
      const categoryId = cat?.id ?? '__none__';
      const categoryName = cat?.name ?? 'Sin categoría';

      if (!map[categoryId]) map[categoryId] = { categoryId, name: categoryName, itemsSold: 0, netSales: 0, cogs: 0 };

      const qty      = Number(item.quantity ?? 0);
      const line     = Number(item.lineTotal ?? 0);
      const disc     = Number(item.discountAmount ?? 0);
      const cost     = Number(item.product?.costPrice ?? 0);

      map[categoryId].itemsSold += qty;
      map[categoryId].netSales  += line - disc;
      map[categoryId].cogs      += cost * qty;
    }

    return Object.values(map).map((c) => ({
      ...c,
      grossProfit: c.netSales - c.cogs,
    }));
  }

  async getReceiptsSummary(tenantId: string, params?: { from?: Date; to?: Date }) {
    const where = {
      tenantId,
      ...(params?.from || params?.to
        ? { createdAt: { ...(params?.from && { gte: params.from }), ...(params?.to && { lte: params.to }) } }
        : {}),
    };

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: { status: true, total: true },
    });

    const summary = {
      totalReceipts: transactions.length,
      totalSales: 0,
      totalRefunds: 0,
    };

    for (const tx of transactions) {
      if (tx.status === TransactionStatus.COMPLETED) {
        summary.totalSales += Number(tx.total ?? 0);
      } else if (tx.status === TransactionStatus.REFUNDED) {
        summary.totalRefunds += Number(tx.total ?? 0);
      }
    }

    return summary;
  }
}
