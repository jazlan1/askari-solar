import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB universal limit

export interface UploadResult {
  success: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileExtension: string;
  error?: string;
}

/**
 * Resolves persistent upload directories for production on Hostinger and local dev.
 */
export function getUploadsDirs() {
  const rootDir = process.cwd();

  // Find persistent portal root directory (parent of builds / hbuilds)
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

  const envDir = process.env.UPLOADS_DIR;
  if (process.env.NODE_ENV === "production" && envDir) {
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
  } else if (process.env.NODE_ENV === "production") {
    outerUploadsDir = path.join(portalRoot, "uploads");
    standaloneUploadsDir = path.join(rootDir, ".next", "standalone", "public", "uploads");
  } else {
    outerUploadsDir = path.join(rootDir, "public", "uploads");
    standaloneUploadsDir = path.join(rootDir, "public", "uploads");
  }

  return {
    outerUploadsDir,
    standaloneUploadsDir,
  };
}

/**
 * Saves a file buffer or Web File object to persistent disk storage.
 */
export async function saveUploadedFile(
  fileData: File | Blob | Buffer,
  subFolder: string,
  originalFileName?: string
): Promise<UploadResult> {
  try {
    let buffer: Buffer;
    let name = originalFileName || "file";
    let size = 0;

    if (fileData instanceof Buffer) {
      buffer = fileData;
      size = buffer.length;
    } else if (fileData instanceof Blob || (typeof File !== "undefined" && fileData instanceof File)) {
      if (fileData instanceof File) {
        name = fileData.name;
      }
      size = fileData.size;
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error("Invalid file data format");
    }

    if (size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        fileUrl: "",
        fileName: name,
        fileSize: size,
        fileExtension: "",
        error: `File size exceeds 25 MB limit (${(size / (1024 * 1024)).toFixed(1)} MB).`,
      };
    }

    const ext = path.extname(name) || "";
    const cleanExt = ext.replace(".", "").toLowerCase();
    const safeBase = name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 60);
    const timestamp = Date.now();
    const uniqueFilename = `${safeBase}_${timestamp}${ext}`;

    const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
    const cleanSub = subFolder.replace(/^[\/\\]+|[\/\\]+$/g, "");
    const relativeSubPath = path.join(cleanSub, uniqueFilename);

    const outerPath = path.join(outerUploadsDir, relativeSubPath);
    const standalonePath = path.join(standaloneUploadsDir, relativeSubPath);

    // Save to outer/persistent directory
    try {
      await fs.promises.mkdir(path.dirname(outerPath), { recursive: true });
      await fs.promises.writeFile(outerPath, buffer);
    } catch (e) {
      console.warn("Outer uploads save warning:", outerPath, e);
    }

    // Save to standalone directory if different
    if (outerPath !== standalonePath) {
      try {
        await fs.promises.mkdir(path.dirname(standalonePath), { recursive: true });
        await fs.promises.writeFile(standalonePath, buffer);
      } catch (e) {
        console.warn("Standalone uploads save warning:", standalonePath, e);
      }
    }

    const fileUrl = `/uploads/${cleanSub.replace(/\\/g, "/")}/${uniqueFilename}`;

    return {
      success: true,
      fileUrl,
      fileName: name,
      fileSize: size,
      fileExtension: cleanExt,
    };
  } catch (err: any) {
    console.error("saveUploadedFile error:", err);
    return {
      success: false,
      fileUrl: "",
      fileName: originalFileName || "file",
      fileSize: 0,
      fileExtension: "",
      error: err.message || "Failed to save file.",
    };
  }
}

/**
 * Safely removes a file from disk across outer and standalone directories.
 */
export async function deleteUploadedFile(fileUrl: string | null | undefined): Promise<boolean> {
  if (!fileUrl) return false;

  let relativePath = fileUrl;
  if (relativePath.startsWith("/uploads/")) {
    relativePath = relativePath.substring("/uploads/".length);
  } else if (relativePath.startsWith("/api/uploads/")) {
    relativePath = relativePath.substring("/api/uploads/".length);
  }

  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    return false;
  }

  const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
  const outerPath = path.join(outerUploadsDir, ...relativePath.split("/"));
  const standalonePath = path.join(standaloneUploadsDir, ...relativePath.split("/"));

  let deleted = false;
  try {
    if (fs.existsSync(outerPath) && fs.statSync(outerPath).isFile()) {
      fs.unlinkSync(outerPath);
      deleted = true;
    }
  } catch (err) {
    console.error("Failed to delete outer file:", outerPath, err);
  }

  try {
    if (fs.existsSync(standalonePath) && fs.statSync(standalonePath).isFile()) {
      fs.unlinkSync(standalonePath);
      deleted = true;
    }
  } catch (err) {
    console.error("Failed to delete standalone file:", standalonePath, err);
  }

  return deleted;
}

/**
 * Standardized portal activity logger.
 */
export async function logPortalActivity({
  userId,
  action,
  details,
}: {
  userId: number;
  action: string;
  details: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (err) {
    console.warn("logPortalActivity non-fatal warning:", err);
  }
}
