import os
import zipfile
import sys

def zip_dir_with_unix_permissions(src_dir, zip_filepath):
    print(f"Creating zip archive: {zip_filepath}")
    print(f"Source directory: {src_dir}")
    
    with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(src_dir):
            # Write directories with 755 permissions
            for dir_name in dirs:
                dir_path = os.path.join(root, dir_name)
                arcname = os.path.relpath(dir_path, src_dir).replace('\\', '/') + '/'
                zinfo = zipfile.ZipInfo(arcname)
                # 0o755 -> drwxr-xr-x
                # Unix file permissions are stored in the high 16 bits of external_attr
                zinfo.external_attr = 0o755 << 16
                zipf.writestr(zinfo, '')
                
            # Write files with appropriate permissions
            for file_name in files:
                file_path = os.path.join(root, file_name)
                arcname = os.path.relpath(file_path, src_dir).replace('\\', '/')
                zinfo = zipfile.ZipInfo(arcname)
                
                # Default permissions: 0o644 -> -rw-r--r--
                permissions = 0o644
                
                # Give execute permissions (0o755 -> -rwxr-xr-x) to Prisma engines and .bin scripts
                if '@prisma/engines' in arcname or '.bin/' in arcname or arcname.endswith('.sh'):
                    permissions = 0o755
                    
                zinfo.external_attr = permissions << 16
                
                with open(file_path, 'rb') as f:
                    zipf.writestr(zinfo, f.read())

    print("Archive created successfully with correct UNIX permissions!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python zip-for-deploy.py <src_dir> <zip_filepath>")
        sys.exit(1)
    zip_dir_with_unix_permissions(sys.argv[1], sys.argv[2])
