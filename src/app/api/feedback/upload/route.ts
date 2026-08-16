import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile, MAX_FILE_SIZE_BYTES } from "@/lib/upload-helper";

// POST — Public: upload customer photo or warranty card
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("fileType") as string) || "photo"; // "photo" or "warranty"

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 25 MB." }, { status: 400 });
    }

    const result = await saveUploadedFile(file, "Feedback", file.name);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Upload failed." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      fileType,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Feedback upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
