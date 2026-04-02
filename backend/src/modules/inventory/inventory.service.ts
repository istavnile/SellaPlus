import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getMovements(tenantId: string, variantId?: string) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        ...(variantId && { variantId }),
        variant: { product: { tenantId } },
      },
      include: {
        variant: {
          include: {
            product: { select: { id: true, name: true } },
            optionValues: {
              include: { optionValue: { include: { option: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getLowStockProducts(tenantId: string) {
    return this.prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { tenantId, trackStock: true, isActive: true },
        stockQty: { lte: 5 },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            stockAlertThreshold: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
        },
        optionValues: {
          include: { optionValue: { include: { option: true } } },
        },
      },
      orderBy: { stockQty: 'asc' },
    });
  }

  async adjustStock(
    tenantId: string,
    variantId: string,
    quantity: number,
    type: MovementType,
    reason?: string,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, product: { tenantId } },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    const stockBefore = variant.stockQty;
    const stockAfter =
      type === MovementType.IN || type === MovementType.RETURN
        ? stockBefore + quantity
        : type === MovementType.ADJUSTMENT
        ? quantity
        : stockBefore - quantity;

    const [updatedVariant, movement] = await this.prisma.$transaction([
      this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQty: stockAfter },
      }),
      this.prisma.inventoryMovement.create({
        data: {
          variantId,
          type,
          quantity,
          stockBefore,
          stockAfter,
          reason,
        },
      }),
    ]);

    return { variant: updatedVariant, movement };
  }
}
