import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { getUploadsDirs, logPortalActivity } from "@/lib/upload-helper";
import fs from "fs";
import path from "path";

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

    const formData = await req.formData();
    const fileIdStr = formData.get("fileId") as string | null;
    const fileUrlStr = formData.get("fileUrl") as string | null;
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file content" }, { status: 400 });
    }

    let fileItem = null;
    let relativePath = "";

    if (fileIdStr) {
      const fileId = parseInt(fileIdStr);
      if (!isNaN(fileId)) {
        fileItem = await prisma.fileItem.findUnique({ where: { id: fileId } });
      }
    }

    if (!fileItem && fileUrlStr) {
      fileItem = await prisma.fileItem.findFirst({ where: { fileUrl: fileUrlStr } });
    }

    if (fileItem && fileItem.fileUrl) {
      relativePath = fileItem.fileUrl;
    } else if (fileUrlStr) {
      relativePath = fileUrlStr;
    } else {
      return NextResponse.json({ error: "Could not identify target file path." }, { status: 400 });
    }

    if (relativePath.startsWith("/uploads/")) {
      relativePath = relativePath.substring("/uploads/".length);
    } else if (relativePath.startsWith("/api/uploads/")) {
      relativePath = relativePath.substring("/api/uploads/".length);
    }

    if (relativePath.includes("..") || relativePath.startsWith("/")) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
    const outerPath = path.join(outerUploadsDir, ...relativePath.split("/"));
    const standalonePath = path.join(standaloneUploadsDir, ...relativePath.split("/"));

    // Write to outer persistent storage
    try {
      await fs.promises.mkdir(path.dirname(outerPath), { recursive: true });
      await fs.promises.writeFile(outerPath, buffer);
    } catch (err) {
      console.warn("Outer save warning:", outerPath, err);
    }

    // Write to standalone directory if different
    if (outerPath !== standalonePath) {
      try {
        await fs.promises.mkdir(path.dirname(standalonePath), { recursive: true });
        await fs.promises.writeFile(standalonePath, buffer);
      } catch (err) {
        console.warn("Standalone save warning:", standalonePath, err);
      }
    }

    // Update FileItem record if it exists
    if (fileItem) {
      await prisma.fileItem.update({
        where: { id: fileItem.id },
        data: {
          fileSize: buffer.length,
          updatedAt: new Date(),
        },
      });
    }

    await logPortalActivity({
      userId: payload.userId,
      action: "FILE_EDIT",
      details: `${payload.name || "User"} edited and saved Word document "${path.basename(relativePath)}"`,
    });

    return NextResponse.json({
      success: true,
      fileSize: buffer.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Save docx error:", error);
    return NextResponse.json({ error: error.message || "Failed to save document." }, { status: 500 });
  }
}
