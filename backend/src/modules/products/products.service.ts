import { Injectable, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../../common/prisma/prisma.service';

function normalizeKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
}

const PRODUCT_HEADER_MAP: Record<string, string> = {
  'nombre':           'name',
  'nombre del articulo': 'name',
  'descripcion':      'description',
  'sku':              'sku',
  'codigo de barras': 'barcode',
  'barcode':          'barcode',
  'precio':           'basePrice',
  'precio de venta':  'basePrice',
  'costo':            'costPrice',
  'precio de costo':  'costPrice',
  'categoria':        'categoryName',
  'stock':            'stock',
  'cantidad':         'stock',
};

function bufferToString(buf: Buffer): string {
  const utf8 = buf.toString('utf-8');
  if (/\xc3[\x80-\xbf]/.test(utf8) || utf8.includes('Ã')) return buf.toString('latin1');
  return utf8;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params?: {
      search?: string;
      categoryId?: string;
      isActive?: boolean;
      stockAlert?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page  = params?.page  && params.page  > 0 ? params.page  : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 500;
    const skip  = (page - 1) * limit;

    const where: any = {
      tenantId,
      isActive: params?.isActive ?? true,
      ...(params?.categoryId && { categoryId: params.categoryId }),
      ...(params?.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { sku: { contains: params.search, mode: 'insensitive' } },
          { barcode: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: {
            include: {
              optionValues: {
                include: { optionValue: { include: { option: true } } },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Post-filter stock alert in memory (requires aggregate of variants)
    let data = products;
    if (params?.stockAlert === 'out_of_stock') {
      data = products.filter((p) => p.variants.reduce((s, v) => s + v.stockQty, 0) === 0);
    } else if (params?.stockAlert === 'low_stock') {
      const threshold = 5;
      data = products.filter((p) => {
        const stock = p.variants.reduce((s, v) => s + v.stockQty, 0);
        return stock > 0 && stock <= threshold;
      });
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        options: { include: { values: true } },
        variants: {
          include: {
            optionValues: {
              include: { optionValue: { include: { option: true } } },
            },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async findByBarcode(tenantId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, barcode, isActive: true },
      include: {
        category: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true } },
      },
    });
    if (!product) {
      // Check variants
      const variant = await this.prisma.productVariant.findFirst({
        where: { barcode, isActive: true, product: { tenantId } },
        include: {
          product: {
            include: {
              category: true,
              images: { take: 1 },
            },
          },
          optionValues: {
            include: { optionValue: { include: { option: true } } },
          },
        },
      });
      return variant;
    }
    return product;
  }

  private generateSku(): string {
    return 'SKU-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  }

  private generateBarcode(): string {
    // 13-digit EAN-like numeric code
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    // EAN-13 check digit
    const sum = digits.split('').reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
    const check = (10 - (sum % 10)) % 10;
    return digits + check;
  }

  async create(tenantId: string, data: any) {
    const { images, options, ...productData } = data;

    // Auto-generate SKU and barcode if not provided
    if (!productData.sku || productData.sku === '') productData.sku = this.generateSku();
    if (!productData.barcode || productData.barcode === '') productData.barcode = this.generateBarcode();

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        ...productData,
        ...(images?.length && { images: { create: images } }),
      },
      include: { category: true, images: true },
    });

    // Crear opciones y generar variantes (producto cartesiano)
    if (options?.length) {
      const createdOptions: Array<{ id: string; values: Array<{ id: string }> }> = [];

      for (let i = 0; i < Math.min(options.length, 3); i++) {
        const opt = options[i];
        if (!opt.name || !opt.values?.length) continue;

        const option = await this.prisma.productOption.create({
          data: {
            productId: product.id,
            name: opt.name,
            position: i + 1,
            values: {
              create: opt.values.map((v: string, idx: number) => ({
                value: v.trim(),
                sortOrder: idx,
              })),
            },
          },
          include: { values: true },
        });
        createdOptions.push(option);
      }

      // Generar combinaciones (producto cartesiano de los valores)
      if (createdOptions.length) {
        const combinations = this.cartesian(createdOptions.map((o) => o.values));
        for (const combo of combinations) {
          const variant = await this.prisma.productVariant.create({
            data: { productId: product.id, stockQty: 0 },
          });
          for (const val of combo) {
            await this.prisma.variantOptionValue.create({
              data: { variantId: variant.id, optionValueId: val.id },
            });
          }
        }
      }
    }

    return this.findOne(tenantId, product.id);
  }

  private cartesian(arrays: any[][]): any[][] {
    return arrays.reduce<any[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
      [[]],
    );
  }

  async update(tenantId: string, id: string, data: any) {
    await this.findOne(tenantId, id);
    const { images, options, variants, ...productData } = data;
    if (productData.sku === '') productData.sku = this.generateSku();
    if (productData.barcode === '') productData.barcode = this.generateBarcode();

    await this.prisma.product.update({
      where: { id },
      data: productData,
    });

    if (images !== undefined) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      if (images?.length) {
        await this.prisma.productImage.createMany({
          data: images.map((img: any, idx: number) => ({
            productId: id,
            url: img.url,
            sortOrder: idx,
          })),
        });
      }
    }

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async bulkRemove(tenantId: string, ids: string[]) {
    if (!ids?.length) return { count: 0 };
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { isActive: false },
    });
    return { count: result.count };
  }

  // ── IMPORT CSV ─────────────────────────────────────────────────────────────

  async importCsv(tenantId: string, fileBuffer: Buffer) {
    const text = bufferToString(fileBuffer);

    const rows: Record<string, string>[] = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    if (!rows.length) return { created: 0, updated: 0, errors: [] };

    const rawHeaders = Object.keys(rows[0]);
    const colMap: Record<string, string> = {};
    for (const h of rawHeaders) {
      const field = PRODUCT_HEADER_MAP[normalizeKey(h)];
      if (field) colMap[h] = field;
    }

    let created = 0, updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data: Record<string, any> = {};
      for (const [raw, field] of Object.entries(colMap)) {
        const val = (row[raw] ?? '').trim();
        if (val) data[field] = val;
      }

      if (!data['name']) { errors.push(`Fila ${i + 2}: sin nombre, omitida`); continue; }

      // Resolver categoría por nombre
      let categoryId: string | undefined;
      if (data['categoryName']) {
        const cat = await this.prisma.category.findFirst({
          where: { tenantId, name: { equals: data['categoryName'], mode: 'insensitive' } },
        });
        if (cat) categoryId = cat.id;
        else {
          const newCat = await this.prisma.category.create({ data: { tenantId, name: data['categoryName'] } });
          categoryId = newCat.id;
        }
        delete data['categoryName'];
      }

      const productData: any = {
        name:      data['name'],
        description: data['description'],
        sku:       data['sku'] || undefined,
        barcode:   data['barcode'] || undefined,
        basePrice: parseFloat(data['basePrice']) || 0,
        costPrice: parseFloat(data['costPrice']) || 0,
        isActive:  true,
        ...(categoryId && { categoryId }),
      };

      try {
        const existing = data['sku']
          ? await this.prisma.product.findFirst({ where: { tenantId, sku: data['sku'] } })
          : null;

        if (existing) {
          await this.prisma.product.update({ where: { id: existing.id }, data: productData });
          // Actualizar stock de variante por defecto si hay
          if (data['stock']) {
            const variant = await this.prisma.productVariant.findFirst({ where: { productId: existing.id } });
            if (variant) await this.prisma.productVariant.update({ where: { id: variant.id }, data: { stockQty: parseInt(data['stock']) || 0 } });
          }
          updated++;
        } else {
          const prod = await this.prisma.product.create({ data: { tenantId, ...productData } });
          // Crear variante por defecto con stock inicial
          await this.prisma.productVariant.create({
            data: { productId: prod.id, stockQty: parseInt(data['stock']) || 0 },
          });
          created++;
        }
      } catch (e: any) {
        errors.push(`Fila ${i + 2} (${data['name']}): ${e.message}`);
      }
    }

    return { created, updated, errors, total: rows.length };
  }

  // ── EXPORT CSV ─────────────────────────────────────────────────────────────

  async exportCsv(tenantId: string): Promise<Buffer> {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: true,
        variants: { take: 1, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Nombre', 'Descripción', 'SKU', 'Código de barras', 'Precio de venta', 'Costo', 'Categoría', 'Stock'];
    const escape = (v: any) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [
      headers.join(','),
      ...products.map((p) => [
        escape(p.name),
        escape(p.description),
        escape(p.sku),
        escape(p.barcode),
        escape(p.basePrice),
        escape(p.costPrice),
        escape(p.category?.name),
        escape(p.variants[0]?.stockQty ?? 0),
      ].join(',')),
    ];

    return Buffer.concat([Buffer.from('\uFEFF', 'utf-8'), Buffer.from(lines.join('\n'), 'utf-8')]);
  }
}
