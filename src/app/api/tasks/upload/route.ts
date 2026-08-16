import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { saveUploadedFile, MAX_FILE_SIZE_BYTES } from "@/lib/upload-helper";

export const runtime = "nodejs";

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

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 25 MB." }, { status: 400 });
    }

    const result = await saveUploadedFile(file, "Tasks", file.name);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Upload failed." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileUrl: result.fileUrl,
      filename: result.fileName,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Task upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
