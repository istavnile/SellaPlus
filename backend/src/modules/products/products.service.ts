import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { search?: string; categoryId?: string; isActive?: boolean }) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        ...(params?.isActive !== undefined && { isActive: params.isActive }),
        ...(params?.categoryId && { categoryId: params.categoryId }),
        ...(params?.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { sku: { contains: params.search, mode: 'insensitive' } },
            { barcode: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          include: {
            optionValues: {
              include: { optionValue: { include: { option: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        options: { include: { values: true } },
        variants: {
          include: {
            optionValues: {
              include: { optionValue: { include: { option: true } } },
            },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async findByBarcode(tenantId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, barcode, isActive: true },
      include: {
        category: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true } },
      },
    });
    if (!product) {
      // Check variants
      const variant = await this.prisma.productVariant.findFirst({
        where: { barcode, isActive: true, product: { tenantId } },
        include: {
          product: {
            include: {
              category: true,
              images: { take: 1 },
            },
          },
          optionValues: {
            include: { optionValue: { include: { option: true } } },
          },
        },
      });
      return variant;
    }
    return product;
  }

  async create(tenantId: string, data: any) {
    const { images, options, variants, ...productData } = data;
    return this.prisma.product.create({
      data: {
        tenantId,
        ...productData,
        ...(images && {
          images: { create: images },
        }),
      },
      include: { category: true, images: true, variants: true },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    await this.findOne(tenantId, id);
    const { images, options, variants, ...productData } = data;
    return this.prisma.product.update({
      where: { id },
      data: productData,
      include: { category: true, images: true, variants: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
