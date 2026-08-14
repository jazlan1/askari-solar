import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import fs from "fs";
import path from "path";

// Helper to determine outer and standalone uploads directories
function getUploadsDirs() {
  const rootDir = process.cwd();
  
  const isInsideStandalone =
    rootDir.endsWith(".next/standalone") ||
    rootDir.endsWith(".next\\standalone") ||
    fs.existsSync(path.join(rootDir, "server.js"));

  // Find the persistent portal root directory (the parent of `.builds`/`hbuilds` in production)
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

  // Try env var first in production
  const envDir = process.env.UPLOADS_DIR;
  if (process.env.NODE_ENV === "production" && envDir) {
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
    // Dev or fallback
    if (isInsideStandalone) {
      standaloneUploadsDir = path.join(rootDir, "public", "uploads");
      outerUploadsDir = path.join(portalRoot, "uploads");
      if (!fs.existsSync(outerUploadsDir)) {
        outerUploadsDir = path.join(portalRoot, "public", "uploads");
      }
    } else {
      standaloneUploadsDir = path.join(rootDir, ".next", "standalone", "public", "uploads");
      outerUploadsDir = path.join(portalRoot, "uploads");
      if (!fs.existsSync(outerUploadsDir)) {
        outerUploadsDir = path.join(portalRoot, "public", "uploads");
      }
    }
  }

  return {
    outerUploadsDir,
    standaloneUploadsDir,
  };
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
      if (!isNaN(fileId) && fileId > 0) {
        fileItem = await prisma.fileItem.findUnique({
          where: { id: fileId }
        });
      }
    }

    if (!fileItem && fileUrlStr) {
      let cleanUrl = fileUrlStr;
      if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
        try {
          const parsed = new URL(cleanUrl);
          cleanUrl = parsed.pathname;
        } catch {}
      }
      fileItem = await prisma.fileItem.findFirst({
        where: { fileUrl: cleanUrl }
      });
      if (!fileItem) {
        relativePath = cleanUrl;
      }
    }

    if (fileItem) {
      relativePath = fileItem.fileUrl || "";
    }

    if (!relativePath) {
      return NextResponse.json({ error: "Excel file path or URL not resolved" }, { status: 400 });
    }

    // Extract subpath from fileUrl (e.g. "/uploads/Documents/Price List.xlsx" -> "Documents/Price List.xlsx")
    if (relativePath.startsWith("/uploads/")) {
      relativePath = relativePath.substring("/uploads/".length);
    } else if (relativePath.startsWith("/api/uploads/")) {
      relativePath = relativePath.substring("/api/uploads/".length);
    }

    // Double check paths to prevent directory traversal
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
      return NextResponse.json({ error: "Invalid file location path" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write to both standard and standalone uploads directories
    const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
    const outerFilePath = path.join(outerUploadsDir, ...relativePath.split("/"));
    const standaloneFilePath = path.join(standaloneUploadsDir, ...relativePath.split("/"));

    // Helper write
    const writeToLocation = async (targetPath: string) => {
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, buffer);
    };

    await Promise.all([
      writeToLocation(outerFilePath),
      writeToLocation(standaloneFilePath)
    ]);

    // Update database record sizes
    let updated = null;
    if (fileItem) {
      updated = await prisma.fileItem.update({
        where: { id: fileItem.id },
        data: {
          fileSize: buffer.length,
          version: { increment: 1 }
        }
      });
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "FILE_EDITED",
        details: `Edited Excel file "${fileItem ? fileItem.name : relativePath.split("/").pop()}" inside portal. Size: ${(buffer.length / 1024).toFixed(1)} KB`
      }
    });

    return NextResponse.json({ success: true, file: updated });
  } catch (error: any) {
    console.error("Save Excel API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
