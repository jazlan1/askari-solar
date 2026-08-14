import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// POST — Public: upload screenshot or attachment for a complaint
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("fileType") as string) || "attachment"; // "screenshot" or "attachment"

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

    const uploadDir = path.join(process.cwd(), "public", "uploads", "Complaints");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, filename), buffer);

    const fileUrl = `/uploads/Complaints/${filename}`;
    return NextResponse.json({ success: true, fileUrl, fileType }, { status: 201 });
  } catch (error) {
    console.error("Complaint upload error:", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
