import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
    @Body() body: Partial<{ name: string; currency: string; timezone: string; locale: string; logoUrl: string; address: string; phone: string; receiptHeader: string; receiptFooter: string }>,
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

  // ── Payment Methods ──────────────────────────────────────────────────────

  @Get('payment-methods')
  @ApiOperation({ summary: 'Listar métodos de pago del negocio' })
  getPaymentMethods(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getPaymentMethods(user.tenantId);
  }

  @Post('payment-methods')
  @ApiOperation({ summary: 'Añadir método de pago' })
  createPaymentMethod(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; type: string },
  ) {
    return this.tenantsService.createPaymentMethod(user.tenantId, body);
  }

  @Patch('payment-methods/reorder')
  @ApiOperation({ summary: 'Reordenar métodos de pago' })
  reorderPaymentMethods(
    @CurrentUser() user: JwtPayload,
    @Body() body: { order: { id: string; sortOrder: number }[] },
  ) {
    return this.tenantsService.reorderPaymentMethods(user.tenantId, body.order);
  }

  @Patch('payment-methods/:id')
  @ApiOperation({ summary: 'Actualizar método de pago' })
  updatePaymentMethod(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; type: string; isEnabled: boolean; sortOrder: number }>,
  ) {
    return this.tenantsService.updatePaymentMethod(user.tenantId, id, body);
  }

  @Delete('payment-methods/:id')
  @ApiOperation({ summary: 'Eliminar método de pago' })
  deletePaymentMethod(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tenantsService.deletePaymentMethod(user.tenantId, id);
  }

  // ── Role Permissions ──────────────────────────────────────────────────────

  @Get('role-permissions')
  @ApiOperation({ summary: 'Obtener permisos por rol' })
  getRolePermissions(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getRolePermissions(user.tenantId);
  }

  @Patch('role-permissions')
  @ApiOperation({ summary: 'Actualizar un permiso de rol' })
  setRolePermission(
    @CurrentUser() user: JwtPayload,
    @Body() body: { role: string; section: string; isEnabled: boolean },
  ) {
    return this.tenantsService.setRolePermission(user.tenantId, body.role, body.section, body.isEnabled);
  }
}
