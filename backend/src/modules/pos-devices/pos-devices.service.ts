import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const MAX_DEVICES_PER_USER = 2;
const STALE_SESSION_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class PosDevicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const devices = await this.prisma.posDevice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    const cashierIds = devices.map((d) => d.currentCashierId).filter(Boolean) as string[];
    const cashiers = cashierIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: cashierIds } },
          select: { id: true, name: true, email: true },
        })
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

    // Auto-release stale session on this device
    if (device.currentCashierId && device.lastActiveAt) {
      const stale = Date.now() - device.lastActiveAt.getTime() > STALE_SESSION_MS;
      if (stale) {
        await this.prisma.posDevice.update({
          where: { id: deviceId },
          data: { currentCashierId: null, sessionToken: null, lastActiveAt: null },
        });
        device.currentCashierId = null;
        device.sessionToken = null;
      }
    }

    if (device.currentCashierId && device.currentCashierId !== userId) {
      throw new ConflictException('Este TPV ya está en uso por otro usuario');
    }

    // Verify PIN
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.pinHash) throw new UnauthorizedException('Este colaborador no tiene PIN configurado');
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) throw new UnauthorizedException('PIN incorrecto');

    // Enforce max 2 devices per user: auto-release the least recently active one
    const userDevices = await this.prisma.posDevice.findMany({
      where: { tenantId, currentCashierId: userId },
      orderBy: { lastActiveAt: 'asc' }, // oldest first
    });

    if (userDevices.length >= MAX_DEVICES_PER_USER) {
      const toRelease = userDevices[0]; // least recently active
      await this.prisma.posDevice.update({
        where: { id: toRelease.id },
        data: { currentCashierId: null, sessionToken: null, lastActiveAt: null },
      });
    }

    const sessionToken = randomUUID();
    await this.prisma.posDevice.update({
      where: { id: deviceId },
      data: { currentCashierId: userId, sessionToken, lastActiveAt: new Date() },
    });

    return { ok: true, sessionToken, deviceId, deviceName: device.name, cashierName: user.name };
  }

  async release(tenantId: string, deviceId: string, sessionToken: string) {
    const device = await this.prisma.posDevice.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    if (device.sessionToken !== sessionToken) throw new UnauthorizedException('Sesión inválida');

    await this.prisma.posDevice.update({
      where: { id: deviceId },
      data: { currentCashierId: null, sessionToken: null, lastActiveAt: null },
    });
    return { ok: true };
  }

  /** Admins and owners can force-release any TPV without needing the session token */
  async forceRelease(tenantId: string, deviceId: string) {
    const device = await this.prisma.posDevice.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');

    await this.prisma.posDevice.update({
      where: { id: deviceId },
      data: { currentCashierId: null, sessionToken: null, lastActiveAt: null },
    });
    return { ok: true };
  }

  /** Keep a session alive; must be called periodically by the frontend */
  async heartbeat(tenantId: string, deviceId: string, sessionToken: string) {
    const device = await this.prisma.posDevice.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    if (device.sessionToken !== sessionToken) throw new UnauthorizedException('Sesión inválida');

    await this.prisma.posDevice.update({
      where: { id: deviceId },
      data: { lastActiveAt: new Date() },
    });
    return { ok: true };
  }

  /** Release all TPVs held by a user — called on logout */
  async releaseAllForUser(tenantId: string, userId: string) {
    await this.prisma.posDevice.updateMany({
      where: { tenantId, currentCashierId: userId },
      data: { currentCashierId: null, sessionToken: null, lastActiveAt: null },
    });
    return { ok: true };
  }
}
