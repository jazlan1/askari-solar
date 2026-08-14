import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const zipFilename = searchParams.get("file");

  if (secret !== "askari-unzip-secret-987") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Resolve paths dynamically based on working directory
  const rootDir = process.cwd(); // e.g. /home/u504701759/domains/knocksolar.com/portal/.builds/versions/VERSION_ID/nodejs
  
  const isInsideStandalone = rootDir.endsWith(".next/standalone") || 
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

  let standaloneUploadsDir: string;
  let outerUploadsDir: string;
  let pastVersionsDir: string;

  if (isInsideStandalone) {
    standaloneUploadsDir = path.join(rootDir, "public", "uploads");
    outerUploadsDir = path.join(portalRoot, "public", "uploads");
    pastVersionsDir = path.join(portalRoot, ".builds", "versions");
  } else {
    standaloneUploadsDir = path.join(rootDir, ".next", "standalone", "public", "uploads");
    outerUploadsDir = path.join(portalRoot, "public", "uploads");
    pastVersionsDir = path.join(portalRoot, ".builds", "versions");
  }

  // Ensure target directories exist
  if (!fs.existsSync(outerUploadsDir)) {
    fs.mkdirSync(outerUploadsDir, { recursive: true });
  }
  if (!fs.existsSync(standaloneUploadsDir)) {
    fs.mkdirSync(standaloneUploadsDir, { recursive: true });
  }

  // 2. Locate any uploads folders in other deployment versions to recover previously uploaded files
  let bestSourceDir = "";
  let maxFileCount = 0;
  
  try {
    if (fs.existsSync(pastVersionsDir) && pastVersionsDir.endsWith("versions")) {
      const versions = fs.readdirSync(pastVersionsDir);
      for (const ver of versions) {
        const verUploadsDir = path.join(pastVersionsDir, ver, "nodejs", "public", "uploads");
        if (fs.existsSync(verUploadsDir)) {
          // Count files inside
          let count = 0;
          const countFiles = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                countFiles(path.join(dir, entry.name));
              } else {
                count++;
              }
            }
          };
          try {
            countFiles(verUploadsDir);
            if (count > maxFileCount) {
              maxFileCount = count;
              bestSourceDir = verUploadsDir;
            }
          } catch {}
        }
      }
    }
  } catch (err: any) {
    console.error("Failed to find past version uploads:", err.message);
  }

  // Sync past uploads from another version folder if found and current outer folder is empty
  const restoreStats = { files: 0, folders: 0 };
  if (bestSourceDir && bestSourceDir !== outerUploadsDir) {
    console.log(`Found past version uploads at: ${bestSourceDir} containing ${maxFileCount} files.`);
    
    function copyMissingDir(src: string, dest: string) {
      if (!fs.existsSync(src)) return;
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
        restoreStats.folders++;
      }
      const entries = fs.readdirSync(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          copyMissingDir(srcPath, destPath);
        } else {
          if (!fs.existsSync(destPath)) {
            fs.copyFileSync(srcPath, destPath);
            restoreStats.files++;
          }
        }
      }
    }

    try {
      copyMissingDir(bestSourceDir, outerUploadsDir);
      console.log(`Restored ${restoreStats.files} missing files from past deployment.`);
    } catch (restoreErr: any) {
      console.error("Failed to restore past version uploads:", restoreErr.message);
    }
  }

  let unzipResult: any = null;

  // 3. If a zip file was specified, extract it to the outer uploads folder first
  if (zipFilename) {
    // Search for zip in both outer and inner folders
    const zipPathsToTry = [
      path.join(outerUploadsDir, zipFilename),
      path.join(standaloneUploadsDir, zipFilename)
    ];

    let foundZipPath = "";
    for (const p of zipPathsToTry) {
      if (fs.existsSync(p)) {
        foundZipPath = p;
        break;
      }
    }

    if (!foundZipPath) {
      return NextResponse.json(
        {
          error: "Zip file not found",
          searchedPaths: zipPathsToTry,
        },
        { status: 404 }
      );
    }

    try {
      console.log(`Extracting zip: ${foundZipPath} to outer folder...`);
      const { stdout, stderr } = await execPromise(`unzip -o "${foundZipPath}" -d "${outerUploadsDir}"`);
      
      unzipResult = {
        success: true,
        zip: zipFilename,
        stdout,
        stderr
      };

      // Delete the zip file after successful extraction
      try {
        fs.unlinkSync(foundZipPath);
      } catch (unlinkErr) {
        console.error("Failed to delete zip file:", unlinkErr);
      }
    } catch (unzipErr: any) {
      return NextResponse.json(
        { error: "Unzip failed", message: unzipErr.message, stderr: unzipErr.stderr },
        { status: 500 }
      );
    }
  }

  // 4. Sync all files recursively from outer public/uploads to standalone public/uploads
  const syncStats = { files: 0, folders: 0 };
  
  function syncDir(src: string, dest: string) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
      syncStats.folders++;
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        syncDir(srcPath, destPath);
      } else {
        // Copy if file doesn't exist or is of a different size to minimize write actions
        let shouldCopy = true;
        if (fs.existsSync(destPath)) {
          const srcStat = fs.statSync(srcPath);
          const destStat = fs.statSync(destPath);
          if (srcStat.size === destStat.size) {
            shouldCopy = false;
          }
        }
        if (shouldCopy) {
          fs.copyFileSync(srcPath, destPath);
          syncStats.files++;
        }
      }
    }
  }

  try {
    console.log(`Syncing uploads from ${outerUploadsDir} to ${standaloneUploadsDir}...`);
    syncDir(outerUploadsDir, standaloneUploadsDir);
  } catch (syncErr: any) {
    return NextResponse.json(
      { error: "Sync failed", message: syncErr.message, unzipResult },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: unzipResult ? "Zip unzipped and uploads folder synced successfully" : "Uploads folder synced successfully",
    unzipResult,
    restoreStats,
    syncStats,
    bestSourceDir,
    outerPath: outerUploadsDir,
    standalonePath: standaloneUploadsDir
  });
}
