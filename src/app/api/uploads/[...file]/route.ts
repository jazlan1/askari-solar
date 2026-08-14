import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// Lookup the persistent uploads directory (parent of builds/hbuilds)
function findFileInPersistentDir(relativePath: string): string | null {
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

  // Try both persistent uploads paths
  const candidates = [
    path.join(portalRoot, "uploads", ...relativePath.split("/")),
    path.join(portalRoot, "public", "uploads", ...relativePath.split("/")),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

// Primary lookup: use UPLOADS_DIR env var if set (configured for production Hostinger)
function findFileByEnvDir(relativePath: string): string | null {
  const uploadsDir = process.env.UPLOADS_DIR;
  if (!uploadsDir) return null;

  let corrected = uploadsDir;
  const rootDir = process.cwd();
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

  const candidate = path.join(corrected, relativePath);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  return null;
}

// Fallback search function that climbs parent directories to find the uploaded file
function findFileInParents(relativePath: string) {
  let currentDir = process.cwd();
  // Search up to 10 parent directory levels
  for (let i = 0; i < 10; i++) {
    // Check currentDir + /public/uploads/relativePath
    const p1 = path.join(currentDir, "public", "uploads", relativePath);
    if (fs.existsSync(p1) && fs.statSync(p1).isFile()) {
      return p1;
    }
    // Check currentDir + /uploads/relativePath
    const p2 = path.join(currentDir, "uploads", relativePath);
    if (fs.existsSync(p2) && fs.statSync(p2).isFile()) {
      return p2;
    }
    // Check currentDir + /.next/standalone/public/uploads/relativePath
    const p3 = path.join(currentDir, ".next", "standalone", "public", "uploads", relativePath);
    if (fs.existsSync(p3) && fs.statSync(p3).isFile()) {
      return p3;
    }

    // Check if the current directory is "versions" (which contains other deployments)
    if (path.basename(currentDir) === "versions") {
      try {
        const siblingVersions = fs.readdirSync(currentDir);
        for (const ver of siblingVersions) {
          const candidatePath = path.join(currentDir, ver, "nodejs", "public", "uploads", relativePath);
          if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
            return candidatePath; // Found it in a sibling deployment version!
          }
        }
      } catch (err) {
        console.error("Failed to read versions directory:", err);
      }
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached system root
    }
    currentDir = parentDir;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileSegments = resolvedParams.file;
    if (!fileSegments || fileSegments.length === 0) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Join decoded segments into a relative path
    const relativePath = fileSegments.map(decodeURIComponent).join("/");

    // Prevent directory traversal attacks
    if (
      relativePath.includes("..") ||
      relativePath.startsWith("/") ||
      relativePath.includes("\0")
    ) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    // Primary lookup: check persistent uploads first, then env var, then fallback search
    const foundPath =
      findFileInPersistentDir(relativePath) ??
      findFileByEnvDir(relativePath) ??
      findFileInParents(relativePath);

    if (!foundPath) {
      console.error(`[API Fallback File Server] File not found in any candidates: ${relativePath}`);
      return new NextResponse("File not found", { status: 404 });
    }

    // Read the file content
    const fileBuffer = fs.readFileSync(foundPath);
    const ext = path.extname(foundPath).toLowerCase();

    // Map common file extensions to content types
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === ".doc") contentType = "application/msword";
    else if (ext === ".xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (ext === ".xls") contentType = "application/vnd.ms-excel";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".svg") contentType = "image/svg+xml";
    else if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".zip") contentType = "application/zip";
    else if (ext === ".txt") contentType = "text/plain";
    else if (ext === ".csv") contentType = "text/csv";

    const url = new URL(req.url);
    const forceDownload = url.searchParams.get("download") === "true";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    
    // Serve PDFs, images, and videos inline so they open in the browser,
    // and trigger download attachment for docx/xlsx and binary files.
    const isInline = !forceDownload && [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".mp4", ".txt", ".csv"].includes(ext);
    const filename = path.basename(foundPath);
    if (isInline) {
      headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
    } else {
      headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    }

    // Return the file response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("[API Fallback File Server] Error serving file:", err);
    return new NextResponse("Error serving file", { status: 500 });
  }
}
