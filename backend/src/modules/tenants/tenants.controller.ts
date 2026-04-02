import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Tenant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Obtener configuracion del negocio' })
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Actualizar configuracion del negocio' })
  updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body() body: Partial<{ name: string; currency: string; timezone: string; locale: string }>,
  ) {
    return this.tenantsService.updateSettings(user.tenantId, body);
  }

  @Patch('features/:key')
  @ApiOperation({ summary: 'Activar o desactivar una feature flag' })
  toggleFeature(
    @CurrentUser() user: JwtPayload,
    @Param('key') key: string,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.tenantsService.toggleFeatureFlag(user.tenantId, key, isEnabled);
  }
}
