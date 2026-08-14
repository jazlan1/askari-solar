const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || "3306"),
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),
  connectTimeout: 10000,
  acquireTimeout: 10000,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Fetching FileItems...");
  const items = await prisma.fileItem.findMany();
  console.log(`Found ${items.length} items.`);
  for (const item of items) {
    if (item.name.toLowerCase().includes("new") || item.isFolder) {
      console.log(`[Folder: ${item.isFolder}] ID: ${item.id}, Name: ${item.name}, Path: ${item.path}, Parent: ${item.parentId}, Url: ${item.fileUrl}, DocType: ${item.docType}, Dept: ${item.department}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
