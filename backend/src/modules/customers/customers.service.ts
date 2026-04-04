import { Injectable, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../../common/prisma/prisma.service';

// ─── Normaliza encabezados para tolerar acentos y mojibake (Latin-1→UTF-8) ───
function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quita diacríticos
    .replace(/[^a-z0-9\s]/g, '')       // quita símbolos
    .trim()
    .replace(/\s+/g, ' ');
}

// Mapeo: encabezado normalizado → campo del modelo
const HEADER_MAP: Record<string, string> = {
  'id del cliente':       'customerCode',
  'nombre del cliente':   'name',
  'email':                'email',
  'numero de telefono':   'phone',
  'direccion':            'addressLine1',
  'ciudad':               'city',
  'region':               'state',
  'codigo postal':        'postalCode',
  'pais':                 'country',
  'codigo de cliente':    'customerCode',
  'nota':                 'notes',
};

function bufferToString(buf: Buffer): string {
  const utf8 = buf.toString('utf-8');
  // Si hay mojibake típico de Latin-1 (Ã seguido de byte > 0x7F) → redecodificar
  if (/\xc3[\x80-\xbf]/.test(utf8) || utf8.includes('Ã')) {
    return buf.toString('latin1');
  }
  return utf8;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, params?: { search?: string }) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(params?.search && {
          OR: [
            { name:         { contains: params.search, mode: 'insensitive' } },
            { email:        { contains: params.search, mode: 'insensitive' } },
            { phone:        { contains: params.search, mode: 'insensitive' } },
            { customerCode: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, transactionNumber: true, total: true, status: true, createdAt: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async create(tenantId: string, data: {
    name: string; email?: string; phone?: string; customerCode?: string;
    addressLine1?: string; addressLine2?: string; city?: string;
    state?: string; postalCode?: string; country?: string; notes?: string;
  }) {
    return this.prisma.customer.create({ data: { tenantId, ...data } });
  }

  async update(tenantId: string, id: string, data: Partial<{
    name: string; email: string; phone: string; addressLine1: string;
    addressLine2: string; city: string; state: string; postalCode: string;
    country: string; notes: string; customerCode: string;
  }>) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    // Remove references from transactions to avoid constraints
    await this.prisma.transaction.updateMany({
      where: { tenantId, customerId: id },
      data: { customerId: null },
    });
    return this.prisma.customer.delete({ where: { id } });
  }

  async bulkRemove(tenantId: string, ids: string[]) {
    // Remove references from transactions to avoid constraints
    await this.prisma.transaction.updateMany({
      where: { tenantId, customerId: { in: ids } },
      data: { customerId: null },
    });
    const result = await this.prisma.customer.deleteMany({
      where: { id: { in: ids }, tenantId },
    });
    return { deleted: result.count };
  }

  // ── IMPORT CSV ────────────────────────────────────────────────────────────

  async importCsv(tenantId: string, fileBuffer: Buffer) {
    const text = bufferToString(fileBuffer);

    const rows: Record<string, string>[] = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    if (!rows.length) return { created: 0, updated: 0, errors: [] };

    // Normalizar claves de la primera fila para armar el mapa real de columnas
    const rawHeaders = Object.keys(rows[0]);
    const colMap: Record<string, string> = {}; // rawHeader → field
    for (const h of rawHeaders) {
      const field = HEADER_MAP[normalizeKey(h)];
      if (field) colMap[h] = field;
    }

    let created = 0, updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Mapear columnas al objeto de datos
      const data: Record<string, string> = {};
      for (const [raw, field] of Object.entries(colMap)) {
        const val = (row[raw] ?? '').trim();
        if (val) data[field] = val;
      }

      if (!data['name']) {
        errors.push(`Fila ${i + 2}: sin nombre, omitida`);
        continue;
      }

      try {
        if (data['customerCode']) {
          // Upsert por customerCode
          const existing = await this.prisma.customer.findFirst({
            where: { tenantId, customerCode: data['customerCode'] },
          });
          if (existing) {
            await this.prisma.customer.update({ where: { id: existing.id }, data });
            updated++;
          } else {
            await this.prisma.customer.create({ data: { tenantId, ...(data as any) } });
            created++;
          }
        } else {
          await this.prisma.customer.create({ data: { tenantId, ...(data as any) } });
          created++;
        }
      } catch (e: any) {
        errors.push(`Fila ${i + 2} (${data['name']}): ${e.message}`);
      }
    }

    return { created, updated, errors, total: rows.length };
  }

  // ── EXPORT CSV ────────────────────────────────────────────────────────────

  async exportCsv(tenantId: string): Promise<Buffer> {
    const customers = await this.findAll(tenantId);

    const headers = [
      'ID del cliente', 'Nombre del cliente', 'Email', 'Número de teléfono',
      'Dirección', 'Ciudad', 'Región', 'Código postal', 'País',
      'Código de cliente', 'Nota',
    ];

    const escape = (v: string | null | undefined) => {
      if (!v) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [
      headers.join(','),
      ...customers.map((c) => [
        escape(c.customerCode), escape(c.name),       escape(c.email),
        escape(c.phone),        escape(c.addressLine1), escape(c.city),
        escape(c.state),        escape(c.postalCode),  escape(c.country),
        escape(c.customerCode), escape(c.notes),
      ].join(',')),
    ];

    // BOM UTF-8 para que Excel lo abra correctamente
    return Buffer.concat([Buffer.from('\uFEFF', 'utf-8'), Buffer.from(lines.join('\n'), 'utf-8')]);
  }
}
