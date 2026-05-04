import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

@Injectable()
export class PosDevicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const devices = await this.prisma.posDevice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch cashier names for in-use devices
    const cashierIds = devices.map((d) => d.currentCashierId).filter(Boolean) as string[];
    const cashiers = cashierIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: cashierIds } }, select: { id: true, name: true, email: true } })
      : [];
    const cashierMap = Object.fromEntries(cashiers.map((c) => [c.id, c]));

    return devices.map((d) => ({
      ...d,
      currentCashier: d.currentCashierId ? cashierMap[d.currentCashierId] ?? null : null,
    }));
  }

  async create(tenantId: string, name: string) {
    return this.prisma.posDevice.create({ data: { tenantId, name } });
  }

  async update(tenantId: string, id: string, data: { name?: string; isActive?: boolean }) {
    const device = await this.prisma.posDevice.findFirst({ where: { id, tenantId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    return this.prisma.posDevice.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const device = await this.prisma.posDevice.findFirst({ where: { id, tenantId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    return this.prisma.posDevice.delete({ where: { id } });
  }

  async claim(tenantId: string, deviceId: string, userId: string, pin: string) {
    const device = await this.prisma.posDevice.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    if (!device.isActive) throw new ConflictException('Este dispositivo está desactivado');
    if (device.currentCashierId) throw new ConflictException('Este TPV ya está en uso');

    // Verify PIN
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.pinHash) throw new UnauthorizedException('Este colaborador no tiene PIN configurado');
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) throw new UnauthorizedException('PIN incorrecto');

    const sessionToken = randomUUID();
    await this.prisma.posDevice.update({
      where: { id: deviceId },
      data: { currentCashierId: userId, sessionToken },
    });
    return { ok: true, sessionToken, deviceId, deviceName: device.name, cashierName: user.name };
  }

  async release(tenantId: string, deviceId: string, sessionToken: string) {
    const device = await this.prisma.posDevice.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    if (device.sessionToken !== sessionToken) throw new UnauthorizedException('Sesión inválida');

    await this.prisma.posDevice.update({
      where: { id: deviceId },
      data: { currentCashierId: null, sessionToken: null },
    });
    return { ok: true };
  }
}
