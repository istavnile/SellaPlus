import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-store' },
    update: {},
    create: {
      name: 'Demo Store',
      slug: 'demo-store',
      currency: 'USD',
      timezone: 'America/New_York',
      locale: 'es',
    },
  });

  const passwordHash = await bcrypt.hash('$123QWE$', 10);

  // Remove old demo admin if it exists (email change)
  await prisma.user.deleteMany({
    where: { tenantId: tenant.id, email: 'admin@demo.com' },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'istavnile@gmail.com' } },
    update: { passwordHash, name: 'Istav', role: UserRole.OWNER },
    create: {
      tenantId: tenant.id,
      email: 'istavnile@gmail.com',
      passwordHash,
      name: 'Istav',
      role: UserRole.OWNER,
    },
  });

  // Default tax rate
  await prisma.taxRate.upsert({
    where: { id: 'default-tax' },
    update: {},
    create: {
      id: 'default-tax',
      tenantId: tenant.id,
      name: 'IVA',
      rate: 0.16,
      isDefault: true,
      isActive: true,
    },
  });

  // Feature flags
  const features = ['shifts_enabled', 'loyalty_enabled', 'multi_currency'];
  for (const key of features) {
    await prisma.featureFlag.upsert({
      where: { tenantId_featureKey: { tenantId: tenant.id, featureKey: key } },
      update: {},
      create: { tenantId: tenant.id, featureKey: key, isEnabled: false },
    });
  }

  console.log('Seed complete. Login: istavnile@gmail.com / $123QWE$');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
