const fs = require('fs');
const path = require('path');

function copyDir(src, dest, skipDirs = []) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) {
        continue;
      }
      copyDir(srcPath, destPath, skipDirs);
    } else if (entry.isSymbolicLink()) {
      // Resolve symlink — if it points to a directory, recurse; if a file, copy
      try {
        const resolved = fs.realpathSync(srcPath);
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          copyDir(resolved, destPath, skipDirs);
        } else {
          fs.copyFileSync(resolved, destPath);
        }
      } catch {
        // Skip broken symlinks silently
      }
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch {
        // Skip unreadable files silently
      }
    }
  }
}

try {
  console.log('Copying static assets and env to standalone folder...');
  
  // Copy public folder
  copyDir(
    path.join(__dirname, '../public'),
    path.join(__dirname, '../.next/standalone/public')
  );
  
  // Copy .next/static folder
  copyDir(
    path.join(__dirname, '../.next/static'),
    path.join(__dirname, '../.next/standalone/.next/static')
  );
  
  // Copy .env to standalone root so server.js picks it up
  const envSrc = path.join(__dirname, '../.env');
  const envDest = path.join(__dirname, '../.next/standalone/.env');
  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, envDest);
    console.log('.env copied to standalone folder');
  }

  // Copy prisma.config.js to standalone root
  const configSrc = path.join(__dirname, '../prisma.config.js');
  const configDest = path.join(__dirname, '../.next/standalone/prisma.config.js');
  if (fs.existsSync(configSrc)) {
    fs.copyFileSync(configSrc, configDest);
    console.log('prisma.config.js copied to standalone folder');
  }

  // Copy scripts folder to standalone directory
  copyDir(
    path.join(__dirname, '../scripts'),
    path.join(__dirname, '../.next/standalone/scripts')
  );
  console.log('scripts copied to standalone folder');

  // Copy prisma folder to standalone directory
  copyDir(
    path.join(__dirname, '../prisma'),
    path.join(__dirname, '../.next/standalone/prisma')
  );
  console.log('prisma folder copied to standalone folder');

  // Copy the entire node_modules directory, skipping large devDependencies to save space
  console.log('Copying node_modules (excluding large dev dependencies)...');
  const skip = [
    'next', 'react', 'react-dom', 'typescript', 'eslint', 
    'tailwindcss', '@tailwindcss', '@types', 'postcss', 
    '.bin', '.cache'
  ];
  copyDir(
    path.join(__dirname, '../node_modules'),
    path.join(__dirname, '../.next/standalone/node_modules'),
    skip
  );
  console.log('All required runtime dependencies copied successfully');
  
  // Kill ghost production Node processes to release the port for the new build
  // Only runs on Linux (production server) — pgrep is not available on Windows
  if (process.platform === 'linux') {
    try {
      const { execSync } = require('child_process');
      console.log('🔍 Looking for active/ghost production Node processes to kill...');
      const stdout = execSync('pgrep -f "start.js|server.js" || true').toString();
      const pids = stdout.split('\n').map(p => p.trim()).filter(Boolean);
      
      if (pids.length > 0) {
        console.log(`💀 Found production processes: ${pids.join(', ')}. Killing them to free up the port...`);
        for (const pid of pids) {
          try {
            process.kill(parseInt(pid), 'SIGKILL');
            console.log(`✅ Killed process ${pid}`);
          } catch (err) {
            console.error(`❌ Failed to kill process ${pid}:`, err.message);
          }
        }
      } else {
        console.log('No production Node processes found running.');
      }
    } catch (killErr) {
      console.error('⚠️ Failed to run process killer:', killErr.message);
    }
  }

  // Sync to other deployments if versioned
  try {
    const rootDir = path.join(__dirname, '..');
    let current = rootDir;
    let portalDir = rootDir;
    for (let i = 0; i < 10; i++) {
      const buildsPath = path.join(current, '.builds');
      if (fs.existsSync(buildsPath) && fs.statSync(buildsPath).isDirectory()) {
        portalDir = current;
        break;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    const versionsDir = path.join(portalDir, '.builds', 'versions');
    
    if (fs.existsSync(versionsDir)) {
      console.log('🔄 Sibling versions directory found, syncing build output...');
      const currentVersion = path.basename(path.dirname(rootDir));
      const versions = fs.readdirSync(versionsDir);
      
      for (const ver of versions) {
        if (ver === currentVersion) continue;
        
        const targetNodeJs = path.join(versionsDir, ver, 'nodejs');
        if (fs.existsSync(targetNodeJs)) {
          console.log(`  Syncing standalone build to past version: ${ver}...`);
          
          // Copy standalone
          copyDir(
            path.join(rootDir, '.next/standalone'),
            path.join(targetNodeJs, '.next/standalone')
          );
          
          // Copy public
          copyDir(
            path.join(rootDir, 'public'),
            path.join(targetNodeJs, 'public')
          );
          
          // Copy .next/static
          copyDir(
            path.join(rootDir, '.next/static'),
            path.join(targetNodeJs, '.next/static')
          );
        }
      }
    }
  } catch (syncErr) {
    console.error('⚠️ Failed to sync to sibling version folders:', syncErr.message);
  }

  // Trigger Phusion Passenger reload via tmp/restart.txt in all possible application root directories
  const restartDirs = [
    path.join(__dirname, '../../tmp'),
    path.join(__dirname, '../../../tmp'),
    path.join(__dirname, '../../../../tmp'),
    path.join(__dirname, '../../../../../tmp'),
    path.join(__dirname, '../../../../../../tmp'),
    '/home/u504701759/domains/solarkidunya.com/portal/hbuilds/current/nodejs/tmp',
    '/home/u504701759/domains/solarkidunya.com/portal/hbuilds/current/tmp',
    '/home/u504701759/domains/solarkidunya.com/portal/tmp',
    '/home/u504701759/domains/solarkidunya.com/public_html/portal/tmp',
    '/home/u504701759/domains/solarkidunya.com/hbuilds/current/nodejs/tmp',
    '/home/u504701759/domains/solarkidunya.com/hbuilds/current/tmp',
    '/home/u504701759/domains/solarkidunya.com/tmp',
    '/home/u504701759/domains/solarkidunya.com/public_html/tmp',
  ];
  for (const tmpDir of restartDirs) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));
      console.log(`🔄 Phusion Passenger reload triggered via: ${tmpDir}/restart.txt`);
    } catch (tmpErr) {
      // Ignore if directory cannot be written
    }
  }

  // Push any new database schema changes (new tables) to production MySQL
  if (process.platform === 'linux') {
    try {
      const { execSync } = require('child_process');
      console.log('🗄️ Running prisma db push to sync schema changes...');
      execSync('npx prisma db push --accept-data-loss', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 120000,
      });
      console.log('✅ Prisma db push completed.');
    } catch (dbErr) {
      console.error('⚠️ prisma db push failed (non-fatal):', dbErr.message);
    }
  }

  console.log('Post-build assets copy completed successfully!');
} catch (err) {
  console.error('Post-build copy failed:', err);
  process.exit(1);
}
