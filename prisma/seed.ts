import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash, randomBytes } from 'crypto';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing from your .env file');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const apiKey = `whk_${randomBytes(32).toString('hex')}`;

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Tenant A',
        apiKeyHash: createHash('sha256').update(apiKey).digest('hex'),
        endpoints: {
          create: [
            {
              url: 'http://localhost:3000/test-webhook',
              secretKey: `whsec_${randomBytes(32).toString('hex')}`,
              isActive: true,
              subscriptions: {
                create: { eventType: '*' },
              },
            },
          ],
        },
      },
      include: {
        endpoints: true,
      },
    });

    console.log('Seed successful!\n');
    console.log('=========================================');
    console.log('Tenant Name :', tenant.name);
    console.log('Tenant ID   :', tenant.id);
    console.log('API Key     :', apiKey);
    console.log('Endpoint URL:', tenant.endpoints[0].url);
    console.log('=========================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Error during seeding:', e);
  process.exit(1);
});
