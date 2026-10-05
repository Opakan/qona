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

# 2. Prepare Shared workspace in staging
shared_staging = os.path.join(staging_dir, 'shared')
os.makedirs(shared_staging, exist_ok=True)

shared_pkg_path = os.path.join(root_dir, 'shared', 'package.json')
with open(shared_pkg_path, 'r', encoding='utf-8') as f:
    shared_pkg = json.load(f)
shared_pkg['devDependencies'] = {}

with open(os.path.join(shared_staging, 'package.json'), 'w', encoding='utf-8') as f:
    json.dump(shared_pkg, f, indent=2)

shutil.copytree(os.path.join(root_dir, 'shared', 'dist'), os.path.join(shared_staging, 'dist'))

# 3. Prepare Standalone root package.json
backend_pkg_path = os.path.join(root_dir, 'backend', 'package.json')
with open(backend_pkg_path, 'r', encoding='utf-8') as f:
    pkg = json.load(f)

# Use standard file:./shared dependency so npm install links it properly
pkg['name'] = 'qonace-backend'
pkg['dependencies']['@qona/shared'] = 'file:./shared'
# Remove heavy prisma CLI from runtime dependencies to avoid 15-min download
if 'prisma' in pkg['dependencies']:
    del pkg['dependencies']['prisma']

# Crucial: Strip devDependencies so npm install on EC2 doesn't download 1GB of vitest/tsc/eslint
pkg['devDependencies'] = {}

pkg['scripts'] = {
    'start': 'node start.js'
}
pkg['engines'] = {
    'node': '>=18.0.0'
}

with open(os.path.join(staging_dir, 'package.json'), 'w', encoding='utf-8') as f:
    json.dump(pkg, f, indent=2)

# 3b. Create .npmrc for ultra-fast, silent, dev-omitted install on EC2
with open(os.path.join(staging_dir, '.npmrc'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('audit=false\nfund=false\nupdate-notifier=false\nomit=dev\nengine-strict=false\n')

# 3c. Create robust start.js launcher
start_js_content = """import fs from 'node:fs';
import path from 'node:path';

// Crash prevention: log unhandled errors instead of silent failure
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled rejection at:', promise, 'reason:', reason);
});

// Restore native Linux Prisma engines and client unconditionally
try {
  const root = process.cwd();
  const bundleDir = path.join(root, '.prisma_bundle');
  const targetDir = path.join(root, 'node_modules', '.prisma');

  if (fs.existsSync(bundleDir)) {
    fs.mkdirSync(path.join(targetDir, 'client'), { recursive: true });
    fs.cpSync(bundleDir, targetDir, { recursive: true, force: true });
    console.log('[Prisma Failsafe] Restored native Linux engines into node_modules/.prisma');
  }
} catch (err) {
  console.warn('[Prisma Failsafe Warning]:', err);
}

// Start backend server
await import('./dist/index.js');
"""

with open(os.path.join(staging_dir, 'start.js'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(start_js_content)

# 4. Create Procfile (clean single command for systemd)
with open(os.path.join(staging_dir, 'Procfile'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('web: node start.js\n')

# 4b. Create .ebextensions to guarantee swap space and default environment on EC2
ebextensions_dir = os.path.join(staging_dir, '.ebextensions')
os.makedirs(ebextensions_dir, exist_ok=True)

# 01_swap.config: Allocates 2GB of swap so t2/t3.micro instances never suffer from Out-Of-Memory freezing
swap_config = """commands:
  01setup_swap:
    test: test ! -e /swapfile
    command: |
      /bin/dd if=/dev/zero of=/swapfile bs=1M count=2048
      /bin/chmod 600 /swapfile
      /sbin/mkswap /swapfile
      /sbin/swapon /swapfile
"""
with open(os.path.join(ebextensions_dir, '01_swap.config'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(swap_config)

# 02_node.config: Fallback environment configuration
node_config = """option_settings:
  aws:elasticbeanstalk:application:environment:
    PORT: 5000
    NODE_ENV: production
"""
with open(os.path.join(ebextensions_dir, '02_node.config'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(node_config)

# 5. Copy backend dist & prisma
shutil.copytree(os.path.join(root_dir, 'backend', 'dist'), os.path.join(staging_dir, 'dist'))
shutil.copytree(os.path.join(root_dir, 'backend', 'prisma'), os.path.join(staging_dir, 'prisma'))

# 5b. Bundle pre-generated Prisma client with Linux native engines into .prisma_bundle
local_prisma = os.path.join(root_dir, 'node_modules', '.prisma')
if not os.path.exists(local_prisma):
    local_prisma = os.path.join(root_dir, 'backend', 'node_modules', '.prisma')

if os.path.exists(local_prisma):
    bundle_dest = os.path.join(staging_dir, '.prisma_bundle')
    os.makedirs(bundle_dest, exist_ok=True)
    def ignore_windows_junk(dir, files):
        return [f for f in files if f.endswith('.tmp') or '.tmp' in f or f.endswith('.dll.node')]
    shutil.copytree(local_prisma, bundle_dest, dirs_exist_ok=True, ignore=ignore_windows_junk)
    print("   [OK] Bundled Linux-ready Prisma engines into .prisma_bundle")

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
            posix_path = rel_path.replace('\\', '/')
            zipf.write(full_path, posix_path)

shutil.rmtree(staging_dir)
print("[OK] Clean Linux-compatible qonace-backend.zip created successfully!")
