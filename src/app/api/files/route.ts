import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { syncFilesystemWithDb } from "@/lib/syncFiles";
import fs from "fs";
import path from "path";

function getUploadsDirs() {
  const rootDir = process.cwd();
  
  let portalRoot = rootDir;
  let current = rootDir;
  for (let i = 0; i < 10; i++) {
    const buildsPath = path.join(current, ".builds");
    const hbuildsPath = path.join(current, "hbuilds");
    if (
      (fs.existsSync(buildsPath) && fs.statSync(buildsPath).isDirectory()) ||
      (fs.existsSync(hbuildsPath) && fs.statSync(hbuildsPath).isDirectory())
    ) {
      portalRoot = current;
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  let outerUploadsDir: string;
  let standaloneUploadsDir: string;

  if (process.env.NODE_ENV === "production") {
    const envDir = process.env.UPLOADS_DIR;
    if (envDir) {
      let corrected = envDir;
      if (rootDir.includes("solarkidunya.com") && corrected.includes("knocksolar.com")) {
        corrected = corrected.replace("knocksolar.com", "solarkidunya.com");
      }
      if (rootDir.includes("hbuilds") && corrected.includes(".builds")) {
        corrected = corrected.replace(".builds", "hbuilds");
      }
      if (corrected.includes("hbuilds/current/nodejs/public/uploads")) {
        corrected = corrected.replace("hbuilds/current/nodejs/public/uploads", "uploads");
      }
      outerUploadsDir = corrected;
      standaloneUploadsDir = corrected;
    } else {
      outerUploadsDir = path.join(portalRoot, "uploads");
      standaloneUploadsDir = path.join(rootDir, ".next", "standalone", "public", "uploads");
    }
  } else {
    outerUploadsDir = path.join(rootDir, "public", "uploads");
    standaloneUploadsDir = path.join(rootDir, "public", "uploads");
  }

  return {
    outerUploadsDir,
    standaloneUploadsDir,
  };
}

function deletePhysicalFile(fileUrl: string | null) {
  if (!fileUrl) return;
  let relativePath = fileUrl;
  if (relativePath.startsWith("/uploads/")) {
    relativePath = relativePath.substring("/uploads/".length);
  } else if (relativePath.startsWith("/api/uploads/")) {
    relativePath = relativePath.substring("/api/uploads/".length);
  }
  
  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    return;
  }
  
  const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
  const outerPath = path.join(outerUploadsDir, ...relativePath.split("/"));
  const standalonePath = path.join(standaloneUploadsDir, ...relativePath.split("/"));
  
  try {
    if (fs.existsSync(outerPath) && fs.statSync(outerPath).isFile()) {
      fs.unlinkSync(outerPath);
    }
  } catch (err) {
    console.error("Failed to delete outer physical file:", outerPath, err);
  }
  
  try {
    if (fs.existsSync(standalonePath) && fs.statSync(standalonePath).isFile()) {
      fs.unlinkSync(standalonePath);
    }
  } catch (err) {
    console.error("Failed to delete standalone physical file:", standalonePath, err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Automatically sync manual uploads on filesystem to DB
    await syncFilesystemWithDb();

    const { searchParams } = new URL(req.url);
    const parentIdParam = searchParams.get("parentId");
    const isFavoriteParam = searchParams.get("favorites");
    const searchQuery = searchParams.get("search");
    const allParam = searchParams.get("all");

    let items;

    if (allParam === "true") {
      items = await prisma.fileItem.findMany({
        orderBy: { isFolder: "desc" },
      });
    } else

    if (searchQuery) {
      items = await prisma.fileItem.findMany({
        where: {
          name: { contains: searchQuery },
        },
        orderBy: { isFolder: "desc" },
      });
    } else if (isFavoriteParam === "true") {
      items = await prisma.fileItem.findMany({
        where: { isFavorite: true },
        orderBy: { isFolder: "desc" },
      });
    } else {
      let parentId: number | null = null;
      if (parentIdParam && parentIdParam !== "" && parentIdParam !== "null" && parentIdParam !== "undefined") {
        const parsed = parseInt(parentIdParam);
        if (!isNaN(parsed)) {
          parentId = parsed;
        }
      }
      items = await prisma.fileItem.findMany({
        where: { parentId },
        orderBy: { isFolder: "desc" },
      });
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("FileManager GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "CREATE_FOLDER") {
      const { name, parentId, folderColor } = body;
      if (!name) {
        return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
      }

      const pId = parentId ? parseInt(parentId.toString()) : null;
      
      // Calculate virtual path
      let virtualPath = "/";
      if (pId) {
        const parentFolder = await prisma.fileItem.findUnique({ where: { id: pId } });
        if (parentFolder) {
          virtualPath = `${parentFolder.path}/${parentFolder.name}`;
        }
      }

      const newFolder = await prisma.fileItem.create({
        data: {
          name,
          isFolder: true,
          folderColor: folderColor || "blue",
          path: virtualPath,
          parentId: pId,
          department: payload.department || "Shared",
          docType: "Other",
        },
      });

      return NextResponse.json({ success: true, folder: newFolder });
    }

    if (action === "RENAME") {
      const { id, name } = body;
      if (!id || !name) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      const updated = await prisma.fileItem.update({
        where: { id: parseInt(id.toString()) },
        data: { name },
      });

      return NextResponse.json({ success: true, item: updated });
    }

    if (action === "FAVORITE") {
      const { id, isFavorite } = body;
      if (!id) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      const updated = await prisma.fileItem.update({
        where: { id: parseInt(id.toString()) },
        data: { isFavorite },
      });

      return NextResponse.json({ success: true, item: updated });
    }

    if (action === "DELETE") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      const itemId = parseInt(id.toString());
      const itemToDelete = await prisma.fileItem.findUnique({
        where: { id: itemId },
      });

      if (itemToDelete) {
        if (itemToDelete.isFolder) {
          const parentFolderPath = `${itemToDelete.path}/${itemToDelete.name}`.replace(/\/\/+/g, "/");
          const childFiles = await prisma.fileItem.findMany({
            where: {
              isFolder: false,
              path: { startsWith: parentFolderPath },
            },
          });
          for (const file of childFiles) {
            deletePhysicalFile(file.fileUrl);
          }
        } else {
          deletePhysicalFile(itemToDelete.fileUrl);
        }
      }

      await prisma.fileItem.delete({
        where: { id: itemId },
      });

      return NextResponse.json({ success: true, message: "Item deleted successfully" });
    }

    if (action === "MOVE") {
      const { id, newParentId } = body;
      if (!id) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      const npId = newParentId ? parseInt(newParentId.toString()) : null;

      // Update path
      let virtualPath = "/";
      if (npId) {
        const parentFolder = await prisma.fileItem.findUnique({ where: { id: npId } });
        if (parentFolder) {
          virtualPath = `${parentFolder.path}/${parentFolder.name}`;
        }
      }

      const updated = await prisma.fileItem.update({
        where: { id: parseInt(id.toString()) },
        data: { parentId: npId, path: virtualPath },
      });

      return NextResponse.json({ success: true, item: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("FileManager action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
