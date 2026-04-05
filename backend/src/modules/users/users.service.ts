import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(tenantId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async hasPin(tenantId: string, userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { pinHash: true },
    });
    return !!user?.pinHash;
  }

  async setPin(tenantId: string, userId: string, pin: string): Promise<void> {
    if (!/^\d{4}$/.test(pin)) {
      throw new BadRequestException('El PIN debe ser de 4 dígitos numéricos');
    }
    const pinHash = await bcrypt.hash(pin, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash },
    });
  }

  async verifyPin(tenantId: string, userId: string, pin: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { pinHash: true },
    });
    if (!user?.pinHash) {
      throw new UnauthorizedException('Este usuario no tiene PIN configurado');
    }
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      throw new UnauthorizedException('PIN incorrecto');
    }
  }
}
