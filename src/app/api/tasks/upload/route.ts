import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Helper to determine outer and standalone uploads directories
function getUploadsDirs() {
  const rootDir = process.cwd();
  
  const isInsideStandalone =
    rootDir.endsWith(".next/standalone") ||
    rootDir.endsWith(".next\\standalone") ||
    fs.existsSync(path.join(rootDir, "server.js"));

  // Find the persistent portal root directory (the parent of `.builds` in production)
  let portalRoot = rootDir;
  let current = rootDir;
  for (let i = 0; i < 10; i++) {
    const buildsPath = path.join(current, ".builds");
    if (fs.existsSync(buildsPath) && fs.statSync(buildsPath).isDirectory()) {
      portalRoot = current;
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  let outerUploadsDir: string;
  let standaloneUploadsDir: string;

  if (isInsideStandalone) {
    standaloneUploadsDir = path.join(rootDir, "public", "uploads");
    outerUploadsDir = path.join(portalRoot, "public", "uploads");
  } else {
    standaloneUploadsDir = path.join(rootDir, ".next", "standalone", "public", "uploads");
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
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
    }

    const ext = path.extname(file.name) || "";
    const safeBase = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 60);
    const timestamp = Date.now();
    const filename = `${safeBase}_${timestamp}${ext}`;

    const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
    
    // Sub-path relative to uploads folder
    const relativeSubPath = path.join("Tasks", filename);
    const outerPath = path.join(outerUploadsDir, relativeSubPath);
    const standalonePath = path.join(standaloneUploadsDir, relativeSubPath);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to both folders
    await fs.promises.mkdir(path.dirname(outerPath), { recursive: true });
    await fs.promises.writeFile(outerPath, buffer);

    await fs.promises.mkdir(path.dirname(standalonePath), { recursive: true });
    await fs.promises.writeFile(standalonePath, buffer);

    const fileUrl = `/uploads/Tasks/${filename}`;
    return NextResponse.json({ success: true, fileUrl, filename: file.name }, { status: 201 });
  } catch (error: any) {
    console.error("Task upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
