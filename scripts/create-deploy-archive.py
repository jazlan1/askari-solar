"""
Creates a clean, lightweight deployment archive for Hostinger Node.js hosting.
Includes only source files — Hostinger will run npm install + npm run build on the server.
Archive is kept well under the 50MB limit.

Key behaviour:
  - Generates a PRODUCTION package.json inside the zip (strips SQLite deps that
    cannot compile on Hostinger's GLIBC 2.17 CentOS 8 environment).
  - Keeps the real package.json on disk untouched (local dev still works).
"""
import os
import zipfile
import sys
import json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Directories to completely skip
SKIP_DIRS = {
    'node_modules',
    '.next',
    '.git',
    '_data',
    '__pycache__',
    '.windsurf',
    '.claude',
    '.agents',
    '_deploy_min',
    '_deploy_staging',
    'deploy-standalone',
    'deploy-source',
}

# Files/directories at root level to skip
SKIP_NAMES_AT_ROOT = {
    'archive.tar.gz',
    'archive.zip',
    'askari-portal-deploy.zip',
    'askari-portal-source-updated.zip',
    'askari-portal-source-with-uploads-20260801.tgz',
    'askari-portal-source-with-uploads-20260801.zip',
    'askari-portal-source.tar.gz',
    'askari-portal-source.tgz',
    'askari-portal-source.zip',
    'askari-portal-upload-endpoint-20260801.tgz',
    'askari-portal-uploads.zip',
    'askari-fresh-deploy.zip',
    'askari-complaints-deploy.zip',
    'askari-portal-deploy-clean.zip',
    'askari-portal-standalone.zip',
    'deploy-no-uploads.tar.gz',
    'deploy-source.zip',
    'deploy-source.tar.gz',
    'skills-lock.json',
    'package-lock.json',  # let Hostinger resolve fresh from package.json
    'CLAUDE.md',
    'AGENTS.md',
    'README.md',
    'tsconfig.tsbuildinfo',
    'package.json',       # we inject the production version below
    '.env',               # we inject the production version below
}

# Specific paths (relative to ROOT, using forward slashes) to skip
SKIP_PATHS = {
    'public/uploads',        # user uploads — very large, deploy manually
    'public/New files',      # media files — very large, deploy manually
    'scripts/__pycache__',
    'prisma/dev.db',         # local SQLite — server uses MariaDB
    'prisma/dev.db-journal',
}

# SQLite-related packages that CANNOT install on Hostinger (GLIBC 2.17, no make).
# These are stripped from the production package.json written into the zip.
SQLITE_PACKAGES = {
    'better-sqlite3',
    '@prisma/adapter-better-sqlite3',
}

OUTPUT_ZIP = os.path.join(ROOT, 'deploy-source.zip')


def build_production_env() -> bytes:
    """Generate production-safe environment configuration."""
    env_content = (
        '# Production MySQL Database (Hostinger)\n'
        'DATABASE_URL="mysql://u504701759_askari_user:AskariPortal2026Pass@127.0.0.1:3306/u504701759_askari_portal"\n\n'
        '# JWT Secret for session tokens\n'
        'JWT_SECRET="askari-portal-super-secret-jwt-key-2026"\n\n'
        '# Environment\n'
        'NODE_ENV="production"\n'
        'PORT="3000"\n'
    )
    return env_content.encode('utf-8')


def build_production_package_json() -> bytes:
    """Read the local package.json and return a production-safe version as bytes."""
    pkg_path = os.path.join(ROOT, 'package.json')
    with open(pkg_path, 'r', encoding='utf-8') as f:
        pkg = json.load(f)

    # Remove SQLite packages from every dependency section
    for section in ('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'):
        if section in pkg:
            for name in SQLITE_PACKAGES:
                pkg[section].pop(name, None)
            # Remove the section entirely if it becomes empty
            if not pkg[section]:
                del pkg[section]

    return json.dumps(pkg, indent=2, ensure_ascii=False).encode('utf-8')


