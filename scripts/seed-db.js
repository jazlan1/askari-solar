/**
 * MySQL Seed Script for Askari Portal
 * Creates the initial Super Admin user if no users exist.
 * Run: node scripts/seed-db.js
 */

require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || "3306"),
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),
});
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Create or Update Unique Super Admin without deleting existing users
  const adminEmail = 'portaladmin@solarkidunya.com';
  const adminPassword = 'Askari@Admin#2026$Secure!';
  const hashedPassword = hashPassword(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      name: 'Super Admin',
      role: 'Super Admin',
      department: 'Management',
    },
    create: {
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'Super Admin',
      department: 'Management',
    },
  });

  console.log(`✓ Super Admin upserted: ${admin.email} (ID: ${admin.id})`);
  console.log('');
  console.log('─────────────────────────────────');
  console.log('  LIVE PORTAL ADMIN CREDENTIALS');
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('─────────────────────────────────');
  console.log('');
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
