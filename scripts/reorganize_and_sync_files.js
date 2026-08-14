const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
        console.log(`Copied/Overwritten: ${curSource} -> ${curTarget}`);
      }
    });
  }
}

async function main() {
  try {
    const tempDir = path.join(__dirname, '../public/temp_extract');
    const uploadsDir = path.join(__dirname, '../public/uploads');
    const newFilesDir = path.join(__dirname, '../public/New files');

    console.log("Starting file reorganization...");

    // 1. Copy unzipped folders from temp_extract
    const tempFolders = [
      { src: 'Chakwal-20260729T083305Z-1-001/Chakwal', dest: 'Chakwal' },
      { src: 'Documents-20260729T083703Z-1-001/Documents', dest: 'Documents' },
      { src: 'Islamabad-20260729T083304Z-1-001 (1)/Islamabad', dest: 'Islamabad' },
      { src: 'Lectures Links-20260729T071820Z-1-001/Lectures Links', dest: 'Lectures Links' },
      // Overwrite training using the 072904Z version (the latest timestamp)
      { src: 'Training (Accounts Department)-20260729T072904Z-1-001/Training (Accounts Department)', dest: 'Training (Accounts Department)' }
    ];

    tempFolders.forEach(folder => {
      const fullSrc = path.join(tempDir, folder.src);
      const fullDest = path.join(uploadsDir, folder.dest);
      if (fs.existsSync(fullSrc)) {
        console.log(`Merging temp_extract/${folder.src} -> uploads/${folder.dest}...`);
        copyFolderRecursiveSync(fullSrc, fullDest);
      } else {
        console.log(`Source folder not found: ${fullSrc}`);
      }
    });

    // 2. Copy Advertisement Data from public/New files/Advertisement Data
    const adSrc = path.join(newFilesDir, 'Advertisement Data');
    const adDest = path.join(uploadsDir, 'Advertisement Data');
    if (fs.existsSync(adSrc)) {
      console.log(`Merging public/New files/Advertisement Data -> uploads/Advertisement Data...`);
      copyFolderRecursiveSync(adSrc, adDest);
    } else {
      console.log(`Source folder not found: ${adSrc}`);
    }

    console.log("File copy completed successfully.");

    // 3. Run sync-run.js to sync files with database
    console.log("Running database sync...");
    execSync('node scripts/sync-run.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log("Database sync completed successfully.");

    // 4. Clean up temp_extract folder
    console.log("Cleaning up temporary extraction folder...");
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("Cleanup completed.");

  } catch (error) {
    console.error("Error during file reorganization:", error);
    process.exit(1);
  }
}

main();
