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
    data: Partial<{ name: string; currency: string; timezone: string; locale: string; logoUrl: string; address: string; phone: string; receiptHeader: string; receiptFooter: string }>,
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

  // ── Payment Methods ────────────────────────────────────────────────────────

  private readonly DEFAULT_METHODS = [
    { name: 'Efectivo', type: 'CASH',     sortOrder: 0 },
    { name: 'Tarjeta',  type: 'CARD',     sortOrder: 1 },
  ];

  async getPaymentMethods(tenantId: string) {
    const existing = await this.prisma.tenantPaymentMethod.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
    // Auto-seed defaults on first access
    if (existing.length === 0) {
      await this.prisma.tenantPaymentMethod.createMany({
        data: this.DEFAULT_METHODS.map((m) => ({ tenantId, ...m })),
      });
      return this.prisma.tenantPaymentMethod.findMany({
        where: { tenantId }, orderBy: { sortOrder: 'asc' },
      });
    }
    return existing;
  }

  async createPaymentMethod(tenantId: string, data: { name: string; type: string }) {
    const last = await this.prisma.tenantPaymentMethod.findFirst({
      where: { tenantId }, orderBy: { sortOrder: 'desc' },
    });
    return this.prisma.tenantPaymentMethod.create({
      data: { tenantId, name: data.name, type: data.type, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }

  async updatePaymentMethod(tenantId: string, id: string, data: Partial<{ name: string; type: string; isEnabled: boolean; sortOrder: number }>) {
    return this.prisma.tenantPaymentMethod.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deletePaymentMethod(tenantId: string, id: string) {
    return this.prisma.tenantPaymentMethod.deleteMany({ where: { id, tenantId } });
  }

  // ── Role Permissions ───────────────────────────────────────────────────────

  private readonly SECTIONS = ['dashboard', 'products', 'customers', 'reports', 'employees', 'settings', 'pos'];

  private readonly DEFAULT_PERMISSIONS: Record<string, string[]> = {
    OWNER:   ['dashboard', 'products', 'customers', 'reports', 'employees', 'settings', 'pos'],
    ADMIN:   ['dashboard', 'products', 'customers', 'reports', 'pos'],
    MANAGER: ['dashboard', 'products', 'customers', 'pos'],
    CASHIER: ['pos'],
  };

  async getRolePermissions(tenantId: string) {
    const existing = await this.prisma.rolePermission.findMany({ where: { tenantId } });

    // Auto-seed defaults on first access
    if (existing.length === 0) {
      const rows: { tenantId: string; role: string; section: string; isEnabled: boolean }[] = [];
      for (const [role, allowed] of Object.entries(this.DEFAULT_PERMISSIONS)) {
        for (const section of this.SECTIONS) {
          rows.push({ tenantId, role, section, isEnabled: allowed.includes(section) });
        }
      }
      await this.prisma.rolePermission.createMany({ data: rows });
      return this.prisma.rolePermission.findMany({ where: { tenantId } });
    }
    return existing;
  }

  async setRolePermission(tenantId: string, role: string, section: string, isEnabled: boolean) {
    return this.prisma.rolePermission.upsert({
      where: { tenantId_role_section: { tenantId, role, section } },
      update: { isEnabled },
      create: { tenantId, role, section, isEnabled },
    });
  }
}
