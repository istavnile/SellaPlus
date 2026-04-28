import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionStatus, PaymentMethod } from '@prisma/client';
import { MailingService } from '../../common/mailing/mailing.service';
import { generateReceiptHtml } from './templates/receipt.template';

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
    methodName?: string;
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
  constructor(
    private prisma: PrismaService,
    private mailing: MailingService,
  ) {}

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
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Use MAX of existing numbers (not count) so deletions don't reuse old numbers
      const last = await this.prisma.transaction.findFirst({
        where: { tenantId },
        orderBy: { transactionNumber: 'desc' },
        select: { transactionNumber: true },
      });

      let nextNumber = 1;
      if (last) {
        const match = last.transactionNumber.match(/TXN-(\d+)/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }

      const transactionNumber = `TXN-${String(nextNumber).padStart(6, '0')}`;

      try {
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
                gatewayName: p.methodName,
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
      } catch (error: any) {
        // P2002 = unique constraint violation — retry with incremented number
        if (error?.code === 'P2002' && attempt < MAX_RETRIES - 1) continue;
        throw error;
      }
    }
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

  async sendReceipt(tenantId: string, transactionId: string, email: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
      include: {
        customer: true,
        cashier: { select: { name: true } },
        items: true,
        payments: true,
      },
    });

    if (!transaction) throw new NotFoundException('Transacción no encontrada');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    // Build logo attachment if tenant has a logo (base64 data URL → CID attachment)
    const attachments: import('../../common/mailing/mailing.service').MailAttachment[] = [];
    let hasLogo = false;
    if (tenant?.logoUrl && tenant.logoUrl.startsWith('data:')) {
      try {
        const matches = tenant.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const ext = mimeType.split('/')[1] ?? 'png';
          attachments.push({
            filename: `logo.${ext}`,
            content: Buffer.from(base64Data, 'base64'),
            cid: 'receipt_logo',
          });
          hasLogo = true;
        }
      } catch { /* ignore logo errors */ }
    }

    const html = generateReceiptHtml({
      transaction: transaction as any,
      tenantName: tenant?.name || 'SellaPlus',
      tenantAddress: tenant?.address || null,
      tenantPhone: tenant?.phone || null,
      receiptHeader: tenant?.receiptHeader || null,
      receiptFooter: tenant?.receiptFooter || null,
      hasLogo,
    });

    const smtpUser = process.env.SMTP_USER || '';
    const from = `${tenant?.name || 'SellaPlus'} <${smtpUser}>`;

    await this.mailing.sendMail(
      email,
      `Tu recibo de ${tenant?.name || 'SellaPlus'}`,
      html,
      { from, attachments },
    );

    // Track that receipt was sent
    await this.prisma.receipt.create({
      data: {
        transactionId: transaction.id,
        email,
        status: 'SENT',
        sentAt: new Date(),
      }
    });

    return { message: 'Recibo enviado con éxito' };
  }

  async delete(tenantId: string, id: string) {
    // Verify it exists AND belongs to the tenant
    const transaction = await this.findOne(tenantId, id);
    
    // Delete in correct FK dependency order
    await this.prisma.receipt.deleteMany({ where: { transactionId: id } });
    await this.prisma.payment.deleteMany({ where: { transactionId: id } });
    await this.prisma.transactionItem.deleteMany({ where: { transactionId: id } });
    await this.prisma.transaction.delete({ where: { id } });

    return { message: 'Venta eliminada con éxito' };
  }

  // ── Reset: borrar TODAS las ventas del tenant ───────────────────────────────

  async resetAllTransactions(tenantId: string): Promise<{ deleted: number }> {
    // Get all transaction IDs for this tenant
    const txns = await this.prisma.transaction.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const txnIds = txns.map((t) => t.id);
    const count  = txnIds.length;

    if (count === 0) return { deleted: 0 };

    // Delete in correct FK dependency order
    await this.prisma.receipt.deleteMany({ where: { transactionId: { in: txnIds } } });
    await this.prisma.payment.deleteMany({ where: { transactionId: { in: txnIds } } });
    await this.prisma.transactionItem.deleteMany({ where: { transactionId: { in: txnIds } } });
    await this.prisma.transaction.deleteMany({ where: { id: { in: txnIds } } });

    return { deleted: count };
  }
}

