import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      include: { children: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: { children: true, parent: true },
    });
    if (!category) throw new NotFoundException('Categoria no encontrada');
    return category;
  }

  async create(tenantId: string, data: { name: string; parentId?: string; sortOrder?: number }) {
    return this.prisma.category.create({
      data: { tenantId, ...data },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; parentId?: string; sortOrder?: number }) {
    await this.findOne(tenantId, id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.category.delete({ where: { id } });
  }
}
