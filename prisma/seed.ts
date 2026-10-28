import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password@123";
const rupee = (value: number) => BigInt(Math.round(value * 100));

async function reset() {
  await prisma.auditLog.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.video.deleteMany();
  await prisma.statement.deleteMany();
  await prisma.remark.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.trustedDevice.deleteMany();
  await prisma.twoFactor.deleteMany();
  await prisma.clientSetting.deleteMany();
  await prisma.bankActivityLog.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.request.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.whiteLabel.deleteMany();
}

async function main() {
  await reset();

  const whiteLabel = await prisma.whiteLabel.create({
    data: { name: "reddybook247tech", domain: "emp.adminpay1.net" },
  });

  const passwordHash = await hash(PASSWORD, 10);

  const superAdmin = await prisma.user.create({
    data: {
      username: "superadmin",
      displayName: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      whiteLabelId: whiteLabel.id,
    },
  });

  const master = await prisma.user.create({
    data: {
      username: "reddytech247",
      displayName: "reddytech247",
      passwordHash,
      role: "MASTER",
      whiteLabelId: whiteLabel.id,
    },
  });

  const employee = await prisma.user.create({
    data: {
      username: "Ash01",
      displayName: "Ash01",
      passwordHash,
      role: "EMPLOYEE",
      whiteLabelId: whiteLabel.id,
      masterId: master.id,
      email: "ash01@example.com",
      twoFactor: { create: { trustedDevicesEnabled: true } },
    },
  });

  // Deposit is fully granted; withdrawals are read-only for this employee, so the
  // panel demonstrates both an allowed and a blocked action.
  await prisma.permission.createMany({
    data: [
      { employeeId: employee.id, module: "TRANSACTION_DEPOSIT", canRead: true, canWrite: true, grantedById: master.id },
      { employeeId: employee.id, module: "TRANSACTION_WITHDRAWAL", canRead: true, canWrite: false, grantedById: master.id },
      { employeeId: employee.id, module: "ACCOUNT_STATEMENTS", canRead: true, canWrite: true, grantedById: master.id },
      { employeeId: employee.id, module: "CLIENT_ACCOUNTS", canRead: true, canWrite: true, grantedById: master.id },
      { employeeId: employee.id, module: "AGENT_ACCOUNTS", canRead: true, canWrite: false, grantedById: master.id },
      { employeeId: employee.id, module: "NOTIFICATION", canRead: true, canWrite: false, grantedById: master.id },
    ],
  });

  const clientSeeds = [
    { code: "0009e244ed", username: "rahul_099", displayName: "Rahul Verma", balance: 0.94, scope: "NORMAL" as const },
    { code: "0013f1a72b", username: "sana_14", displayName: "Sana Khan", balance: 12500, scope: "NORMAL" as const },
    { code: "002667c4de", username: "vikram_22", displayName: "Vikram Singh", balance: 4200, scope: "NORMAL" as const },
    { code: "00331140f9", username: "arjun_77", displayName: "Arjun Nair", balance: 0, scope: "SUSPICIOUS" as const },
    { code: "372a9af3", username: "deepa_rt", displayName: "Deepa RT", balance: 30000, scope: "NORMAL" as const },
    { code: "8eaf105e5c", username: "imran_sk", displayName: "Imran Sheikh", balance: 7500, scope: "NORMAL" as const },
    { code: "e7acf3fa0e", username: "neha_31", displayName: "Neha Gupta", balance: 980, scope: "SUSPICIOUS" as const },
  ];

  const clients = [];
  for (const seed of clientSeeds) {
    const client = await prisma.client.create({
      data: {
        code: seed.code,
        username: seed.username,
        displayName: seed.displayName,
        scope: seed.scope,
        whiteLabelId: whiteLabel.id,
        ownerId: employee.id,
        balancePaisa: rupee(seed.balance),
        playerBalancePaisa: rupee(seed.balance),
        creditReferencePaisa: BigInt(0),
        exposurePaisa: BigInt(0),
        pnlPaisa: rupee(seed.balance),
        settings: { create: { paymentLimitMinPaisa: rupee(100), paymentLimitMaxPaisa: rupee(50000) } },
      },
    });
    clients.push(client);
  }

  const [rahul, sana, vikram, arjun, deepa, imran, neha] = clients;

  // A settled ledger so the dashboard has real deposits/withdrawals to add up.
  const ledgerSeeds: { clientId: string; type: "DEPOSIT" | "WITHDRAWAL"; amount: number; daysAgo: number }[] = [
    { clientId: sana.id, type: "DEPOSIT", amount: 25000, daysAgo: 2 },
    { clientId: sana.id, type: "WITHDRAWAL", amount: 5000, daysAgo: 1 },
    { clientId: vikram.id, type: "DEPOSIT", amount: 9000, daysAgo: 1 },
    { clientId: imran.id, type: "DEPOSIT", amount: 15000, daysAgo: 0 },
    { clientId: imran.id, type: "WITHDRAWAL", amount: 7500, daysAgo: 0 },
    { clientId: arjun.id, type: "DEPOSIT", amount: 60000, daysAgo: 3 },
    { clientId: neha.id, type: "WITHDRAWAL", amount: 12000, daysAgo: 2 },
  ];

  for (const entry of ledgerSeeds) {
    const createdAt = new Date(Date.now() - entry.daysAgo * 86_400_000);
    await prisma.ledgerEntry.create({
      data: {
        clientId: entry.clientId,
        type: entry.type,
        amountPaisa: rupee(entry.amount),
        balanceAfterPaisa: rupee(entry.amount),
        actorId: employee.id,
        createdAt,
        note: `Seeded ${entry.type.toLowerCase()}`,
      },
    });
  }

  await prisma.request.createMany({
    data: [
      {
        clientId: deepa.id,
        type: "WITHDRAWAL",
        amountPaisa: rupee(30000),
        status: "PENDING",
        destination: "bank/Canara Bank",
        createdById: employee.id,
        createdAt: new Date(Date.now() - 3 * 60_000),
      },
      {
        clientId: imran.id,
        type: "WITHDRAWAL",
        amountPaisa: rupee(30000),
        status: "PENDING",
        destination: "bank/Punjab National Bank",
        utr: "UTR8823195541",
        createdById: employee.id,
        createdAt: new Date(Date.now() - 9 * 60_000),
      },
      {
        clientId: neha.id,
        type: "WITHDRAWAL",
        amountPaisa: rupee(4500),
        status: "PENDING",
        destination: "upi/neha@okaxis",
        createdById: employee.id,
        createdAt: new Date(Date.now() - 20 * 60_000),
      },
      {
        clientId: rahul.id,
        type: "DEPOSIT",
        amountPaisa: rupee(2000),
        status: "PENDING",
        destination: "upi/rahul@ybl",
        createdById: employee.id,
        createdAt: new Date(Date.now() - 40 * 60_000),
      },
      {
        clientId: sana.id,
        type: "DEPOSIT",
        amountPaisa: rupee(25000),
        status: "APPROVED",
        destination: "bank/HDFC Bank",
        createdById: employee.id,
        reviewedById: employee.id,
        reviewedAt: new Date(Date.now() - 2 * 86_400_000),
        createdAt: new Date(Date.now() - 2 * 86_400_000),
      },
    ],
  });

  await prisma.bankAccount.createMany({
    data: [
      {
        holderName: "reddybook247tech",
        accountNumber: "50100234567890",
        ifsc: "HDFC0000123",
        bankName: "HDFC Bank",
        type: "GLOBAL",
        ownerId: employee.id,
      },
      {
        holderName: "Ash01 Agent",
        accountNumber: "91102009876543",
        ifsc: "UTIB0000456",
        bankName: "Axis Bank",
        type: "AGENT",
        ownerId: employee.id,
      },
      {
        holderName: "Deepa RT",
        accountNumber: "1234567890123",
        ifsc: "CNRB0001234",
        bankName: "Canara Bank",
        type: "CLIENT",
        clientId: deepa.id,
        ownerId: employee.id,
      },
    ],
  });

  await prisma.remark.createMany({
    data: [
      { type: "GENERAL", text: "Withdrawal slips must carry a matching UTR before approval.", createdById: master.id },
      { type: "BANK", text: "Canara Bank is temporarily under review — route payouts to HDFC.", createdById: master.id },
    ],
  });

  await prisma.broadcast.create({
    data: {
      title: "Maintenance window",
      message: "Wallets will be locked from 02:00 to 02:30 IST for reconciliation.",
      createdById: employee.id,
    },
  });

  await prisma.video.createMany({
    data: [
      { title: "How to deposit on Get-ID", kind: "DEPOSIT", url: "https://example.com/videos/deposit.mp4", createdById: employee.id },
      { title: "How to request a withdrawal", kind: "WITHDRAWAL", url: "https://example.com/videos/withdrawal.mp4", createdById: employee.id },
    ],
  });

  await prisma.auditLog.create({
    data: { actorId: superAdmin.id, action: "SEED", entity: "System", meta: { note: "demo data" } },
  });

  console.log("Seeded.");
  console.log(`  white label : ${whiteLabel.name}`);
  console.log(`  master      : ${master.username} / ${PASSWORD}`);
  console.log(`  employee    : ${employee.username} / ${PASSWORD}`);
  console.log(`  super admin : ${superAdmin.username} / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
