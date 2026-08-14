import os
import zipfile
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# We want to package:
# 1. Everything in .next/standalone (which includes server.js, .next, node_modules, etc.)
#    But we exclude:
#    - public/uploads/
#    - _data/
#    - _deploy_min/
#    - _deploy_staging/
#    - Any large binaries, logs, and zip files
#    - Prisma Windows engines (*windows.exe)
#    - next-swc compile binaries (*win32-x64*.node, etc.)
# 2. We make sure to include the startup scripts:
#    - scripts/start.js
#    - scripts/seed-db.js
#    - prisma/schema.prisma
#    - prisma.config.js
#    - .env

OUTPUT_ZIP = os.path.join(ROOT, 'askari-portal-deploy-clean.zip')

# Substrings to exclude (case-insensitive) anywhere in paths
EXCLUDE_SUBSTRINGS = [
    '__pycache__',
    '.git',
    '.windsurf',
    '.claude',
    '.agents',
    'node_modules/.bin',
    'node_modules/.cache',
    'node_modules/@next/swc-win32-x64-msvc',
    'node_modules/@next/swc-linux-x64-gnu', # if any
    'node_modules/@img/sharp-win32-x64',     # sharp for Windows dlls
]

# File names to exclude
EXCLUDE_FILENAMES = {
    'schema-engine-windows.exe',
    'query-engine-windows.exe',
    'libvips-42.dll',
}

# Directories relative to standalone root to exclude
EXCLUDE_REL_DIRS = {
    'public/uploads',
    '_data',
    '_deploy_min',
    '_deploy_staging',
    'node_modules',
}

def should_skip(rel_path: str) -> bool:
    # Convert windows path to unix style for matching
    rel_fwd = rel_path.replace('\\', '/')
    rel_fwd_lower = rel_fwd.lower()
    
    # Check exclude directories
    for ex_dir in EXCLUDE_REL_DIRS:
        if rel_fwd == ex_dir or rel_fwd.startswith(ex_dir + '/'):
            return True
            
    # Check exclude substrings
    for sub in EXCLUDE_SUBSTRINGS:
        if sub in rel_fwd:
            return True
            
    # Check filename
    filename = os.path.basename(rel_path)
    if filename in EXCLUDE_FILENAMES:
        return True
        
    # Check for archive files in the root or standalone root
    if filename.endswith('.zip') or filename.endswith('.tar.gz') or filename.endswith('.tgz'):
        # Allow query compiler WASM file
        if not filename.endswith('.wasm'):
            return True
            
    return False

def create_standalone_zip():
    print(f"Creating clean standalone deployment zip: {OUTPUT_ZIP}")
    
    standalone_root = os.path.join(ROOT, '.next', 'standalone')
    if not os.path.exists(standalone_root):
        print(f"ERROR: Standalone build not found at {standalone_root}!")
        print("Please run 'npm run build' first.")
        sys.exit(1)
        
    total_files = 0
    total_bytes = 0
    
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        # Walk through the .next/standalone folder
        for dirpath, dirnames, filenames in os.walk(standalone_root):
            for filename in filenames:
                full_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(full_path, standalone_root)
                
                if should_skip(rel_path):
                    continue
                    
                # We always use forward slashes in zip archives
                arcname = rel_path.replace('\\', '/')
                
                # Set permissions (0o755 for executables/scripts, 0o644 for regular files)
                permissions = 0o644
                if (
                    arcname.endswith('.sh') 
                    or 'scripts/' in arcname 
                    or 'node_modules/.bin' in arcname
                ):
                    permissions = 0o755
                    
                zinfo = zipfile.ZipInfo(arcname)
                zinfo.external_attr = permissions << 16
                zinfo.compress_type = zipfile.ZIP_DEFLATED
                
                try:
                    with open(full_path, 'rb') as f:
                        data = f.read()
                    zf.writestr(zinfo, data)
                    total_files += 1
                    total_bytes += len(data)
                except Exception as e:
                    print(f"  WARNING: Could not add {arcname}: {e}")
                    
        # Make sure start.js, seed-db.js, prisma files, and env are at the root or correctly copied if missing
        # In .next/standalone, they should already be present because post-build.js copies them.
        # But we double check and add them if they aren't there.
        required_root_files = [
            ('.env', '.env'),
            ('package.json', 'package.json'),
            ('package-lock.json', 'package-lock.json'),
            ('prisma.config.js', 'prisma.config.js'),
            ('prisma/schema.prisma', 'prisma/schema.prisma'),
            ('scripts/start.js', 'scripts/start.js'),
            ('scripts/seed-db.js', 'scripts/seed-db.js'),
        ]
        
        for local_rel, zip_rel in required_root_files:
            local_full = os.path.join(ROOT, local_rel)
            if os.path.exists(local_full):
                # Check if it was already added
                # (zipfile doesn't check duplicates easily, but we can write it if not there)
                # To be simple, we just write it if the local file exists and it's not already in the zip
                # Let's check if the path is already in the archive list of names
                if zip_rel not in zf.namelist():
                    print(f"Adding extra required file: {zip_rel}")
                    zinfo = zipfile.ZipInfo(zip_rel)
                    zinfo.external_attr = (0o755 if zip_rel.endswith('.js') or zip_rel.endswith('.sh') else 0o644) << 16
                    zinfo.compress_type = zipfile.ZIP_DEFLATED
                    with open(local_full, 'rb') as f:
                        zf.writestr(zinfo, f.read())
                        total_files += 1
                        
    size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
    print("\n[OK] Clean Standalone Deployment Zip Created successfully!")
    print(f"   Files included: {total_files}")
    print(f"   Uncompressed:   {total_bytes / (1024*1024):.1f} MB")
    print(f"   Archive size:   {size_mb:.2f} MB")
    print(f"   Output:         {OUTPUT_ZIP}")
    
    if size_mb > 50:
        print(f"\n[WARNING] Archive is {size_mb:.1f}MB, which exceeds Hostinger's 50MB limit!")
        print("   But it is much smaller than the previous 650MB+ build.")
    else:
        print(f"\n[OK] Archive is within Hostinger's 50MB limit ({size_mb:.2f}MB < 50MB)")

if __name__ == '__main__':
    create_standalone_zip()
