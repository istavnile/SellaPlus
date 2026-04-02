import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { featureFlags: true },
    });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');
    return tenant;
  }

  async updateSettings(
    tenantId: string,
    data: Partial<{ name: string; currency: string; timezone: string; locale: string; logoUrl: string }>,
  ) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async toggleFeatureFlag(tenantId: string, featureKey: string, isEnabled: boolean) {
    return this.prisma.featureFlag.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      update: { isEnabled },
      create: { tenantId, featureKey, isEnabled },
    });
  }
}
