import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorias' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.categoriesService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener categoria por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.categoriesService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear categoria' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; parentId?: string; sortOrder?: number },
  ) {
    return this.categoriesService.create(user.tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar categoria' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; parentId?: string; sortOrder?: number },
  ) {
    return this.categoriesService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar categoria' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.categoriesService.remove(user.tenantId, id);
  }
}
