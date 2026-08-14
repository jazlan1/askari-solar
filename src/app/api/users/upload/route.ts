import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import fs from "fs";
import path from "path";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB limit

function getUploadsDirs() {
  const rootDir = process.cwd();
  const portalRoot = "D:\\Askari portal";
  
  let outerUploadsDir: string;
  let standaloneUploadsDir: string;

  if (process.env.NODE_ENV === "production") {
    standaloneUploadsDir = path.join(rootDir, ".next", "standalone", "public", "uploads");
    outerUploadsDir = path.join(portalRoot, "public", "uploads");
  } else {
    standaloneUploadsDir = path.join(rootDir, "public", "uploads");
    outerUploadsDir = path.join(portalRoot, "public", "uploads");
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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    if (!userRoles.some(r => ["Admin", "HR", "Super Admin", "Management"].includes(r))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 15 MB." }, { status: 400 });
    }

    const ext = path.extname(file.name) || "";
    const safeBase = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 60);
    const timestamp = Date.now();
    const filename = `${safeBase}_${timestamp}${ext}`;

    const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
    const relativeSubPath = path.join("Users", filename);
    const outerPath = path.join(outerUploadsDir, relativeSubPath);
    const standalonePath = path.join(standaloneUploadsDir, relativeSubPath);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to disk
    await fs.promises.mkdir(path.dirname(outerPath), { recursive: true });
    await fs.promises.writeFile(outerPath, buffer);

    await fs.promises.mkdir(path.dirname(standalonePath), { recursive: true });
    await fs.promises.writeFile(standalonePath, buffer);

    return NextResponse.json({
      success: true,
      fileUrl: `/uploads/Users/${filename}`,
      fileName: file.name,
      fileSize: file.size
    });
  } catch (error: any) {
    console.error("Employee document upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
