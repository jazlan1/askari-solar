import fs from "fs";
import path from "path";
import { prisma } from "./db";

// Helper to recursively list physical files
function getPhysicalFiles(dir: string, baseDir: string): { relativePath: string; isDirectory: boolean; size: number }[] {
  const results: { relativePath: string; isDirectory: boolean; size: number }[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of list) {
    const filePath = path.join(dir, file.name);
    const relPath = path.relative(baseDir, filePath).replace(/\\/g, "/");
    const isDir = file.isDirectory();
    const stats = fs.statSync(filePath);
    
    // Skip hidden files/directories and backup/deploy archives
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

// Helper to find the actual persistent uploads directory on the server
function getUploadsDir(): string | null {
  const rootDir = process.cwd();

  // Try env var first
  const envDir = process.env.UPLOADS_DIR;
  if (envDir) {
    let corrected = envDir;
    // Auto-correct if domain changed from knocksolar to solarkidunya
    if (rootDir.includes("solarkidunya.com") && corrected.includes("knocksolar.com")) {
      corrected = corrected.replace("knocksolar.com", "solarkidunya.com");
    }
    // Auto-correct .builds to hbuilds
    if (rootDir.includes("hbuilds") && corrected.includes(".builds")) {
      corrected = corrected.replace(".builds", "hbuilds");
    }
    // Auto-correct hbuilds/current structure to persistent uploads
    if (corrected.includes("hbuilds/current/nodejs/public/uploads")) {
      corrected = corrected.replace("hbuilds/current/nodejs/public/uploads", "uploads");
    }
    if (fs.existsSync(corrected)) return corrected;
  }

  // Find persistent folder (climbing to parent of builds/hbuilds)
  let current = rootDir;
  for (let i = 0; i < 10; i++) {
    const buildsPath = path.join(current, ".builds");
    const hbuildsPath = path.join(current, "hbuilds");
    if (
      (fs.existsSync(buildsPath) && fs.statSync(buildsPath).isDirectory()) ||
      (fs.existsSync(hbuildsPath) && fs.statSync(hbuildsPath).isDirectory())
    ) {
      // Try both: current/uploads and current/public/uploads
      const candidates = [
        path.join(current, "uploads"),
        path.join(current, "public", "uploads"),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
          return cand;
        }
      }
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Fallback to local public/uploads
  const localDir = path.join(rootDir, "public", "uploads");
  if (fs.existsSync(localDir)) return localDir;

  return null;
}

let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 60 * 1000; // 1 minute throttle

export async function syncFilesystemWithDb() {
  const now = Date.now();
  if (now - lastSyncTime < SYNC_INTERVAL_MS) {
    return; // Throttled, skip redundant disk & db operations
  }
  lastSyncTime = now;

  try {
    const uploadsDir = getUploadsDir();
    if (!uploadsDir) {
      return;
    }

    const files = getPhysicalFiles(uploadsDir, uploadsDir);
    if (files.length === 0) return;
    
    // Batch load existing fileUrls in 1 fast query instead of 300+ sequential queries
    const existingItems = await prisma.fileItem.findMany({
      select: { fileUrl: true }
    });
    const existingUrls = new Set(existingItems.map(i => i.fileUrl).filter(Boolean));

    // Dynamically find or create the 'Quotations' root folder if not existing
    let quotationsFolder = await prisma.fileItem.findFirst({
      where: { name: "Quotations", isFolder: true }
    });
    if (!quotationsFolder) {
      quotationsFolder = await prisma.fileItem.create({
        data: {
          name: "Quotations",
          isFolder: true,
          folderColor: "purple",
          path: "/",
          department: "Accounts",
          docType: "Quotations",
          fileUrl: "/uploads/Quotations"
        }
      });
      existingUrls.add("/uploads/Quotations");
    }
    const quotesFolderId = quotationsFolder.id;
    
    // Sort files so that parent folders are processed before files/subfolders
    files.sort((a, b) => a.relativePath.split("/").length - b.relativePath.split("/").length);

    for (const file of files) {
      const fileUrl = `/uploads/${file.relativePath}`;
      if (existingUrls.has(fileUrl)) {
        continue; // Already synced in memory
      }

      const name = path.basename(file.relativePath);
      const isFolder = file.isDirectory;

      // Find or create parent folder
      const parts = file.relativePath.split("/");
      let parentId: number | null = null;
      let docType = "Other";
      let department = "Shared";

      if (parts.length > 1) {
        const parentParts = parts.slice(0, -1);
        const parentRelativePath = parentParts.join("/");
        const parentUrl = `/uploads/${parentRelativePath}`;
        
        // Search parent folder by fileUrl
        let parentDb = await prisma.fileItem.findFirst({
          where: { fileUrl: parentUrl }
        });

        // Fallback: search by name
        if (!parentDb) {
          const parentName = parentParts[parentParts.length - 1];
          // Try to match parent folder name (or with Office suffix like Islamabad -> Islamabad Office)
          parentDb = await prisma.fileItem.findFirst({
            where: {
              isFolder: true,
              OR: [
                { name: parentName },
                { name: `${parentName} Office` }
              ]
            }
          });

          // If found, update its fileUrl so next search works
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
          // Parent folder not found in database, create it
          let grandParentId: number | null = null;
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
                grandParentId = quotesFolderId; // Quotations folder
              }
            }
          } else {
            if (parentParts.includes("Islamabad")) {
              grandParentId = quotesFolderId; // Quotations folder
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
        // Root folder/file on disk
        if (name === "Islamabad") {
          parentId = quotesFolderId; // Quotations folder
          docType = "Quotations";
          department = "Accounts";
        }
      }

      // Default categories
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
  } catch (err) {
    console.error("Error in syncFilesystemWithDb:", err);
  }
}
