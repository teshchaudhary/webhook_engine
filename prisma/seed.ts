import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const tenant = await prisma.tenant.upsert({
    where: { id: 'test-tenant-123' },
    update: {},
    create: {
      id: 'test-tenant-123',
      name: 'Test Tenant',
      secretKey: 'test-secret-key',
    },
  });

  const endpoint1 = await prisma.endpoint.upsert({
    where: { id: 'test-endpoint-1' },
    update: {},
    create: {
      id: 'test-endpoint-1',
      tenantId: tenant.id,
      url: 'https://webhook.site/test-endpoint-1',
      isActive: true,
    },
  });

  const endpoint2 = await prisma.endpoint.upsert({
    where: { id: 'test-endpoint-2' },
    update: {},
    create: {
      id: 'test-endpoint-2',
      tenantId: tenant.id,
      url: 'https://webhook.site/test-endpoint-2',
      isActive: true,
    },
  });

  console.log('Seed data created:');
  console.log(`   Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`   Endpoints: ${endpoint1.url}, ${endpoint2.url}`);
  console.log('');
  console.log('You can now test the webhook API with:');
  console.log(`   curl -X POST http://localhost:3000/api/v1/events \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -H "Authorization: Bearer ${tenant.id}" \\`);
  console.log(`     -H "Idempotency-Key: test-req-123" \\`);
  console.log(`     -d '{"type": "user.created", "payload": {"userId": "user123"}}'`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
