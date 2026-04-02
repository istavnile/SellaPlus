import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { search?: string }) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(params?.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search, mode: 'insensitive' } },
            { customerCode: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            transactionNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async create(tenantId: string, data: {
    name: string;
    email?: string;
    phone?: string;
    customerCode?: string;
    addressLine1?: string;
    city?: string;
    notes?: string;
  }) {
    return this.prisma.customer.create({
      data: { tenantId, ...data },
    });
  }

  async update(tenantId: string, id: string, data: Partial<{
    name: string;
    email: string;
    phone: string;
    addressLine1: string;
    city: string;
    notes: string;
  }>) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.delete({ where: { id } });
  }
}
