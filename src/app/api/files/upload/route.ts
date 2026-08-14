import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import fs from "fs";
import path from "path";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit for spreadsheets/documents

function getUploadsDirs() {
  const rootDir = process.cwd();
  
  // Find persistent portal root
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
    // If UPLOADS_DIR environment variable is set, use it for persistent storage
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
      // Fallback
      outerUploadsDir = path.join(portalRoot, "uploads");
      standaloneUploadsDir = path.join(rootDir, ".next", "standalone", "public", "uploads");
    }
  } else {
    // Local dev
    outerUploadsDir = path.join(rootDir, "public", "uploads");
    standaloneUploadsDir = path.join(rootDir, "public", "uploads");
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
    const file = formData.get("file") as File | null;
    const parentIdParam = formData.get("parentId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 25 MB." }, { status: 400 });
    }

    const ext = path.extname(file.name) || "";
    const cleanExt = ext.replace(".", "").toLowerCase();
    const safeBase = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 60);
    const timestamp = Date.now();
    const filename = `${safeBase}_${timestamp}${ext}`;

    const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
    const relativeSubPath = path.join("Documents", filename);
    const outerPath = path.join(outerUploadsDir, relativeSubPath);
    const standalonePath = path.join(standaloneUploadsDir, relativeSubPath);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to disk
    await fs.promises.mkdir(path.dirname(outerPath), { recursive: true });
    await fs.promises.writeFile(outerPath, buffer);

    await fs.promises.mkdir(path.dirname(standalonePath), { recursive: true });
    await fs.promises.writeFile(standalonePath, buffer);

    // Get parent folder info
    let pId = parentIdParam ? parseInt(parentIdParam) : null;
    if (isNaN(pId as number)) pId = null;

    let parentPath = "/";

    if (pId) {
      const parentFolder = await prisma.fileItem.findUnique({ where: { id: pId } });
      if (parentFolder) {
        parentPath = `${parentFolder.path}/${parentFolder.name}`.replace(/\/\/+/g, "/");
      }
    }

    // Auto-detect docType classification
    let docType = "Other";
    const searchString = (file.name + " " + parentPath).toLowerCase();
    if (searchString.includes("training") || searchString.includes("learn") || searchString.includes("material")) {
      docType = "Training";
    } else if (searchString.includes("advertisement") || searchString.includes("branding") || searchString.includes("ad") || searchString.includes("social")) {
      docType = "Advertisements";
    } else if (["xlsx", "xls", "csv"].includes(cleanExt) || searchString.includes("price") || searchString.includes("invoice") || searchString.includes("quotation")) {
      docType = "Documents";
    }

    const newFileItem = await prisma.fileItem.create({
      data: {
        name: file.name,
        isFolder: false,
        fileExtension: cleanExt,
        fileSize: file.size,
        fileUrl: `/uploads/Documents/${filename}`,
        parentId: pId,
        path: parentPath,
        department: payload.department || "Shared",
        docType: docType,
        isFavorite: false,
      },
    });

    return NextResponse.json({ success: true, file: newFileItem }, { status: 201 });
  } catch (error: any) {
    console.error("FileManager upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
