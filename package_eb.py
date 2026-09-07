import os
import shutil
import subprocess
import zipfile
import json

root_dir = os.path.dirname(os.path.abspath(__file__))
staging_dir = os.path.join(root_dir, '.eb_staging')

print("1. Building TypeScript workspaces locally...")
subprocess.run("npm run build:shared", shell=True, cwd=root_dir, check=True)
subprocess.run("npm run build:api", shell=True, cwd=root_dir, check=True)

if os.path.exists(staging_dir):
    shutil.rmtree(staging_dir)
os.makedirs(staging_dir, exist_ok=True)

# 2. Prepare Standalone package.json
backend_pkg_path = os.path.join(root_dir, 'backend', 'package.json')
with open(backend_pkg_path, 'r', encoding='utf-8') as f:
    pkg = json.load(f)

if '@qona/shared' in pkg.get('dependencies', {}):
    del pkg['dependencies']['@qona/shared']

pkg['name'] = 'qonace-backend'
pkg['scripts'] = {
    'start': 'node dist/index.js',
    'postinstall': 'npx prisma generate'
}
pkg['engines'] = {
    'node': '>=20.0.0'
}

with open(os.path.join(staging_dir, 'package.json'), 'w', encoding='utf-8') as f:
    json.dump(pkg, f, indent=2)

# 3. Create Procfile
with open(os.path.join(staging_dir, 'Procfile'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('web: node dist/index.js\n')

# 4. Copy backend dist & prisma
shutil.copytree(os.path.join(root_dir, 'backend', 'dist'), os.path.join(staging_dir, 'dist'))
shutil.copytree(os.path.join(root_dir, 'backend', 'prisma'), os.path.join(staging_dir, 'prisma'))

# 5. Pre-package @qona/shared into node_modules/@qona/shared
shared_dest = os.path.join(staging_dir, 'node_modules', '@qona', 'shared')
os.makedirs(shared_dest, exist_ok=True)
shutil.copy2(os.path.join(root_dir, 'shared', 'package.json'), os.path.join(shared_dest, 'package.json'))
shutil.copytree(os.path.join(root_dir, 'shared', 'dist'), os.path.join(shared_dest, 'dist'))

# 6. Create Linux-compliant Zip with POSIX forward slashes
zip_path = os.path.join(root_dir, 'qonace-backend.zip')
if os.path.exists(zip_path):
    os.remove(zip_path)

print("2. Packaging into Linux-compliant zip archive...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(staging_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, staging_dir)
            # FORCE forward slash for Linux Amazon Linux 2023 compatibility
            posix_path = rel_path.replace('\\', '/')
            zipf.write(full_path, posix_path)

shutil.rmtree(staging_dir)
print("[OK] Clean Linux-compatible qonace-backend.zip created successfully!")
