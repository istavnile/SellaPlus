import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  { sku: '10000', name: 'Agua',            category: 'Bebidas',     costPrice: 0.00, basePrice: 1.50 },
  { sku: '10019', name: 'Agua kids',       category: 'Bebidas',     costPrice: 1.00, basePrice: 1.00 },
  { sku: '10017', name: 'Barra',           category: null,           costPrice: 0.00, basePrice: 2.00 },
  { sku: '10001', name: 'Cafe',            category: 'Bebidas',     costPrice: 0.00, basePrice: 3.00, description: 'Café de cafetera pasado' },
  { sku: '10002', name: 'Cafe c/ leche',   category: 'Bebidas',     costPrice: 0.00, basePrice: 4.00 },
  { sku: '10009', name: 'Chicle',          category: 'Golosinas',   costPrice: 0.00, basePrice: 1.50 },
  { sku: '10020', name: 'Chin chin',       category: null,           costPrice: 0.00, basePrice: 0.50 },
  { sku: '10011', name: 'Chocolate',       category: 'Golosinas',   costPrice: 0.00, basePrice: 1.50 },
  { sku: '10014', name: 'Cua cua',         category: 'Snacks',      costPrice: 0.00, basePrice: 1.50 },
  { sku: '10016', name: 'Cuate/chifle',    category: null,           costPrice: 0.00, basePrice: 2.00 },
  { sku: '10013', name: 'Empanadas/Panes', category: 'Comestibles', costPrice: 0.00, basePrice: 5.00 },
  { sku: '10004', name: 'Frugos',          category: 'Bebidas',     costPrice: 0.00, basePrice: 2.50 },
  { sku: '10008', name: 'Galleta',         category: 'Snacks',      costPrice: 0.00, basePrice: 1.50 },
  { sku: '10003', name: 'Gaseosa',         category: 'Bebidas',     costPrice: 0.00, basePrice: 3.00 },
  { sku: '10022', name: 'Gaseosa MINI',    category: null,           costPrice: 0.00, basePrice: 2.00 },
  { sku: '10006', name: 'Keke',            category: 'Comestibles', costPrice: 0.00, basePrice: 2.50 },
  { sku: '10021', name: 'Mentos',          category: null,           costPrice: 2.00, basePrice: 2.00 },
  { sku: '10024', name: 'Mixto',           category: 'Comestibles', costPrice: 0.00, basePrice: 4.00 },
  { sku: '10010', name: 'Palitos',         category: 'Snacks',      costPrice: 0.00, basePrice: 2.00 },
  { sku: '10007', name: 'Papita',          category: 'Snacks',      costPrice: 0.00, basePrice: 1.50 },
  { sku: '10005', name: 'Pulpin',          category: 'Bebidas',     costPrice: 0.00, basePrice: 2.00 },
  { sku: '10018', name: 'Shake',           category: 'Bebidas',     costPrice: 0.00, basePrice: 5.50 },
];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo-store' } });
  if (!tenant) { console.error('Tenant demo-store not found. Run seed.ts first.'); process.exit(1); }

  const tenantId = tenant.id;

  // Upsert categories
  const categoryCache: Record<string, string> = {};
  const categoryNames = [...new Set(PRODUCTS.map((p) => p.category).filter(Boolean))] as string[];
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}-${tenantId}` },
      update: { name },
      create: {
        id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}-${tenantId}`,
        tenantId,
        name,
      },
    });
    categoryCache[name] = cat.id;
  }

  let created = 0, updated = 0;

  for (const p of PRODUCTS) {
    const data = {
      tenantId,
      name: p.name,
      sku: p.sku,
      costPrice: p.costPrice,
      basePrice: p.basePrice,
      trackStock: false,
      isActive: true,
      ...(p.description ? { description: p.description } : {}),
      ...(p.category && categoryCache[p.category] ? { categoryId: categoryCache[p.category] } : {}),
    };

    const existing = await prisma.product.findFirst({ where: { tenantId, sku: p.sku } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({ data });
      created++;
    }
  }

  console.log(`✓ Productos: ${created} creados, ${updated} actualizados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
