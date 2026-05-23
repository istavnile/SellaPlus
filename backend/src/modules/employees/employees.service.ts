import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, 
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, 
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Colaborador no encontrado');
    
    const fullUser = await this.prisma.user.findUnique({ where: { id }, select: { pinHash: true } });
    return { ...user, hasPin: !!fullUser?.pinHash };
  }

  async create(tenantId: string, data: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    password?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: data.email } },
    });
    if (existing) throw new ConflictException('Ya existe un colaborador con ese email');

    const passwordHash = await bcrypt.hash(data.password || Math.random().toString(36).slice(-12), 10);

    return this.prisma.user.create({
      data: { tenantId, passwordHash, name: data.name, email: data.email, role: data.role },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      },
    });
  }

  async setPin(tenantId: string, id: string, pin: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Colaborador no encontrado');

    const pinHash = await bcrypt.hash(pin, 10);
    await this.prisma.user.update({ where: { id }, data: { pinHash } });
    return { ok: true };
  }

  async update(tenantId: string, id: string, data: Partial<{
    name: string; email: string; role: UserRole; isActive: boolean; clearPin: boolean;
  }>) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Colaborador no encontrado');

    const { clearPin, ...rest } = data;
    const updateData: any = { ...rest };
    if (clearPin) updateData.pinHash = null;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Colaborador no encontrado');
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Owner resets another user's password directly (no email token required).
   * ADMIN may reset passwords of non-owner accounts only.
   */
  async resetPassword(
    tenantId: string,
    targetId: string,
    newPassword: string,
    requesterRole: UserRole,
  ) {
    const target = await this.prisma.user.findFirst({ where: { id: targetId, tenantId } });
    if (!target) throw new NotFoundException('Colaborador no encontrado');

    // Only OWNER can reset another OWNER's password
    if (target.role === UserRole.OWNER && requesterRole !== UserRole.OWNER) {
      throw new ForbiddenException('Solo el propietario puede cambiar la contraseña de otro propietario');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: targetId },
      data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
    });
    return { ok: true };
  }
}
