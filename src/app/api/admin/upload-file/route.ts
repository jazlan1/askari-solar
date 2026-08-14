import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const ADMIN_SECRET = "askari-unzip-secret-987";

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
    portalRoot,
  };
}

function normalizeUploadPath(rawPath: string | null) {
  if (!rawPath) {
    throw new Error("Missing path");
  }

  const normalized = path.posix.normalize(rawPath.replace(/\\/g, "/"));
  if (
    normalized.startsWith("../") ||
    normalized === ".." ||
    normalized.startsWith("/") ||
    normalized.includes("\0")
  ) {
    throw new Error("Invalid path");
  }

  return normalized;
}

async function writeFile(root: string, relativePath: string, body: Buffer) {
  const targetPath = path.join(root, ...relativePath.split("/"));
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(targetPath);

  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Resolved path escaped uploads directory");
  }

  await fs.promises.mkdir(path.dirname(resolvedTarget), { recursive: true });
  await fs.promises.writeFile(resolvedTarget, body);
  return resolvedTarget;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ success: true, ...getUploadsDirs() });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let relativePath: string;
  try {
    relativePath = normalizeUploadPath(searchParams.get("path"));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const body = Buffer.from(await req.arrayBuffer());
  const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();

  try {
    const outerPath = await writeFile(outerUploadsDir, relativePath, body);
    const standalonePath = await writeFile(standaloneUploadsDir, relativePath, body);

    return NextResponse.json({
      success: true,
      bytes: body.length,
      path: relativePath,
      outerPath,
      standalonePath,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