def should_skip(rel_path: str, name: str, is_dir: bool) -> bool:
    rel_fwd = rel_path.replace('\\', '/')

    # Skip specific paths
    for sp in SKIP_PATHS:
        if rel_fwd == sp or rel_fwd.startswith(sp + '/'):
            return True

    # Skip top-level files/dirs by name
    parts = rel_fwd.split('/')
    if len(parts) == 1 and name in SKIP_NAMES_AT_ROOT:
        return True

    # Skip any archive files at root level by extension
    if len(parts) == 1 and not is_dir:
        lower = name.lower()
        if lower.endswith('.zip') or lower.endswith('.tgz') or lower.endswith('.tar.gz') or lower.endswith('.gz'):
            return True

    # Skip dir names anywhere in the tree
    if is_dir and name in SKIP_DIRS:
        return True

    return False


def add_file(zf: zipfile.ZipFile, arcname: str, data: bytes, executable: bool = False):
    permissions = 0o755 if executable else 0o644
    zinfo = zipfile.ZipInfo(arcname)
    zinfo.external_attr = permissions << 16
    zinfo.compress_type = zipfile.ZIP_DEFLATED
    zf.writestr(zinfo, data)


def create_archive():
    print(f"Creating deployment archive: {OUTPUT_ZIP}")
    print(f"Source root: {ROOT}\n")

    total_files = 0
    total_bytes = 0

    if os.path.exists(OUTPUT_ZIP):
        os.remove(OUTPUT_ZIP)

    # Build the production package.json and .env before opening the zip
    prod_pkg_json = build_production_package_json()
    prod_env = build_production_env()

    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:

        # Inject production package.json (SQLite packages stripped)
        add_file(zf, 'package.json', prod_pkg_json)
        total_files += 1
        total_bytes += len(prod_pkg_json)
        print("  [PROD] package.json  (SQLite packages stripped for Hostinger)")

        # Inject production .env config
        add_file(zf, '.env', prod_env)
        total_files += 1
        total_bytes += len(prod_env)
        print("  [PROD] .env          (MySQL database connection config for Hostinger)")

        for dirpath, dirnames, filenames in os.walk(ROOT):
            rel_dir = os.path.relpath(dirpath, ROOT)
            if rel_dir == '.':
                rel_dir = ''

            # Filter out directories we should skip
            dirnames[:] = [
                d for d in dirnames
                if not should_skip(
                    (rel_dir + '/' + d).lstrip('/'),
                    d,
                    True
                )
            ]

            for filename in filenames:
                rel_file = (rel_dir + '/' + filename).lstrip('/')

                if should_skip(rel_file, filename, False):
                    continue

                full_path = os.path.join(dirpath, filename)
                arcname = rel_file.replace('\\', '/')

                is_exec = (
                    '@prisma/engines' in arcname
                    or '.bin/' in arcname
                    or arcname.endswith('.sh')
                    or 'node_modules/.bin' in arcname
                    or arcname == 'scripts/start.js'
                    or arcname == 'scripts/post-build.js'
                )

                try:
                    with open(full_path, 'rb') as f:
                        data = f.read()

                    # Swap SQLite provider to MySQL for Hostinger MariaDB compatibility
                    if arcname == 'prisma/schema.prisma':
                        schema_str = data.decode('utf-8')
                        schema_str = schema_str.replace('provider = "sqlite"', 'provider = "mysql"')
                        data = schema_str.encode('utf-8')
                        print("  [PROD] schema.prisma (provider swapped to mysql)")

                    add_file(zf, arcname, data, executable=is_exec)
                    total_files += 1
                    total_bytes += len(data)
                except Exception as e:
                    print(f"  WARNING: Could not add {arcname}: {e}")

    size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
    print(f"\n[OK] Archive created successfully!")
    print(f"   Files included: {total_files}")
    print(f"   Uncompressed:   {total_bytes / (1024*1024):.1f} MB")
    print(f"   Archive size:   {size_mb:.2f} MB")
    print(f"   Output:         {OUTPUT_ZIP}")

    if size_mb > 50:
        print(f"\n[WARNING] Archive is {size_mb:.1f}MB — exceeds Hostinger's 50MB limit!")
        sys.exit(1)
    else:
        print(f"\n[OK] Under 50MB limit ({size_mb:.2f}MB < 50MB)")


if __name__ == '__main__':
    create_archive()
