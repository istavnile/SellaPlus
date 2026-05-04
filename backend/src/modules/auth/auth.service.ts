import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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
