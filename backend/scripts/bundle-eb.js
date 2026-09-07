import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const stagingDir = path.join(rootDir, '.eb_staging');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// 1. Copy Root Files
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(stagingDir, 'package.json'));
fs.copyFileSync(path.join(rootDir, 'package-lock.json'), path.join(stagingDir, 'package-lock.json'));
fs.copyFileSync(path.join(rootDir, 'tsconfig.base.json'), path.join(stagingDir, 'tsconfig.base.json'));
fs.copyFileSync(path.join(rootDir, 'Procfile'), path.join(stagingDir, 'Procfile'));

// 2. Copy Shared Workspace
const sharedStaging = path.join(stagingDir, 'shared');
fs.mkdirSync(sharedStaging, { recursive: true });
fs.copyFileSync(path.join(rootDir, 'shared', 'package.json'), path.join(sharedStaging, 'package.json'));
fs.copyFileSync(path.join(rootDir, 'shared', 'tsconfig.json'), path.join(sharedStaging, 'tsconfig.json'));
fs.cpSync(path.join(rootDir, 'shared', 'dist'), path.join(sharedStaging, 'dist'), { recursive: true });

// 3. Copy Backend Workspace
const backendStaging = path.join(stagingDir, 'backend');
fs.mkdirSync(backendStaging, { recursive: true });
fs.copyFileSync(path.join(rootDir, 'backend', 'package.json'), path.join(backendStaging, 'package.json'));
fs.copyFileSync(path.join(rootDir, 'backend', 'tsconfig.json'), path.join(backendStaging, 'tsconfig.json'));
fs.cpSync(path.join(rootDir, 'backend', 'dist'), path.join(backendStaging, 'dist'), { recursive: true });
fs.cpSync(path.join(rootDir, 'backend', 'prisma'), path.join(backendStaging, 'prisma'), { recursive: true });

// 4. Create Zip Archive
const zipPath = path.join(rootDir, 'qonace-backend.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

execSync('powershell -Command "Compress-Archive -Path .eb_staging/* -DestinationPath qonace-backend.zip -Force"', {
  stdio: 'inherit',
});

fs.rmSync(stagingDir, { recursive: true, force: true });
console.log('✅ Successfully created clean qonace-backend.zip!');
