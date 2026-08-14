import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execPromise = promisify(exec);

// POST: Write a new schema and run prisma db push
// GET:  Fix build source permissions + run prisma db push with current schema
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== "askari-unzip-secret-987") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rootDir = process.cwd();
  const results: Record<string, unknown> = { cwd: rootDir };

  // 1. Fix permissions on Prisma engine binaries to ensure execution permissions
  try {
    const enginesDir = path.join(rootDir, 'node_modules', '@prisma', 'engines');
    if (fs.existsSync(enginesDir)) {
      const files = fs.readdirSync(enginesDir);
      for (const file of files) {
        const filePath = path.join(enginesDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.chmodSync(filePath, 0o755);
        }
      }
    }
    results.chmodSource = { success: true };
  } catch (e: any) {
    results.chmodSource = { error: e.message, success: false };
  }

  // 2. Run prisma db push with current schema
  const nodeBin = process.execPath;
  try {
    const { stdout, stderr } = await execPromise(
      `"${nodeBin}" node_modules/prisma/build/index.js db push --accept-data-loss`,
      { cwd: rootDir, env: { ...process.env } }
    );
    results.dbPush = { stdout, stderr, success: true };
  } catch (e: any) {
    results.dbPush = { error: e.message, stdout: e.stdout, stderr: e.stderr, success: false };
  }

  return NextResponse.json(results);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== "askari-unzip-secret-987") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rootDir = process.cwd();
  const results: Record<string, unknown> = { cwd: rootDir };

  try {
    const body = await req.json();
    const { schema } = body;

    if (!schema) {
      return NextResponse.json({ error: "schema field required in body" }, { status: 400 });
    }

    // Write the new schema to prisma/schema.prisma
    const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
    const schemaDir = path.dirname(schemaPath);
    if (!fs.existsSync(schemaDir)) {
      fs.mkdirSync(schemaDir, { recursive: true });
    }

    fs.writeFileSync(schemaPath, schema, "utf8");
    results.schemaWritten = schemaPath;

    // Fix permissions on Prisma engine binaries (non-fatal)
    try {
      const enginesDir = path.join(rootDir, 'node_modules', '@prisma', 'engines');
      if (fs.existsSync(enginesDir)) {
        const files = fs.readdirSync(enginesDir);
        for (const file of files) {
          const filePath = path.join(enginesDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.chmodSync(filePath, 0o755);
          }
        }
      }
      results.chmodSource = "done";
    } catch {}

    // Run prisma db push
    const nodeBin = process.execPath;
    const { stdout, stderr } = await execPromise(
      `"${nodeBin}" node_modules/prisma/build/index.js db push --accept-data-loss`,
      { cwd: rootDir, env: { ...process.env } }
    );
    results.dbPush = { stdout, stderr, success: true };

  } catch (e: any) {
    results.error = e.message;
    results.stdout = e.stdout;
    results.stderr = e.stderr;
  }

  return NextResponse.json(results);
}
