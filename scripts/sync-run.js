require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const fs = require('fs');
const path = require('path');

const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || "3306"),
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),
});

const prisma = new PrismaClient({ adapter });

// Helper to recursively list physical files
function getPhysicalFiles(dir, baseDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of list) {
    const filePath = path.join(dir, file.name);
    const relPath = path.relative(baseDir, filePath).replace(/\\/g, "/");
    const isDir = file.isDirectory();
    const stats = fs.statSync(filePath);
    
    if (
      file.name.startsWith(".") || 
      file.name === "node_modules" || 
      file.name.endsWith(".zip") || 
      file.name.endsWith(".tgz") || 
      file.name.endsWith(".tar.gz")
    ) {
      continue;
    }
    
    results.push({
      relativePath: relPath,
      isDirectory: isDir,
      size: isDir ? 0 : stats.size
    });
    
    if (isDir) {
      results.push(...getPhysicalFiles(filePath, baseDir));
    }
  }
  return results;
}

async function run() {
  try {
    console.log("=== Running Files Sync ===");
    const uploadsDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadsDir)) {
      console.log("Uploads directory not found!");
      return;
    }

    const files = getPhysicalFiles(uploadsDir, uploadsDir);
    files.sort((a, b) => a.relativePath.split("/").length - b.relativePath.split("/").length);

    for (const file of files) {
      const fileUrl = `/uploads/${file.relativePath}`;
      const name = path.basename(file.relativePath);
      const isFolder = file.isDirectory;

      let dbItem = await prisma.fileItem.findFirst({
        where: { fileUrl }
      });

      if (dbItem) {
        continue;
      }

      const parts = file.relativePath.split("/");
      let parentId = null;
      let docType = "Other";
      let department = "Shared";

      if (parts.length > 1) {
        const parentParts = parts.slice(0, -1);
        const parentRelativePath = parentParts.join("/");
        const parentUrl = `/uploads/${parentRelativePath}`;
        
        let parentDb = await prisma.fileItem.findFirst({
          where: { fileUrl: parentUrl }
        });

        if (!parentDb) {
          const parentName = parentParts[parentParts.length - 1];
          parentDb = await prisma.fileItem.findFirst({
            where: {
              isFolder: true,
              OR: [
                { name: parentName },
                { name: `${parentName} Office` }
              ]
            }
          });

          if (parentDb) {
            await prisma.fileItem.update({
              where: { id: parentDb.id },
              data: { fileUrl: parentUrl }
            });
          }
        }

        if (parentDb) {
          parentId = parentDb.id;
          docType = parentDb.docType;
          department = parentDb.department;
        } else {
          let grandParentId = null;
          if (parentParts.length > 1) {
            const grandParentParts = parentParts.slice(0, -1);
            const grandParentUrl = `/uploads/${grandParentParts.join("/")}`;
            const grandParentDb = await prisma.fileItem.findFirst({
              where: { fileUrl: grandParentUrl }
            });
            if (grandParentDb) {
              grandParentId = grandParentDb.id;
            } else {
              if (parentParts.includes("Islamabad")) {
                grandParentId = 1218;
              }
            }
          } else {
            if (parentParts.includes("Islamabad")) {
              grandParentId = 1218;
            }
          }

          if (parentParts.includes("Islamabad") || file.relativePath.toLowerCase().includes("quotation")) {
            docType = "Quotations";
            department = "Accounts";
          }

          const parentName = parentParts[parentParts.length - 1];
          const newParent = await prisma.fileItem.create({
            data: {
              name: parentName === "Islamabad" ? "Islamabad Office" : parentName,
              isFolder: true,
              folderColor: "blue",
              path: grandParentId ? `/Quotations` : "/",
              parentId: grandParentId,
              department,
              docType,
              fileUrl: parentUrl
            }
          });
          parentId = newParent.id;
        }
      } else {
        if (name === "Islamabad") {
          parentId = 1218;
          docType = "Quotations";
          department = "Accounts";
        }
      }

      if (file.relativePath.toLowerCase().includes("quotation") || file.relativePath.toLowerCase().includes("islamabad")) {
        docType = "Quotations";
        department = "Accounts";
      }

      const ext = isFolder ? null : path.extname(name).substring(1) || "file";
      
      await prisma.fileItem.create({
        data: {
          name,
          isFolder,
          folderColor: isFolder ? "amber" : null,
          path: parentId ? `/Quotations` : "/",
          parentId,
          department,
          docType,
          fileExtension: ext,
          fileSize: file.size || null,
          fileUrl
        }
      });
      console.log(`Synced filesystem item: ${file.relativePath}`);
    }
    console.log("=== Sync Completed Successfully ===");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
