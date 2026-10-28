import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function client() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
}

async function main() {
  const prisma = client();
  try {
    const [users, clients, requests] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.request.count(),
    ]);
    console.log(`OK users=${users} clients=${clients} requests=${requests}`);
  } catch (error) {
    console.log(`FAIL ${(error as Error).message.split("\n").filter(Boolean).slice(-1)[0]}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
