import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailingService } from '../../common/mailing/mailing.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailing: MailingService,
  ) {}

  async register(dto: RegisterDto) {
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException('El slug ya esta en uso');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.businessName,
        slug: dto.slug,
        currency: dto.currency ?? 'USD',
        timezone: dto.timezone ?? 'UTC',
        users: {
          create: {
            email: dto.email,
            passwordHash,
            name: dto.ownerName,
            role: UserRole.OWNER,
          },
        },
        featureFlags: {
          create: [
            { featureKey: 'shifts_enabled', isEnabled: false },
            { featureKey: 'loyalty_enabled', isEnabled: false },
          ],
        },
      },
      include: { users: true },
    });

    const owner = tenant.users[0];
    return this.generateTokens(owner.id, owner.email, owner.name, tenant.id, owner.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: { tenant: { select: { isActive: true } } },
    });

    if (!user || !user.tenant.isActive) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return this.generateTokens(user.id, user.email, user.name, user.tenantId, user.role);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { email, isActive: true } });
    if (!user) return; // never reveal whether the email exists

    const token   = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const resetLink   = `${frontendUrl}/reset-password?token=${token}`;

    await this.mailing.sendMail(
      email,
      'Recuperar contraseña — SellaPlus',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#1e3a8a;margin-bottom:12px">Restablecer contraseña</h2>
        <p style="color:#374151;line-height:1.6">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en SellaPlus.
          Haz clic en el botón para continuar:
        </p>
        <a href="${resetLink}"
          style="display:inline-block;margin:20px 0;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Restablecer contraseña
        </a>
        <p style="color:#9ca3af;font-size:13px">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.</p>
      </div>`,
    );
  }

  async logout(tenantId: string, userId: string): Promise<void> {
    await this.prisma.posDevice.updateMany({
      where: { tenantId, currentCashierId: userId },
      data: { currentCashierId: null, sessionToken: null, lastActiveAt: null },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('El enlace es inválido o ha expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('La contraseña actual es incorrecta');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  private generateTokens(userId: string, email: string, name: string, tenantId: string, role: string) {
    const payload = { sub: userId, email, name, tenantId, role };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }
}
