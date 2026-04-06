const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.payment.updateMany({
    where: { method: 'TRANSFER', gatewayName: null },
    data: { gatewayName: 'Yape / Plin' }
  });
  console.log(`Actualizados: ${updated.count} pagos antiguos.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
