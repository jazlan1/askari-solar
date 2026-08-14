require('dotenv').config();
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

async function run() {
  try {
    console.log("=== Listing Root Folders (parentId === null) ===");
    const items = await prisma.fileItem.findMany({
      where: { parentId: null }
    });
    items.forEach(item => {
      console.log(`ID: ${item.id}, Name: ${item.name}, isFolder: ${item.isFolder}, Department: ${item.department}, docType: ${item.docType}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
