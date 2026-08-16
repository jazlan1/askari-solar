import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { saveUploadedFile, MAX_FILE_SIZE_BYTES, logPortalActivity } from "@/lib/upload-helper";

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
    
    // Support both multiple files ('files') and single file ('file')
    const filesList: File[] = [];
    const multiFiles = formData.getAll("files");
    if (multiFiles && multiFiles.length > 0) {
      for (const item of multiFiles) {
        if (item instanceof File) filesList.push(item);
      }
    }
    const singleFile = formData.get("file");
    if (singleFile instanceof File && !filesList.some((f) => f.name === singleFile.name)) {
      filesList.push(singleFile);
    }

    if (filesList.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    const parentIdParam = formData.get("parentId") as string | null;
    const departmentParam = formData.get("department") as string | null;
    const docTypeParam = formData.get("docType") as string | null;

    let pId: number | null = null;
    if (parentIdParam && parentIdParam !== "" && parentIdParam !== "null" && parentIdParam !== "undefined") {
      const parsed = parseInt(parentIdParam);
      if (!isNaN(parsed)) pId = parsed;
    }

    let parentPath = "/";
    let folderDept = departmentParam || payload.department || "Shared";

    if (pId) {
      const parentFolder = await prisma.fileItem.findUnique({ where: { id: pId } });
      if (parentFolder) {
        parentPath = `${parentFolder.path}/${parentFolder.name}`.replace(/\/\/+/g, "/");
        folderDept = parentFolder.department || folderDept;
      }
    }

    const savedFileItems = [];

    for (const file of filesList) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 25 MB limit.` },
          { status: 400 }
        );
      }

      const saveResult = await saveUploadedFile(file, "Documents", file.name);
      if (!saveResult.success) {
        return NextResponse.json({ error: saveResult.error || "Upload failed." }, { status: 500 });
      }

      // Detect docType classification
      let docType = docTypeParam || "Other";
      const cleanExt = saveResult.fileExtension;
      const searchString = (file.name + " " + parentPath).toLowerCase();
      if (!docTypeParam) {
        if (searchString.includes("training") || searchString.includes("sop") || searchString.includes("learn")) {
          docType = "Training";
        } else if (searchString.includes("advertisement") || searchString.includes("branding") || searchString.includes("ad")) {
          docType = "Advertisements";
        } else if (searchString.includes("quotation") || searchString.includes("quote")) {
          docType = "Quotations";
        } else if (["xlsx", "xls", "csv", "docx", "doc", "pdf"].includes(cleanExt)) {
          docType = "Documents";
        }
      }

      const newFileItem = await prisma.fileItem.create({
        data: {
          name: file.name,
          isFolder: false,
          fileExtension: cleanExt,
          fileSize: saveResult.fileSize,
          fileUrl: saveResult.fileUrl,
          parentId: pId,
          path: parentPath,
          department: folderDept,
          docType: docType,
          uploadedById: payload.userId,
          isFavorite: false,
        },
      });

      await logPortalActivity({
        userId: payload.userId,
        action: "FILE_UPLOAD",
        details: `${payload.name || "User"} uploaded "${file.name}" to ${folderDept} (${parentPath})`,
      });

      savedFileItems.push(newFileItem);
    }

    return NextResponse.json(
      {
        success: true,
        files: savedFileItems,
        file: savedFileItems[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("FileManager upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
