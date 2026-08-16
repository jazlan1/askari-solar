import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { syncFilesystemWithDb } from "@/lib/syncFiles";
import { deleteUploadedFile, logPortalActivity } from "@/lib/upload-helper";

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
    const departmentParam = searchParams.get("department");

    const where: any = {};

    if (departmentParam && departmentParam !== "All" && departmentParam !== "Shared") {
      where.department = departmentParam;
    }

    if (allParam === "true") {
      const items = await prisma.fileItem.findMany({
        where,
        orderBy: { isFolder: "desc" },
      });
      return NextResponse.json({ success: true, items });
    }

    if (searchQuery) {
      where.name = { contains: searchQuery };
      const items = await prisma.fileItem.findMany({
        where,
        orderBy: { isFolder: "desc" },
      });
      return NextResponse.json({ success: true, items });
    }

    if (isFavoriteParam === "true") {
      where.isFavorite = true;
      const items = await prisma.fileItem.findMany({
        where,
        orderBy: { isFolder: "desc" },
      });
      return NextResponse.json({ success: true, items });
    }

    let parentId: number | null = null;
    if (parentIdParam && parentIdParam !== "" && parentIdParam !== "null" && parentIdParam !== "undefined") {
      const parsed = parseInt(parentIdParam);
      if (!isNaN(parsed)) {
        parentId = parsed;
      }
    }
    where.parentId = parentId;

    const items = await prisma.fileItem.findMany({
      where,
      orderBy: [{ isFolder: "desc" }, { name: "asc" }],
    });

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

    const userRoles = (payload.role || "").split(",").map((r) => r.trim().toLowerCase());
    const isAdmin = userRoles.some((r) => ["admin", "super admin", "superadmin", "management"].includes(r));

    const body = await req.json();
    const { action } = body;

    if (action === "CREATE_FOLDER") {
      const { name, parentId, folderColor, department, docType } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
      }

      const pId = parentId ? parseInt(parentId.toString()) : null;

      // Calculate virtual path
      let virtualPath = "/";
      let folderDept = department || payload.department || "Shared";

      if (pId) {
        const parentFolder = await prisma.fileItem.findUnique({ where: { id: pId } });
        if (parentFolder) {
          virtualPath = `${parentFolder.path}/${parentFolder.name}`.replace(/\/\/+/g, "/");
          folderDept = parentFolder.department || folderDept;
        }
      }

      const newFolder = await prisma.fileItem.create({
        data: {
          name: name.trim(),
          isFolder: true,
          folderColor: folderColor || "blue",
          path: virtualPath,
          parentId: pId,
          department: folderDept,
          docType: docType || "Other",
          uploadedById: payload.userId,
        },
      });

      await logPortalActivity({
        userId: payload.userId,
        action: "FOLDER_CREATE",
        details: `${payload.name || "User"} created folder "${name.trim()}" in ${folderDept}`,
      });

      return NextResponse.json({ success: true, folder: newFolder });
    }

    if (action === "RENAME") {
      const { id, name } = body;
      if (!id || !name || !name.trim()) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      const itemId = parseInt(id.toString());
      const itemToUpdate = await prisma.fileItem.findUnique({ where: { id: itemId } });
      if (!itemToUpdate) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      if (!isAdmin && itemToUpdate.uploadedById !== payload.userId && itemToUpdate.department !== payload.department) {
        return NextResponse.json({ error: "Unauthorized to rename this item" }, { status: 403 });
      }

      const updated = await prisma.fileItem.update({
        where: { id: itemId },
        data: { name: name.trim() },
      });

      await logPortalActivity({
        userId: payload.userId,
        action: "FILE_RENAME",
        details: `${payload.name || "User"} renamed "${itemToUpdate.name}" to "${name.trim()}"`,
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

      if (!itemToDelete) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      if (!isAdmin && itemToDelete.uploadedById !== payload.userId && itemToDelete.department !== payload.department) {
        return NextResponse.json({ error: "Unauthorized to delete this item" }, { status: 403 });
      }

      if (itemToDelete.isFolder) {
        const parentFolderPath = `${itemToDelete.path}/${itemToDelete.name}`.replace(/\/\/+/g, "/");
        const childFiles = await prisma.fileItem.findMany({
          where: {
            isFolder: false,
            path: { startsWith: parentFolderPath },
          },
        });
        for (const file of childFiles) {
          await deleteUploadedFile(file.fileUrl);
        }
      } else {
        await deleteUploadedFile(itemToDelete.fileUrl);
      }

      await prisma.fileItem.delete({
        where: { id: itemId },
      });

      await logPortalActivity({
        userId: payload.userId,
        action: "FILE_DELETE",
        details: `${payload.name || "User"} deleted ${itemToDelete.isFolder ? "folder" : "file"} "${itemToDelete.name}"`,
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
          virtualPath = `${parentFolder.path}/${parentFolder.name}`.replace(/\/\/+/g, "/");
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
